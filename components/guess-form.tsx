"use client";
import { FormEvent, useState } from "react";

export function GuessForm({ disabled, onSubmit }: { disabled: boolean; onSubmit: (guess: string) => Promise<void> }) {
  const [guess, setGuess] = useState("");
  async function submit(event: FormEvent) { event.preventDefault(); if (!guess.trim()) return; await onSubmit(guess); setGuess(""); }
  return <form onSubmit={submit} className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4"><label className="block text-sm font-bold text-amber-900" htmlFor="guess">答えがわかった？</label><div className="flex gap-2"><input id="guess" data-testid="guess-input" value={guess} onChange={(event) => setGuess(event.target.value)} maxLength={120} disabled={disabled} placeholder="人物の名前を入力" className="min-w-0 flex-1 rounded-xl border border-amber-300 bg-white px-4 py-3 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100 disabled:bg-amber-100" /><button data-testid="guess-submit" disabled={disabled || !guess.trim()} className="rounded-xl bg-amber-500 px-5 font-bold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-amber-200">回答する</button></div></form>;
}
