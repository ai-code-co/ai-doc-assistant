import fs from "fs";
import path from "path";
import mammoth from "mammoth";
import Tesseract from "tesseract.js";
import { extractTextFromPDF } from "./pdf.service.js";

export const extractTextFromFile = async (filePath, mimetype) => {
  try {
    // ------------------------------------------------------------------------------
    // PDF
    // PDF
    if (mimetype === "application/pdf") {
      const pdfResult = await extractTextFromPDF(filePath);

      // If page-wise array returned
      if (Array.isArray(pdfResult)) {
        const combinedText = pdfResult.map((p) => p.text).join(" ");

        // If almost empty → scanned PDF → OCR
        if (!combinedText || combinedText.trim().length < 20) {
          console.log("PDF appears scanned. Running OCR...");
          const ocrText = await runOCR(filePath);
          return ocrText; // return string for OCR fallback
        }

        return pdfResult; // return page-wise structured data
      }

      // Fallback safety (if string returned)
      if (!pdfResult || pdfResult.trim().length < 20) {
        console.log("PDF appears scanned. Running OCR...");
        return await runOCR(filePath);
      }

      return pdfResult;
    }

    // ------------------------------------------------------------------------------
    // Images
    if (
      mimetype === "image/png" ||
      mimetype === "image/jpeg" ||
      mimetype === "image/jpg"
    ) {
      return await runOCR(filePath);
    }

    // ------------------------------------------------------------------------------
    // DOCX
    if (
      mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    }

    // ------------------------------------------------------------------------------
    // TXT
    if (mimetype === "text/plain") {
      return fs.readFileSync(filePath, "utf-8");
    }

    throw new Error("Unsupported file type");
  } catch (error) {
    console.error("File processing error:", error);
    throw error;
  }
};

// OCR helper function
// const runOCR = async (filePath) => {
//   const result = await Tesseract.recognize(filePath, "eng", {
//     logger: (m) => console.log(m),
//   });

//   return result.data.text;
// };

const runOCR = async (filePath) => {
  const result = await Tesseract.recognize(filePath, "eng", {
    tessedit_pageseg_mode: 1,
    logger: (m) => console.log(m),
  });

  let text = result.data.text;

  // 🔥 Clean OCR noise
  text = text
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[^\x20-\x7E]/g, "") // remove weird characters
    .trim();

  console.log("Cleaned OCR length:", text.length);

  return text;
};
