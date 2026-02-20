import { Pinecone } from "@pinecone-database/pinecone";

let pc = null;

export const getPineconeIndex = () => {
  if (!pc) {
    if (!process.env.PINECONE_API_KEY) {
      throw new Error("PINECONE_API_KEY is missing in environment variables");
    }

    pc = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
  }

  return pc.index(process.env.PINECONE_INDEX_NAME);
};
