import { getGameAiProvider } from "@/lib/ai/provider";
import type { BootstrapPerson } from "@/lib/ai/types";
import { normalizeName } from "@/lib/candidates";
import { db } from "@/lib/db";

export type PeopleCatalogSummary = {
  savedPeople: number;
  duplicatePeople: number;
  savedAliases: number;
  duplicateAliases: number;
  skippedPeople: number;
};

function isValidPerson(person: BootstrapPerson): boolean {
  return /^[a-z0-9-]+$/.test(person.id) && Boolean(person.name.trim()) && Boolean(person.genre.trim());
}

function isUniqueConstraintError(error: unknown): boolean {
  return (error as { code?: unknown })?.code === "P2002";
}

async function saveAliases(personId: string, aliases: string[], summary: PeopleCatalogSummary): Promise<void> {
  const values = Array.from(new Set(aliases.map((alias) => alias.trim()).filter(Boolean)));
  const aliasRows = values.flatMap((value) => {
    const normalizedValue = normalizeName(value);
    return normalizedValue ? [{ personId, value, normalizedValue }] : [];
  });
  if (aliasRows.length === 0) return;

  const existing = await db.alias.findMany({
    where: { normalizedValue: { in: aliasRows.map((alias) => alias.normalizedValue) } },
    select: { normalizedValue: true },
  });
  const existingValues = new Set(existing.map((alias) => alias.normalizedValue));
  const toCreate = aliasRows.filter((alias) => !existingValues.has(alias.normalizedValue));
  summary.duplicateAliases += aliasRows.length - toCreate.length;
  if (toCreate.length === 0) return;

  const result = await db.alias.createMany({ data: toCreate, skipDuplicates: true });
  summary.savedAliases += result.count;
  summary.duplicateAliases += toCreate.length - result.count;
}

export async function savePeopleCatalog(people: BootstrapPerson[]): Promise<PeopleCatalogSummary> {
  const summary: PeopleCatalogSummary = {
    savedPeople: 0,
    duplicatePeople: 0,
    savedAliases: 0,
    duplicateAliases: 0,
    skippedPeople: 0,
  };
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();

  for (const person of people) {
    const normalizedName = normalizeName(person.name);
    if (!isValidPerson(person) || !normalizedName || seenIds.has(person.id) || seenNames.has(normalizedName)) {
      summary.skippedPeople += 1;
      continue;
    }
    seenIds.add(person.id);
    seenNames.add(normalizedName);

    let personId = person.id;
    const existingPerson = await db.person.findFirst({
      where: { OR: [{ id: person.id }, { name: person.name }] },
      select: { id: true },
    });
    if (existingPerson) {
      personId = existingPerson.id;
      summary.duplicatePeople += 1;
    } else {
      try {
        await db.person.create({ data: { id: person.id, name: person.name, genre: person.genre } });
        summary.savedPeople += 1;
      } catch (error) {
        if (!isUniqueConstraintError(error)) throw error;
        const concurrentPerson = await db.person.findFirst({
          where: { OR: [{ id: person.id }, { name: person.name }] },
          select: { id: true },
        });
        if (!concurrentPerson) throw error;
        personId = concurrentPerson.id;
        summary.duplicatePeople += 1;
      }
    }

    await saveAliases(personId, [person.name, ...person.aliases], summary);
  }

  return summary;
}

function isRetryable(error: unknown): boolean {
  const status = (error as { status?: unknown; response?: { status?: unknown } })?.status
    ?? (error as { response?: { status?: unknown } })?.response?.status;
  return status === 429 || status === 503;
}

export async function generateAndSavePeopleCatalog(count = 60): Promise<PeopleCatalogSummary> {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const people = await getGameAiProvider().generatePeopleCatalog(count);
      return await savePeopleCatalog(people);
    } catch (error) {
      if (!isRetryable(error) || attempt === maxAttempts) throw error;
      const delayMs = 500 * 2 ** (attempt - 1);
      console.warn("[reverse-akinator] people catalog generation retry", { attempt, delayMs });
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error("人物カタログを生成できませんでした。");
}
