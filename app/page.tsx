import { GameBoard } from "@/components/game-board";

export default function Home() {
  return <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-amber-50 px-4 py-10 sm:py-16"><div className="mx-auto max-w-2xl"><GameBoard /></div></main>;
}
