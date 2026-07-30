import { type Alias, GameStatus, type Person, TurnKind, type Game, type Turn } from "@prisma/client";
import { getCandidate, normalizeName, type Candidate } from "@/lib/candidates";
import { getGameAiProvider } from "@/lib/ai/provider";
import { db } from "@/lib/db";
import { getCachedAnswerOrCreate } from "@/lib/question-cache";
import { isCorrectGuessWithAlias } from "@/lib/alias-service";
import type { Answer } from "@/lib/validation";

type GameWithTurns = Game & { turns: Turn[] };
type PersonWithAliases = Person & { aliases: Alias[] };

export type PublicGame = {
  status: "ACTIVE" | "CLEARED";
  questionCount: number;
  subjectName?: string;
  turns: Array<{ id: string; kind: "QUESTION" | "GUESS"; prompt: string; answer: Answer | null; correct: boolean | null }>;
};

export class GameStateError extends Error {}

function toGamePerson(person: PersonWithAliases): Candidate {
  const legacyCandidate = getCandidate(person.id);
  return {
    id: person.id,
    name: person.name,
    genre: person.genre,
    aliases: Array.from(new Set([...person.aliases.map((alias) => alias.value), ...(legacyCandidate?.aliases ?? [])])),
  };
}

function serializeGame(game: GameWithTurns, subject?: Person): PublicGame {
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

async function loadOrBootstrapPeople(): Promise<PersonWithAliases[]> {
  const people = await db.person.findMany({ include: { aliases: true }, orderBy: { createdAt: "asc" } });
  if (people.length > 0) {
    console.info("[reverse-akinator] game start uses person catalog from DB", { count: people.length });
    return people;
  }

  console.info("[reverse-akinator] person catalog is empty; bootstrapping from Gemini");
  const bootstrap = await getGameAiProvider().bootstrapGameData();
  const uniqueQuestions = Array.from(new Set(bootstrap.questions.map((question) => question.trim()).filter(Boolean)));

  await db.$transaction(async (tx) => {
    for (const person of bootstrap.people) {
      await tx.person.upsert({
        where: { id: person.id },
        create: { id: person.id, name: person.name, genre: person.genre },
        update: { name: person.name, genre: person.genre },
      });
      for (const alias of Array.from(new Set([person.name, ...person.aliases]))) {
        const normalizedValue = normalizeName(alias);
        if (!normalizedValue) continue;
        await tx.alias.upsert({
          where: { normalizedValue },
          create: { personId: person.id, value: alias, normalizedValue },
          update: {},
        });
      }
    }
    for (const text of uniqueQuestions) {
      await tx.question.upsert({ where: { text }, create: { text }, update: {} });
    }
  });

  const savedPeople = await db.person.findMany({ include: { aliases: true }, orderBy: { createdAt: "asc" } });
  if (savedPeople.length === 0) throw new GameStateError("人物データを保存できませんでした。");
  return savedPeople;
}

export async function getGame(gameId: string): Promise<PublicGame | null> {
  const game = await db.game.findUnique({ where: { id: gameId }, include: { turns: { orderBy: { createdAt: "asc" } } } });
  if (!game) return null;
  const subject = await db.person.findUnique({ where: { id: game.subjectId } });
  return serializeGame(game, subject ?? undefined);
}

export async function startGame(): Promise<{ id: string; game: PublicGame }> {
  const people = await loadOrBootstrapPeople();
  const subject = people[Math.floor(Math.random() * people.length)];
  const game = await db.game.create({ data: { subjectId: subject.id }, include: { turns: true } });
  return { id: game.id, game: serializeGame(game, subject) };
}

export async function askQuestion(gameId: string, question: string): Promise<PublicGame> {
  const game = await db.game.findUnique({ where: { id: gameId }, include: { turns: { orderBy: { createdAt: "asc" } } } });
  if (!game || game.status !== GameStatus.ACTIVE) throw new GameStateError("進行中のゲームがありません。");
  if (game.questionCount >= 100) throw new GameStateError("質問は100回までです。新しいゲームを始めてください。");

  const subjectRecord = await db.person.findUnique({ where: { id: game.subjectId }, include: { aliases: true } });
  if (!subjectRecord) throw new GameStateError("ゲームデータが不正です。新しいゲームを始めてください。");
  const subject = toGamePerson(subjectRecord);

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
  return serializeGame(updated, subjectRecord);
}

export async function submitGuess(gameId: string, guess: string): Promise<PublicGame> {
  const game = await db.game.findUnique({ where: { id: gameId }, include: { turns: { orderBy: { createdAt: "asc" } } } });
  if (!game || game.status !== GameStatus.ACTIVE) throw new GameStateError("進行中のゲームがありません。");
  const subjectRecord = await db.person.findUnique({ where: { id: game.subjectId }, include: { aliases: true } });
  if (!subjectRecord) throw new GameStateError("ゲームデータが不正です。新しいゲームを始めてください。");
  const subject = toGamePerson(subjectRecord);

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
  return serializeGame(updated, subjectRecord);
}
