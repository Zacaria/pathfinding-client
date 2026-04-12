import { expect, test } from "@playwright/test";

test("run and reset buttons drive the visible solve flow", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Pathfinding Demo/i })).toBeVisible();
  await expect(page.getByText("Result").locator("..")).toContainText("—");

  await page.getByRole("button", { name: "Run" }).click();

  await expect(page.getByText("Result").locator("..")).toContainText("Path found");
  await expect(page.getByText("Time").locator("..")).not.toContainText("—");
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();

  await page.getByRole("button", { name: "Reset" }).click();

  await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Run" })).toBeEnabled();
});
