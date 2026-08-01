import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: {
    person: { findFirst: vi.fn(), create: vi.fn() },
    alias: { findMany: vi.fn(), createMany: vi.fn() },
    $transaction: vi.fn(),
  },
  provider: { generatePeopleCatalog: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ db: mocks.db }));
vi.mock("@/lib/ai/provider", () => ({ getGameAiProvider: () => mocks.provider }));

describe("people catalog persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.db.person.findFirst.mockResolvedValue(null);
    mocks.db.alias.findMany.mockResolvedValue([]);
    mocks.db.alias.createMany.mockResolvedValue({ count: 3 });
  });

  it("persists a new person and aliases without a long transaction", async () => {
    const { savePeopleCatalog } = await import("@/lib/people-catalog");

    const summary = await savePeopleCatalog([
      { id: "steve-jobs", name: "スティーブ・ジョブズ", genre: "IT", aliases: ["ジョブズ", "Steve Jobs"] },
    ]);

    expect(summary).toMatchObject({ savedPeople: 1, savedAliases: 3, duplicatePeople: 0 });
    expect(mocks.db.person.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ id: "steve-jobs" }) }));
    expect(mocks.db.alias.createMany).toHaveBeenCalledOnce();
    expect(mocks.db.$transaction).not.toHaveBeenCalled();
  });

  it("skips duplicate people but safely fills any aliases that are still missing", async () => {
    mocks.db.person.findFirst.mockResolvedValue({ id: "existing-jobs" });
    mocks.db.alias.findMany.mockResolvedValue([{ normalizedValue: "スティーブジョブズ" }]);
    mocks.db.alias.createMany.mockResolvedValue({ count: 1 });
    const { savePeopleCatalog } = await import("@/lib/people-catalog");

    const summary = await savePeopleCatalog([
      { id: "new-jobs", name: "スティーブ・ジョブズ", genre: "IT", aliases: ["ジョブズ"] },
    ]);

    expect(summary).toMatchObject({ savedPeople: 0, duplicatePeople: 1, savedAliases: 1, duplicateAliases: 1 });
    expect(mocks.db.person.create).not.toHaveBeenCalled();
    expect(mocks.db.alias.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: [expect.objectContaining({ personId: "existing-jobs", normalizedValue: "ジョブズ" })],
      skipDuplicates: true,
    }));
  });
});
