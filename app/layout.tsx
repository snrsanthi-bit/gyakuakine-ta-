import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "逆アキネーター",
  description: "AIが考えている人物を質問で当てるゲーム",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>;
}
