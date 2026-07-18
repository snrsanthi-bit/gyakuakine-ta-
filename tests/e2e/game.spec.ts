import { expect, test } from "@playwright/test";

test("shows the game start screen", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("start-game")).toBeVisible();
});
