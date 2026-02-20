import OpenAI from "openai";

let openai = null;

export const getOpenAI = () => {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is missing in environment variables");
    }

    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return openai;
};
