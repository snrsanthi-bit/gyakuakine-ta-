import type { PublicGame } from "@/lib/game-service";

const answerStyles = {
  "はい": {
    card: "border-emerald-200 bg-emerald-50/80",
    badge: "bg-emerald-100 text-emerald-800",
    label: "text-emerald-700",
  },
  "いいえ": {
    card: "border-rose-200 bg-rose-50/80",
    badge: "bg-rose-100 text-rose-800",
    label: "text-rose-700",
  },
  "どちらとも言えない": {
    card: "border-amber-200 bg-amber-50/80",
    badge: "bg-amber-100 text-amber-800",
    label: "text-amber-700",
  },
} as const;

export function TurnHistory({ turns }: { turns: PublicGame["turns"] }) {
  if (!turns.length) return <p className="py-8 text-center text-sm text-slate-500">質問してヒントを集めよう。</p>;

  const questions = turns.filter((turn) => turn.kind === "QUESTION");
  const questionNumberById = new Map(questions.map((turn, index) => [turn.id, index + 1]));

  return <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" aria-label="質問履歴">
    {turns.map((turn) => {
      if (turn.kind === "GUESS") {
        return <li key={turn.id} className="flex min-h-28 flex-col rounded-xl border border-amber-200 bg-amber-50/80 p-3 shadow-sm">
          <p className="text-xs font-bold text-amber-700">回答</p>
          <p className="mt-1 line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-slate-800">{turn.prompt}</p>
          <p className={`mt-auto pt-2 text-sm font-bold ${turn.correct ? "text-emerald-700" : "text-rose-600"}`}>{turn.correct ? "正解！" : "不正解です"}</p>
        </li>;
      }

      const answer = turn.answer ?? "どちらとも言えない";
      const styles = answerStyles[answer];
      return <li key={turn.id} className={`flex min-h-28 flex-col rounded-xl border p-3 shadow-sm transition-shadow hover:shadow-md ${styles.card}`}>
        <div className="flex items-center justify-between gap-2">
          <span className={`text-xs font-black ${styles.label}`}>Q{questionNumberById.get(turn.id)}</span>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${styles.badge}`}>{answer}</span>
        </div>
        <p title={turn.prompt} className="mt-2 line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-slate-800">{turn.prompt}</p>
      </li>;
    })}
  </ol>;
}
