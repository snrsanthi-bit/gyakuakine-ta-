import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const tx = {
    person: { findFirst: vi.fn(), create: vi.fn() },
    alias: { findUnique: vi.fn(), create: vi.fn() },
  };
  return {
    db: { $transaction: vi.fn() },
    provider: { generatePeopleCatalog: vi.fn() },
    tx,
  };
});

vi.mock("@/lib/db", () => ({ db: mocks.db }));
vi.mock("@/lib/ai/provider", () => ({ getGameAiProvider: () => mocks.provider }));

describe("people catalog persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.db.$transaction.mockImplementation((callback) => callback(mocks.tx));
    mocks.tx.person.findFirst.mockResolvedValue(null);
    mocks.tx.alias.findUnique.mockResolvedValue(null);
  });

  it("persists a new person and aliases", async () => {
    const { savePeopleCatalog } = await import("@/lib/people-catalog");

    const summary = await savePeopleCatalog([
      { id: "steve-jobs", name: "スティーブ・ジョブズ", genre: "IT", aliases: ["ジョブズ", "Steve Jobs"] },
    ]);

    expect(summary).toMatchObject({ savedPeople: 1, savedAliases: 3, duplicatePeople: 0 });
    expect(mocks.tx.person.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ id: "steve-jobs" }) }));
  });

  it("skips duplicate people and aliases without overwriting existing data", async () => {
    mocks.tx.person.findFirst.mockResolvedValue({ id: "existing-jobs" });
    const { savePeopleCatalog } = await import("@/lib/people-catalog");

    const summary = await savePeopleCatalog([
      { id: "new-jobs", name: "スティーブ・ジョブズ", genre: "IT", aliases: ["ジョブズ"] },
    ]);

    expect(summary).toMatchObject({ savedPeople: 0, duplicatePeople: 1, savedAliases: 0 });
    expect(mocks.tx.person.create).not.toHaveBeenCalled();
    expect(mocks.tx.alias.create).not.toHaveBeenCalled();
  });
});
