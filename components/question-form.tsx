"use client";
import { FormEvent, useState } from "react";

export function QuestionForm({ disabled, onSubmit }: { disabled: boolean; onSubmit: (question: string) => Promise<void> }) {
  const [question, setQuestion] = useState("");
  async function submit(event: FormEvent) { event.preventDefault(); if (!question.trim()) return; await onSubmit(question); setQuestion(""); }
  return <form onSubmit={submit} className="space-y-3"><label className="block text-sm font-bold text-slate-700" htmlFor="question">質問する</label><div className="flex gap-2"><input id="question" data-testid="question-input" value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={500} disabled={disabled} placeholder="例：その人はスポーツ選手ですか？" className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100" /><button data-testid="question-submit" disabled={disabled || !question.trim()} className="rounded-xl bg-indigo-600 px-5 font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300">聞く</button></div></form>;
}
