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

  await db.$transaction(async (tx) => {
    for (const person of people) {
      const normalizedName = normalizeName(person.name);
      if (!isValidPerson(person) || !normalizedName || seenIds.has(person.id) || seenNames.has(normalizedName)) {
        summary.skippedPeople += 1;
        continue;
      }
      seenIds.add(person.id);
      seenNames.add(normalizedName);

      const existingPerson = await tx.person.findFirst({
        where: { OR: [{ id: person.id }, { name: person.name }] },
        select: { id: true },
      });
      if (existingPerson) {
        summary.duplicatePeople += 1;
        continue;
      }

      await tx.person.create({ data: { id: person.id, name: person.name, genre: person.genre } });
      summary.savedPeople += 1;

      const aliases = Array.from(new Set([person.name, ...person.aliases].map((alias) => alias.trim()).filter(Boolean)));
      for (const value of aliases) {
        const normalizedValue = normalizeName(value);
        if (!normalizedValue) {
          summary.skippedPeople += 1;
          continue;
        }
        const existingAlias = await tx.alias.findUnique({ where: { normalizedValue }, select: { id: true } });
        if (existingAlias) {
          summary.duplicateAliases += 1;
          continue;
        }
        await tx.alias.create({ data: { personId: person.id, value, normalizedValue } });
        summary.savedAliases += 1;
      }
    }
  });

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
