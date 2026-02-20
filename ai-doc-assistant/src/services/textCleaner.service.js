export const cleanText = (text) => {
  if (!text) return "";

  return text
    .replace(/\r\n/g, "\n") // Normalize line breaks
    .replace(/\n{2,}/g, "\n") // Remove excessive blank lines
    .replace(/[ \t]+/g, " ") // Remove extra spaces
    .replace(/\n\s+/g, "\n") // Trim spaces at line starts
    .trim();
};
