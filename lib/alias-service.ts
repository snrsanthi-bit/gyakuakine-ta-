import type { Candidate } from "@/lib/candidates";
import { normalizeName } from "@/lib/candidates";
import { db } from "@/lib/db";
import { ensurePerson } from "@/lib/question-cache";

export type AliasJudgement = "yes" | "no" | "unknown";

async function seedKnownAliases(person: Candidate): Promise<void> {
  await ensurePerson(person);
  for (const value of [person.name, ...person.aliases]) {
    await db.alias.upsert({
      where: { normalizedValue: normalizeName(value) },
      create: { personId: person.id, value, normalizedValue: normalizeName(value) },
      update: {},
    });
  }
}

export async function isCorrectGuessWithAlias(args: {
  person: Candidate;
  guess: string;
  judge: () => Promise<AliasJudgement>;
}): Promise<boolean> {
  const normalizedValue = normalizeName(args.guess);
  if (!normalizedValue) return false;

  await seedKnownAliases(args.person);
  const existing = await db.alias.findUnique({ where: { normalizedValue } });
  if (existing) {
    console.info("[reverse-akinator] alias cache hit", { normalizedValue });
    return existing.personId === args.person.id;
  }

  console.info("[reverse-akinator] alias cache miss", { normalizedValue });
  if (await args.judge() !== "yes") return false;

  await db.alias.create({
    data: { personId: args.person.id, value: args.guess, normalizedValue },
  });
  return true;
}
