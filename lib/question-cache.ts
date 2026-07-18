import { CachedAnswer } from "@prisma/client";
import { type Candidate } from "@/lib/candidates";
import { db } from "@/lib/db";
import type { Answer } from "@/lib/validation";

const answerToCache: Record<Answer, CachedAnswer> = {
  "はい": CachedAnswer.yes,
  "いいえ": CachedAnswer.no,
  "どちらとも言えない": CachedAnswer.unknown,
};

const cacheToAnswer: Record<CachedAnswer, Answer> = {
  [CachedAnswer.yes]: "はい",
  [CachedAnswer.no]: "いいえ",
  [CachedAnswer.unknown]: "どちらとも言えない",
};

export function getCandidateGenre(candidate: Candidate): string {
  if (["albert-einstein", "marie-curie"].includes(candidate.id)) return "科学";
  if (["vincent-van-gogh", "pablo-picasso", "leonardo-da-vinci", "hayao-miyazaki"].includes(candidate.id)) return "芸術";
  if (["ichiro", "naomi-osaka"].includes(candidate.id)) return "スポーツ";
  if (["michael-jackson", "taylor-swift"].includes(candidate.id)) return "音楽";
  if (["steve-jobs", "bill-gates", "elon-musk"].includes(candidate.id)) return "ビジネス";
  return "歴史・社会";
}

export async function ensurePerson(candidate: Candidate): Promise<void> {
  await db.person.upsert({
    where: { id: candidate.id },
    create: { id: candidate.id, name: candidate.name, genre: getCandidateGenre(candidate) },
    update: { name: candidate.name, genre: getCandidateGenre(candidate) },
  });
}

export async function getCachedAnswerOrCreate(args: {
  person: Candidate;
  question: string;
  resolve: () => Promise<Answer>;
}): Promise<{ answer: Answer; cacheHit: boolean }> {
  await ensurePerson(args.person);
  const question = await db.question.upsert({
    where: { text: args.question },
    create: { text: args.question },
    update: {},
  });
  const cached = await db.answer.findUnique({
    where: { personId_questionId: { personId: args.person.id, questionId: question.id } },
  });
  if (cached) {
    console.info("[reverse-akinator] question cache hit", { personId: args.person.id, questionId: question.id });
    return { answer: cacheToAnswer[cached.answer], cacheHit: true };
  }

  console.info("[reverse-akinator] question cache miss", { personId: args.person.id, questionId: question.id });
  const answer = await args.resolve();
  await db.answer.upsert({
    where: { personId_questionId: { personId: args.person.id, questionId: question.id } },
    create: { personId: args.person.id, questionId: question.id, answer: answerToCache[answer] },
    update: { answer: answerToCache[answer] },
  });
  return { answer, cacheHit: false };
}
