import { NextResponse } from "next/server";
import { GameAiError } from "@/lib/ai/provider";
import { startGame } from "@/lib/game-service";
import { setCurrentGameId } from "@/lib/session";

export async function POST() {
  try {
    const { id, game } = await startGame();
    await setCurrentGameId(id);
    return NextResponse.json({ game });
  } catch (error) {
    console.error("[reverse-akinator] POST /api/game/start failed", error);
    const message = error instanceof GameAiError ? error.message : "ゲームを開始できませんでした。";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
