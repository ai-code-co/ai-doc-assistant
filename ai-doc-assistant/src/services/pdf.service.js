import fs from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

export const extractTextFromPDF = async (filePath) => {
  const dataBuffer = fs.readFileSync(filePath);

  const pages = [];

  const options = {
    pagerender: async (pageData) => {
      const textContent = await pageData.getTextContent();

      const pageText = textContent.items.map((item) => item.str).join(" ");

      pages.push({
        pageNumber: pageData.pageIndex + 1,
        text: pageText,
      });

      return pageText;
    },
  };

  await pdf(dataBuffer, options);

  return pages;
};
