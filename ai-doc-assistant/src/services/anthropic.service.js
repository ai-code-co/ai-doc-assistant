import Anthropic from "@anthropic-ai/sdk";

let anthropicInstance;

export const getAnthropic = () => {
  if (!anthropicInstance) {
    anthropicInstance = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  return anthropicInstance;
};
