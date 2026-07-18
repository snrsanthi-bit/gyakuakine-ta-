import { z } from "zod";

export const ANSWERS = ["はい", "いいえ", "どちらとも言えない"] as const;
export const AnswerSchema = z.enum(ANSWERS);
export type Answer = z.infer<typeof AnswerSchema>;

export const QuestionInputSchema = z.object({
  question: z.string().trim().min(1, "質問を入力してください。").max(500, "質問は500文字以内にしてください。"),
});

export const GuessInputSchema = z.object({
  guess: z.string().trim().min(1, "名前を入力してください。").max(120, "名前は120文字以内にしてください。"),
});

export function parseAiAnswer(value: unknown): Answer {
  const parsed = AnswerSchema.safeParse(value);
  return parsed.success ? parsed.data : "どちらとも言えない";
}
