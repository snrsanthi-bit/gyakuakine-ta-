import { NextResponse } from "next/server";
import { getGame } from "@/lib/game-service";
import { getCurrentGameId } from "@/lib/session";

export async function GET() {
  const gameId = await getCurrentGameId();
  if (!gameId) return NextResponse.json({ game: null });
  return NextResponse.json({ game: await getGame(gameId) });
}
