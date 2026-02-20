import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export const chunkText = async (text) => {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 800,
    chunkOverlap: 100,
  });

  const chunks = await splitter.createDocuments([text]);

  return chunks;
};
