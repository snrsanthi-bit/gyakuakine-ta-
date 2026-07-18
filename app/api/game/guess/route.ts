import { NextResponse } from "next/server";
import { GameStateError, submitGuess } from "@/lib/game-service";
import { getCurrentGameId } from "@/lib/session";
import { GuessInputSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = GuessInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  const gameId = await getCurrentGameId();
  if (!gameId) return NextResponse.json({ error: "進行中のゲームがありません。" }, { status: 404 });
  try {
    return NextResponse.json({ game: await submitGuess(gameId, parsed.data.guess) });
  } catch (error) {
    const status = error instanceof GameStateError ? 409 : 500;
    const message = error instanceof Error ? error.message : "回答を判定できませんでした。";
    return NextResponse.json({ error: message }, { status });
  }
}
