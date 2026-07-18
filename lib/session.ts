import { cookies } from "next/headers";

const GAME_COOKIE = "reverse-akinator-game";

export async function getCurrentGameId(): Promise<string | undefined> {
  return (await cookies()).get(GAME_COOKIE)?.value;
}

export async function setCurrentGameId(gameId: string): Promise<void> {
  (await cookies()).set(GAME_COOKIE, gameId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}
