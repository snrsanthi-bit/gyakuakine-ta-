import type { Answer } from "@/lib/validation";

export type QuestionContext = {
  subjectName: string;
  question: string;
  history: Array<{ prompt: string; answer: string | null }>;
};

export type AliasContext = {
  subjectName: string;
  inputName: string;
};

export type AliasJudgement = "yes" | "no" | "unknown";

export type BootstrapPerson = {
  id: string;
  name: string;
  genre: string;
  aliases: string[];
};

export type GameBootstrap = {
  people: BootstrapPerson[];
  questions: string[];
};

/** Vendor-neutral contract. Add another adapter without changing game logic. */
export interface GameAiProvider {
  bootstrapGameData(): Promise<GameBootstrap>;
  answerQuestion(context: QuestionContext): Promise<Answer>;
  judgeAlias(context: AliasContext): Promise<AliasJudgement>;
}

export class GameAiError extends Error {}
