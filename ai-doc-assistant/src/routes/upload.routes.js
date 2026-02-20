import express from "express";
import multer from "multer";
import path from "path";
import { extractTextFromFile } from "../services/fileProcessor.service.js";
import { chunkText } from "../services/chunk.service.js";
import { generateEmbedding } from "../services/embedding.service.js";
import { getPineconeIndex } from "../services/pinecone.service.js";
import { getOpenAI } from "../services/openai.service.js";
import { cleanText } from "../services/textCleaner.service.js";

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
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    console.log("Multi-file upload started");

    const index = getPineconeIndex();

    let totalChunks = 0;
    let totalFiles = req.files.length;
    const allVectors = [];

    for (const file of req.files) {
      const filePath = file.path;

      console.log("Processing file:", file.originalname);

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
          pageNumber: null,
        }));
      }

      totalChunks += processedChunks.length;

      // Generate embeddings
      for (let i = 0; i < processedChunks.length; i++) {
        console.log(
          `Generating embedding for ${file.originalname} - chunk ${i}`,
        );

        const embedding = await generateEmbedding(
          processedChunks[i].pageContent,
        );

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

    console.log("Total chunks:", totalChunks);
    console.log("Total vectors:", allVectors.length);

    // Store all vectors at once
    await index.upsert({
      records: allVectors,
    });

    res.json({
      message: "Files uploaded, embedded, and stored successfully",
      totalFiles,
      totalChunks,
      totalEmbeddings: allVectors.length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Processing failed" });
  }
});

//-------------------------------------------------------------------------------------------

router.post("/search", async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || query.trim() === "") {
      return res.status(400).json({ error: "Query is required" });
    }

    const index = getPineconeIndex();

    // Generate embedding
    const embedding = await generateEmbedding(query);

    // Retrieve top 3 relevant chunks
    const results = await index.query({
      vector: embedding,
      topK: 3,
      includeMetadata: true,
    });

    // Handle no matches
    if (!results.matches || results.matches.length === 0) {
      return res.json({
        answer: {
          summary:
            "I couldn’t find this information in the uploaded documents.",
          keyPoints: [],
          evidence: [],
          sources: [],
        },
      });
    }

    // Build structured context with metadata
    const contextText = results.matches
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

    // Strong structured prompt
    const prompt = `
You are an AI document assistant.

You must answer ONLY using the provided context.
If the answer is not clearly found in the context, respond exactly with:
"I couldn’t find this information in the uploaded documents."

Return your response STRICTLY in this JSON format:

{
  "summary": "Short 2-3 sentence summary",
  "keyPoints": ["Point 1", "Point 2", "Point 3"],
  "evidence": ["Exact sentence from context"],
  "sources": ["fileName - chunkIndex"]
}

Context:
${contextText}

User Question:
${query}
`;

    const openai = getOpenAI();

    // Calling OpenAI
    const gptResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
    });

    const rawContent = gptResponse.choices[0].message.content;

    // Safe JSON parsing
    let structuredAnswer;

    try {
      structuredAnswer = JSON.parse(rawContent);
    } catch (err) {
      console.error("JSON parse failed. Returning fallback.");

      structuredAnswer = {
        summary: rawContent,
        keyPoints: [],
        evidence: [],
        sources: [],
      };
    }

    // Send clean response
    res.json({
      answer: structuredAnswer,
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: "Search failed" });
  }
});

export default router;
