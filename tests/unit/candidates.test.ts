import { describe, expect, it } from "vitest";
import { getCandidate, isCorrectGuess } from "@/lib/candidates";
import { parseAiAnswer } from "@/lib/validation";

describe("candidate guesses", () => {
  it("accepts configured aliases and normalized names", () => {
    const candidate = getCandidate("albert-einstein");
    expect(candidate).toBeDefined();
    expect(isCorrectGuess(candidate!, " アインシュタイン ")).toBe(true);
    expect(isCorrectGuess(candidate!, "Albert Einstein")).toBe(true);
    expect(isCorrectGuess(candidate!, "マリー・キュリー")).toBe(false);
  });
  it("falls back to a neutral answer for invalid model output", () => {
    expect(parseAiAnswer("はい")).toBe("はい");
    expect(parseAiAnswer("秘密です")).toBe("どちらとも言えない");
  });
});
