import { GeminiGameAiProvider } from "@/lib/ai/gemini-provider";
import { GameAiError, type GameAiProvider } from "@/lib/ai/types";

export { GameAiError } from "@/lib/ai/types";

/**
 * Single composition point for AI vendors. Future adapters (for example,
 * OpenAI) implement GameAiProvider and are registered in this switch.
 */
export function getGameAiProvider(): GameAiProvider {
  const provider = process.env.AI_PROVIDER || "gemini";
  if (provider === "gemini") return new GeminiGameAiProvider();
  throw new GameAiError(`未対応のAIプロバイダーです: ${provider}`);
}
