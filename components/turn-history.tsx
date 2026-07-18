import type { PublicGame } from "@/lib/game-service";

export function TurnHistory({ turns }: { turns: PublicGame["turns"] }) {
  if (!turns.length) return <p className="py-8 text-center text-sm text-slate-500">質問してヒントを集めよう。</p>;
  return <ol className="space-y-3" aria-label="質問履歴">{turns.map((turn, index) => <li key={turn.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">{turn.kind === "QUESTION" ? <><p className="text-xs font-bold text-indigo-600">Q{index + 1}</p><p className="mt-1 font-medium text-slate-800">{turn.prompt}</p><p className="mt-2 inline-flex rounded-full bg-indigo-50 px-3 py-1 text-sm font-bold text-indigo-700">{turn.answer}</p></> : <><p className="text-xs font-bold text-amber-600">回答</p><p className="mt-1 font-medium text-slate-800">{turn.prompt}</p><p className={`mt-2 text-sm font-bold ${turn.correct ? "text-emerald-700" : "text-rose-600"}`}>{turn.correct ? "正解！" : "不正解です。ゲームは続きます。"}</p></>}</li>)}</ol>;
}
