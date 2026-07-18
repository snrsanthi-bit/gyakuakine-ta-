import { NextResponse } from "next/server";
import { askQuestion, GameStateError } from "@/lib/game-service";
import { GameAiError } from "@/lib/ai/provider";
import { getCurrentGameId } from "@/lib/session";
import { QuestionInputSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = QuestionInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  const gameId = await getCurrentGameId();
  if (!gameId) return NextResponse.json({ error: "進行中のゲームがありません。" }, { status: 404 });
  try {
    return NextResponse.json({ game: await askQuestion(gameId, parsed.data.question) });
  } catch (error) {
    const status = error instanceof GameAiError ? 503 : error instanceof GameStateError ? 409 : 500;
    const message = error instanceof Error ? error.message : "質問を送信できませんでした。";
    return NextResponse.json({ error: message }, { status });
  }
}
