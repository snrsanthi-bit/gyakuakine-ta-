import { beforeEach, describe, expect, it, vi } from "vitest";

const db = {
  person: { upsert: vi.fn() },
  alias: { upsert: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
};

vi.mock("@/lib/db", () => ({ db }));

const person = { id: "steve-jobs", name: "スティーブ・ジョブズ", aliases: ["Steve Jobs"] };

describe("alias guesses", () => {
  beforeEach(() => vi.clearAllMocks());

  it("accepts a database alias without asking the AI", async () => {
    db.alias.findUnique.mockResolvedValue({ personId: "steve-jobs" });
    const judge = vi.fn();
    const { isCorrectGuessWithAlias } = await import("@/lib/alias-service");

    await expect(isCorrectGuessWithAlias({ person, guess: "ジョブズ", judge })).resolves.toBe(true);
    expect(judge).not.toHaveBeenCalled();
  });

  it("stores an AI-approved alias for future database-only checks", async () => {
    db.alias.findUnique.mockResolvedValue(null);
    const judge = vi.fn().mockResolvedValue("yes");
    const { isCorrectGuessWithAlias } = await import("@/lib/alias-service");

    await expect(isCorrectGuessWithAlias({ person, guess: "ジョブズ", judge })).resolves.toBe(true);
    expect(db.alias.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ personId: "steve-jobs", normalizedValue: "ジョブズ" }) }));
  });

  it("rejects an ambiguous alias without saving it", async () => {
    db.alias.findUnique.mockResolvedValue(null);
    const judge = vi.fn().mockResolvedValue("unknown");
    const { isCorrectGuessWithAlias } = await import("@/lib/alias-service");

    await expect(isCorrectGuessWithAlias({ person, guess: "山田", judge })).resolves.toBe(false);
    expect(db.alias.create).not.toHaveBeenCalled();
  });
});
