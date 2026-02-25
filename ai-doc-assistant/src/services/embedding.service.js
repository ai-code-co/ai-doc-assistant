import OpenAI from "openai";
import logger from "../utils/logger.js";

export const generateEmbedding = async (text) => {
  const startTime = Date.now();

  try {
    logger.debug({ textLength: text.length }, "Generating embedding");

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });

    logger.debug(
      { durationMs: Date.now() - startTime },
      "Embedding generated successfully",
    );

    return response.data[0].embedding;
  } catch (error) {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
      },
      "Embedding generation failed",
    );

    throw error;
  }
};
