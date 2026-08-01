import { db } from "@/lib/db";
import { generateAndSavePeopleCatalog } from "@/lib/people-catalog";

async function main() {
  try {
    const summary = await generateAndSavePeopleCatalog();
    console.info("[reverse-akinator] people catalog generation complete", summary);
  } catch (error) {
    console.error("[reverse-akinator] people catalog generation failed", error);
    process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}

void main();
