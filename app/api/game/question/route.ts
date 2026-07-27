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
    if (error instanceof GameAiError) {
       return NextResponse.json(
       {
          error:
          "現在AIの利用上限に達しているため、ご利用いただけません。\n\n試作版のため、ご利用回数に制限があります。\nしばらく時間を空けてから再度お試しください。",
        },
        { status: 503 },
      );
    }

  const status = error instanceof GameStateError ? 409 : 500;
  const message =
    error instanceof Error ? error.message : "質問を送信できませんでした。";

  return NextResponse.json({ error: message }, { status });
}
}
