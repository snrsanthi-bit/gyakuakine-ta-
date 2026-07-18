"use client";
import { useEffect, useState } from "react";
import { GuessForm } from "@/components/guess-form";
import { QuestionForm } from "@/components/question-form";
import { TurnHistory } from "@/components/turn-history";
import type { PublicGame } from "@/lib/game-service";

type ApiResponse = { game?: PublicGame | null; error?: string };
async function callApi(path: string, body?: object): Promise<PublicGame | null> {
  const response = await fetch(path, { method: body ? "POST" : "GET", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const payload = (await response.json()) as ApiResponse;
  if (!response.ok) throw new Error(payload.error || "通信に失敗しました。");
  return payload.game ?? null;
}

export function GameBoard() {
  const [game, setGame] = useState<PublicGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { callApi("/api/game").then(setGame).catch((e: Error) => setError(e.message)).finally(() => setLoading(false)); }, []);
  async function act(path: string, body?: object) { setSending(true); setError(null); try { setGame(await callApi(path, body)); } catch (e) { setError(e instanceof Error ? e.message : "通信に失敗しました。"); } finally { setSending(false); } }
  if (loading) return <p className="text-center text-slate-500">ゲームを準備中…</p>;
  if (!game) return <section className="rounded-3xl bg-white p-8 text-center shadow-xl shadow-indigo-100"><p className="text-sm font-bold tracking-widest text-indigo-600">REVERSE AKINATOR</p><h1 className="mt-3 text-3xl font-black text-slate-900">AIのお題を当てよう</h1><p className="mx-auto mt-4 max-w-md text-slate-600">AIは「はい」「いいえ」「どちらとも言えない」だけで答えます。</p>{error && <p role="alert" className="mt-4 text-sm font-bold text-rose-600">{error}</p>}<button data-testid="start-game" onClick={() => act("/api/game/start", {})} disabled={sending} className="mt-7 rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white hover:bg-indigo-700 disabled:bg-slate-300">ゲームを始める</button></section>;
  const cleared = game.status === "CLEARED";
  return <section className="rounded-3xl bg-white p-5 shadow-xl shadow-indigo-100 sm:p-8"><header className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5"><div><p className="text-sm font-bold tracking-widest text-indigo-600">REVERSE AKINATOR</p><h1 className="mt-1 text-2xl font-black text-slate-900">AIのお題を当てよう</h1></div><div className="rounded-xl bg-indigo-50 px-4 py-2 text-center"><p className="text-xs font-bold text-indigo-500">質問回数</p><p className="text-xl font-black text-indigo-700">{game.questionCount}</p></div></header>{cleared ? <div className="my-6 rounded-2xl bg-emerald-50 p-6 text-center"><p className="text-xl font-black text-emerald-800">正解！</p><p className="mt-2 text-emerald-700">お題は「{game.subjectName}」でした。</p></div> : <div className="my-6 space-y-5"><QuestionForm disabled={sending} onSubmit={(question) => act("/api/game/question", { question })} /><GuessForm disabled={sending} onSubmit={(guess) => act("/api/game/guess", { guess })} /></div>}{error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>}<div className="border-t border-slate-100 pt-5"><h2 className="text-sm font-bold text-slate-700">履歴</h2><div className="mt-3"><TurnHistory turns={game.turns} /></div></div><button data-testid="restart-game" onClick={() => act("/api/game/restart", {})} disabled={sending} className="mt-6 w-full rounded-xl border border-slate-300 px-5 py-3 font-bold text-slate-700 hover:bg-slate-50 disabled:text-slate-400">新しいゲーム</button></section>;
}
