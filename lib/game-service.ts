import { GameStatus, TurnKind, type Game, type Turn } from "@prisma/client";
import { candidates, getCandidate } from "@/lib/candidates";
import { getGameAiProvider } from "@/lib/ai/provider";
import { db } from "@/lib/db";
import { ensurePerson, getCachedAnswerOrCreate } from "@/lib/question-cache";
import { isCorrectGuessWithAlias } from "@/lib/alias-service";
import type { Answer } from "@/lib/validation";

type GameWithTurns = Game & { turns: Turn[] };

export type PublicGame = {
  status: "ACTIVE" | "CLEARED";
  questionCount: number;
  subjectName?: string;
  turns: Array<{ id: string; kind: "QUESTION" | "GUESS"; prompt: string; answer: Answer | null; correct: boolean | null }>;
};

export class GameStateError extends Error {}

function serializeGame(game: NonNullable<GameWithTurns>): PublicGame {
  const subject = getCandidate(game.subjectId);
  return {
    status: game.status === GameStatus.CLEARED ? "CLEARED" : "ACTIVE",
    questionCount: game.questionCount,
    ...(game.status === GameStatus.CLEARED && subject ? { subjectName: subject.name } : {}),
    turns: game.turns.map((turn) => ({
      id: turn.id,
      kind: turn.kind,
      prompt: turn.prompt,
      answer: turn.answer as Answer | null,
      correct: turn.correct,
    })),
  };
}

export async function getGame(gameId: string): Promise<PublicGame | null> {
  const game = await db.game.findUnique({ where: { id: gameId }, include: { turns: { orderBy: { createdAt: "asc" } } } });
  return game ? serializeGame(game) : null;
}

export async function startGame(): Promise<{ id: string; game: PublicGame }> {
  const subjectId = await getGameAiProvider().chooseSubject(candidates.map((candidate) => candidate.id));
  const subject = getCandidate(subjectId);
  if (!subject) throw new GameStateError("ゲームデータが不正です。新しいゲームを始めてください。");
  await ensurePerson(subject);
  const game = await db.game.create({ data: { subjectId }, include: { turns: true } });
  return { id: game.id, game: serializeGame(game) };
}

export async function askQuestion(gameId: string, question: string): Promise<PublicGame> {
  const game = await db.game.findUnique({ where: { id: gameId }, include: { turns: { orderBy: { createdAt: "asc" } } } });
  if (!game || game.status !== GameStatus.ACTIVE) throw new GameStateError("進行中のゲームがありません。");
  if (game.questionCount >= 100) throw new GameStateError("質問は100回までです。新しいゲームを始めてください。");

  const subject = getCandidate(game.subjectId);
  if (!subject) throw new GameStateError("ゲームデータが不正です。新しいゲームを始めてください。");

  const { answer } = await getCachedAnswerOrCreate({
    person: subject,
    question,
    resolve: () => getGameAiProvider().answerQuestion({
      subjectName: subject.name,
      question,
      history: game.turns
        .filter((turn) => turn.kind === TurnKind.QUESTION)
        .map((turn) => ({ prompt: turn.prompt, answer: turn.answer })),
    }),
  });

  const updated = await db.$transaction(async (tx) => {
    await tx.turn.create({ data: { gameId, kind: TurnKind.QUESTION, prompt: question, answer } });
    return tx.game.update({
      where: { id: gameId },
      data: { questionCount: { increment: 1 } },
      include: { turns: { orderBy: { createdAt: "asc" } } },
    });
  });
  return serializeGame(updated);
}

export async function submitGuess(gameId: string, guess: string): Promise<PublicGame> {
  const game = await db.game.findUnique({ where: { id: gameId }, include: { turns: { orderBy: { createdAt: "asc" } } } });
  if (!game || game.status !== GameStatus.ACTIVE) throw new GameStateError("進行中のゲームがありません。");
  const subject = getCandidate(game.subjectId);
  if (!subject) throw new GameStateError("ゲームデータが不正です。新しいゲームを始めてください。");
  const correct = await isCorrectGuessWithAlias({
    person: subject,
    guess,
    judge: () => getGameAiProvider().judgeAlias({ subjectName: subject.name, inputName: guess }),
  });
  const updated = await db.$transaction(async (tx) => {
    await tx.turn.create({ data: { gameId, kind: TurnKind.GUESS, prompt: guess, correct } });
    return tx.game.update({
      where: { id: gameId },
      data: correct ? { status: GameStatus.CLEARED } : {},
      include: { turns: { orderBy: { createdAt: "asc" } } },
    });
  });
  return serializeGame(updated);
}
