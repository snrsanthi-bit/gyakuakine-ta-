import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const tx = {
    person: { upsert: vi.fn() },
    alias: { upsert: vi.fn() },
    question: { upsert: vi.fn() },
  };
  return {
    db: {
      person: { findMany: vi.fn(), findUnique: vi.fn() },
      game: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
      $transaction: vi.fn(),
    },
    provider: { bootstrapGameData: vi.fn(), answerQuestion: vi.fn(), judgeAlias: vi.fn() },
    tx,
  };
});

vi.mock("@/lib/db", () => ({ db: mocks.db }));
vi.mock("@/lib/ai/provider", () => ({ getGameAiProvider: () => mocks.provider }));

const existingPerson = {
  id: "steve-jobs",
  name: "スティーブ・ジョブズ",
  genre: "ビジネス",
  aliases: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const game = {
  id: "game-1",
  subjectId: "steve-jobs",
  status: "ACTIVE",
  questionCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  turns: [],
};

describe("game start", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.db.game.create.mockResolvedValue(game);
    mocks.db.$transaction.mockImplementation((callback) => callback(mocks.tx));
  });

  it("starts from existing database people without calling Gemini", async () => {
    mocks.db.person.findMany.mockResolvedValue([existingPerson]);
    const { startGame } = await import("@/lib/game-service");

    await expect(startGame()).resolves.toMatchObject({ id: "game-1", game: { questionCount: 0 } });
    expect(mocks.provider.bootstrapGameData).not.toHaveBeenCalled();
    expect(mocks.db.game.create).toHaveBeenCalledWith(expect.objectContaining({ data: { subjectId: "steve-jobs" } }));
  });

  it("bootstraps people and questions once when the database is empty", async () => {
    mocks.db.person.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([existingPerson]);
    mocks.provider.bootstrapGameData.mockResolvedValue({
      people: [{ id: "steve-jobs", name: "スティーブ・ジョブズ", genre: "ビジネス", aliases: ["ジョブズ"] }],
      questions: ["アメリカ出身ですか？"],
    });
    const { startGame } = await import("@/lib/game-service");

    await startGame();
    expect(mocks.provider.bootstrapGameData).toHaveBeenCalledOnce();
    expect(mocks.tx.person.upsert).toHaveBeenCalledOnce();
    expect(mocks.tx.question.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { text: "アメリカ出身ですか？" } }));
  });
});
