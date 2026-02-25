// import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

// export const chunkText = async (text) => {
//   const splitter = new RecursiveCharacterTextSplitter({
//     chunkSize: 800,
//     chunkOverlap: 100,
//   });

//   const chunks = await splitter.createDocuments([text]);

//   return chunks;
// };

import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export const chunkText = async (text) => {
  // First split by double newlines (paragraph blocks)
  const paragraphs = text.split(/\n\s*\n/);

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 700,
    chunkOverlap: 100,
  });

  let finalChunks = [];

  for (const paragraph of paragraphs) {
    if (paragraph.length < 700) {
      finalChunks.push({
        pageContent: paragraph.trim(),
      });
    } else {
      const docs = await splitter.createDocuments([paragraph]);
      finalChunks.push(...docs);
    }
  }

  return finalChunks;
};
