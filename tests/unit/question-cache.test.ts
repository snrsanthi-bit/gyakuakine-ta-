import { CachedAnswer } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = {
  person: { upsert: vi.fn() },
  question: { upsert: vi.fn() },
  answer: { findUnique: vi.fn(), upsert: vi.fn() },
};

vi.mock("@/lib/db", () => ({ db }));

const candidate = { id: "albert-einstein", name: "アルベルト・アインシュタイン", aliases: [] };

describe("question cache", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a cached answer without resolving through the AI", async () => {
    db.question.upsert.mockResolvedValue({ id: "question-1" });
    db.answer.findUnique.mockResolvedValue({ answer: CachedAnswer.yes });
    const resolve = vi.fn();
    const { getCachedAnswerOrCreate } = await import("@/lib/question-cache");

    await expect(getCachedAnswerOrCreate({ person: candidate, question: "科学者ですか？", resolve })).resolves.toEqual({ answer: "はい", cacheHit: true });
    expect(resolve).not.toHaveBeenCalled();
    expect(db.answer.upsert).not.toHaveBeenCalled();
  });

  it("resolves and stores an answer on a cache miss", async () => {
    db.question.upsert.mockResolvedValue({ id: "question-1" });
    db.answer.findUnique.mockResolvedValue(null);
    const resolve = vi.fn().mockResolvedValue("どちらとも言えない");
    const { getCachedAnswerOrCreate } = await import("@/lib/question-cache");

    await expect(getCachedAnswerOrCreate({ person: candidate, question: "科学者ですか？", resolve })).resolves.toEqual({ answer: "どちらとも言えない", cacheHit: false });
    expect(resolve).toHaveBeenCalledOnce();
    expect(db.answer.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ answer: CachedAnswer.unknown }) }));
  });
});
