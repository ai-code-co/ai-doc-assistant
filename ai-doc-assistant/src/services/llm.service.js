import { getOpenAI } from "./openai.service.js";
import { getAnthropic } from "./anthropic.service.js";

const MODEL_REGISTRY = {
  "gpt-4o": { provider: "openai" },
  "gpt-4.1": { provider: "openai" },
  "gpt-3.5-turbo": { provider: "openai" },
  "claude-3-haiku-20240307": { provider: "anthropic" },
};

export async function* generateLLMStream({ model, messages }) {
  const modelConfig = MODEL_REGISTRY[model];

  if (!modelConfig) {
    throw new Error("Unsupported model");
  }

  if (modelConfig.provider === "openai") {
    const openai = getOpenAI();

    const stream = await openai.chat.completions.create({
      model,
      messages,
      temperature: 0.3,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }

  if (modelConfig.provider === "anthropic") {
    const anthropic = getAnthropic();

    // Convert OpenAI-style messages to Claude format
    const claudeMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    const stream = await anthropic.messages.stream({
      model,
      max_tokens: 1000,
      messages: claudeMessages,
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta") {
        const text = event.delta?.text;
        if (text) {
          yield text;
        }
      }
    }
  }
}
