import express from "express";
import multer from "multer";
import path from "path";
import { extractTextFromFile } from "../services/fileProcessor.service.js";
import { chunkText } from "../services/chunk.service.js";
import { generateEmbedding } from "../services/embedding.service.js";
import { getPineconeIndex } from "../services/pinecone.service.js";
import { getOpenAI } from "../services/openai.service.js";
import { cleanText } from "../services/textCleaner.service.js";
import logger from "../utils/logger.js";
import { getSession, addMessage } from "../services/memory.service.js";

const router = express.Router();

// Storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    const allowedTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/jpg",
      "text/plain",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Unsupported file type"));
    }

    cb(null, true);
  },
});

//-------------------------------------------------------------------------------------------

router.post("/", upload.array("files", 10), async (req, res) => {
  const uploadId = Date.now();
  try {
    if (!req.files || req.files.length === 0) {
      logger.warn({ uploadId }, "No files uploaded");
      return res.status(400).json({ error: "No files uploaded" });
    }

    logger.info(
      { uploadId, totalFiles: req.files.length },
      "Multi-file upload started",
    );

    const index = getPineconeIndex();

    let totalChunks = 0;
    let totalFiles = req.files.length;
    const allVectors = [];

    for (const file of req.files) {
      const filePath = file.path;

      logger.info({ uploadId, fileName: file.originalname }, "Processing file");

      // Extract text (could return string OR page-wise array)
      const extracted = await extractTextFromFile(filePath, file.mimetype);

      let processedChunks = [];

      // If PDF returned page-wise array
      if (Array.isArray(extracted)) {
        for (const page of extracted) {
          const cleaned = cleanText(page.text);

          const pageChunks = await chunkText(cleaned);

          pageChunks.forEach((chunk, index) => {
            processedChunks.push({
              pageContent: chunk.pageContent,
              pageNumber: page.pageNumber,
            });
          });
        }
      } else {
        // Non-PDF (string text)
        const cleaned = cleanText(extracted);

        const chunks = await chunkText(cleaned);

        processedChunks = chunks.map((chunk) => ({
          pageContent: chunk.pageContent,
          pageNumber: 0, // Valid number (Pinecone accepts this)
        }));
      }

      totalChunks += processedChunks.length;

      logger.info(
        {
          uploadId,
          fileName: file.originalname,
          chunksCreated: processedChunks.length,
        },
        "Chunking completed",
      );

      // Generate embeddings
      for (let i = 0; i < processedChunks.length; i++) {
        console.log(
          `Generating embedding for ${file.originalname} - chunk ${i}`,
        );

        const text = processedChunks[i].pageContent;

        if (!text || text.trim().length < 20) {
          logger.warn(
            { uploadId, fileName: file.originalname, chunkIndex: i },
            "Skipping weak OCR chunk",
          );
          continue;
        }

        const embedding = await generateEmbedding(text);

        allVectors.push({
          id: `${file.filename}-${i}-${Date.now()}`,
          values: embedding,
          metadata: {
            text: processedChunks[i].pageContent,
            fileName: file.originalname,
            chunkIndex: i,
            pageNumber: processedChunks[i].pageNumber,
            uploadTimestamp: Date.now(),
          },
        });
      }
    }

    // Store all vectors at once
    await index.upsert({
      records: allVectors,
    });

    logger.info(
      {
        uploadId,
        totalFiles,
        totalChunks,
        totalEmbeddings: allVectors.length,
      },
      "Upload completed successfully",
    );

    res.json({
      message: "Files uploaded, embedded, and stored successfully",
      totalFiles,
      totalChunks,
      totalEmbeddings: allVectors.length,
    });
  } catch (error) {
    logger.error(
      { error: error.message, stack: error.stack },
      "Upload processing failed",
    );
    res.status(500).json({ error: "Processing failed" });
  }
});

//-------------------------------------------------------------------------------------------

// router.post("/search", async (req, res) => {
//   const requestId = Date.now();
//   try {
//     const { query, sessionId } = req.body;

//     if (!query || query.trim() === "") {
//       logger.warn({ requestId }, "Empty search query received");
//       return res.status(400).json({ error: "Query is required" });
//     }

//     logger.info({ requestId, query }, "Search started");

//     const index = getPineconeIndex();

//     // Generate embedding
//     const embedding = await generateEmbedding(query);

//     // Retrieve top 8 relevant chunks
//     const results = await index.query({
//       vector: embedding,
//       topK: 8,
//       includeMetadata: true,
//     });
//     console.log("first results", results.matches);
//     const matches = results.matches || [];

//     logger.info(
//       {
//         requestId,
//         matchCount: matches.length,
//         retrievedChunkIds: matches.map((m) => m.id),
//       },
//       "Vector search completed",
//     );

//     // Handle no matches
//     if (matches.length === 0) {
//       return res.json({
//         answer:
//           "I couldn’t find this information in the uploaded documents.",
//       });
//     }

//     // Build structured context with metadata
//     const contextText = results.matches
//       .map((match) => {
//         const fileName = match.metadata.fileName || "Unknown File";
//         const pageNumber =
//           match.metadata.pageNumber !== null &&
//           match.metadata.pageNumber !== undefined
//             ? `Page ${match.metadata.pageNumber}`
//             : "Page N/A";

//         const chunkIndex = match.metadata.chunkIndex ?? "N/A";

//         return `Source: ${fileName} - ${pageNumber} - Chunk ${chunkIndex}
// ${match.metadata.text}`;
//       })
//       .join("\n\n---\n\n");

//     // Get chat history
//     const chatHistory = getSession(sessionId);

//     // Strong structured prompt
//     const systemPrompt = `
// You are an AI document assistant with short-term memory.

// You have access to:
// 1) DOCUMENT CONTEXT from uploaded files
// 2) CONVERSATION HISTORY

// Rules:
// - If the question is about the documents, use DOCUMENT CONTEXT.
// - If the question is about previous conversation, use CONVERSATION HISTORY.
// - If relevant document context is provided, prioritize it.
// - If no relevant context is provided, politely say you could not find the answer in the uploaded documents.

// Respond naturally like ChatGPT.
// Use markdown formatting when helpful.
// Do NOT return JSON.
// `;

// const userPrompt = `
// DOCUMENT CONTEXT:
// ${contextText}

// USER QUESTION:
// ${query}
// `;

//     const openai = getOpenAI();

//     // Calling OpenAI
//     const gptResponse = await openai.chat.completions.create({
//       model: "gpt-4o",
//       messages: [
//         { role: "system", content: systemPrompt },
//         ...chatHistory, // previous conversation
//         { role: "user", content: userPrompt },
//       ],
//       temperature: 0,
//     });

//     console.log(gptResponse.choices[0].message);

//     const assistantReply = gptResponse.choices[0].message.content;

//     // Store conversation in memory
//     addMessage(sessionId, "user", query);
//     addMessage(sessionId, "assistant", assistantReply);

//     logger.info({ requestId }, "Search completed successfully");

//     // Return natural response
//     res.json({
//       answer: assistantReply,
//     });
//   } catch (error) {
//     logger.error(
//       { error: error.message, stack: error.stack },
//       "Search route failed",
//     );
//     res.status(500).json({ error: "Search failed" });
//   }
// });

router.post("/search", async (req, res) => {
  const requestId = Date.now();

  try {
    const { query, sessionId } = req.body;

    if (!query || query.trim() === "") {
      return res.status(400).json({ error: "Query is required" });
    }

    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required" });
    }

    const index = getPineconeIndex();

    // Generate embedding
    const embedding = await generateEmbedding(query);

    // Retrieve relevant chunks
    const results = await index.query({
      vector: embedding,
      topK: 8,
      includeMetadata: true,
    });

    const matches = results.matches || [];

    // Early return if no matches
    if (matches.length === 0) {
      return res.json({
        answer: "I couldn’t find this information in the uploaded documents.",
      });
    }

    // Build context
    const contextText = matches
      .map((match) => {
        const fileName = match.metadata.fileName || "Unknown File";
        const pageNumber =
          match.metadata.pageNumber !== null &&
          match.metadata.pageNumber !== undefined
            ? `Page ${match.metadata.pageNumber}`
            : "Page N/A";

        const chunkIndex = match.metadata.chunkIndex ?? "N/A";

        return `Source: ${fileName} - ${pageNumber} - Chunk ${chunkIndex}
${match.metadata.text}`;
      })
      .join("\n\n---\n\n");

    // Get chat history safely
    const chatHistory = getSession(sessionId) || [];

    // System prompt
    const systemPrompt = `
You are an AI document assistant with short-term memory.

You have access to:
1) DOCUMENT CONTEXT from uploaded files
2) CONVERSATION HISTORY

Rules:
- If question is about documents → use DOCUMENT CONTEXT.
- If question is about conversation → use CONVERSATION HISTORY.
- If answer not found in documents → say:
"I couldn’t find this information in the uploaded documents."

Respond naturally like ChatGPT.
Use markdown formatting when helpful.
Do NOT return JSON.
`;

    // User prompt (YOU WERE MISSING THIS)
    const userPrompt = `
DOCUMENT CONTEXT:
${contextText}

USER QUESTION:
${query}
`;

    const openai = getOpenAI();

    // streaming headers
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Call OpenAI
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        ...chatHistory,
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      stream: true, // streaming
    });

    let assistantReply = "";

    // STREAM TO FRONTEND
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;

      if (content) {
        assistantReply += content;
        res.write(content); // send chunk immediately
      }
    }

    res.end();

    // Store conversation after stream completes
    addMessage(sessionId, "user", query);
    addMessage(sessionId, "assistant", assistantReply);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Search failed" });
    }
  }
});

router.delete("/clear", async (req, res) => {
  try {
    const index = getPineconeIndex();

    await index.deleteAll();

    res.json({ message: "Index cleared successfully" });
  } catch (error) {
    console.error("Clear error:", error);
    res.status(500).json({ error: "Failed to clear index" });
  }
});

export default router;
