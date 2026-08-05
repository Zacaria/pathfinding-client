import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("pf-demo-tour-seen-v1", "done"));
});

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

test("scrolling mode recomputes paths to exits", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/");

  await page.getByRole("spinbutton", { name: "Width" }).fill("8");
  await page.getByRole("spinbutton", { name: "Width" }).blur();
  await page.getByRole("spinbutton", { name: "Height" }).fill("8");
  await page.getByRole("spinbutton", { name: "Height" }).blur();
  await page.getByRole("radio", { name: "Scrolling" }).click();
  await expect(page.getByText("Tick rate")).toBeVisible();
  await expect(page.getByText("Scroll direction")).toBeVisible();

  const algorithms = [
    "BFS",
    "Bidirectional BFS",
    "DFS",
    "IDDFS",
    "Dijkstra",
    "A*",
    "Fringe",
    "IDA*",
    "Yen (k-shortest)",
    "Indexed BFS",
    "Indexed DFS",
    "Indexed Dijkstra",
    "Indexed A*",
  ];

  for (const algorithm of algorithms) {
    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: algorithm, exact: true }).click();
    await page.getByRole("button", { name: "Start", exact: true }).click();

    await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
    await expect(page.getByText("Result").locator("..")).toContainText(/Exit reachable|No exit/);
    await expect(page.getByText("Time").locator("..")).toContainText("ms/tick");
    await expect(page.getByText("Time").locator("..")).toContainText(/ms avg \(last \d+\)/);
    await expect(page.getByText("Exits", { exact: true }).locator("..")).toContainText(/\d+\/\d+/);

    await page.getByRole("button", { name: "Pause" }).click();
    await page.getByRole("button", { name: "Reset" }).click();
    await expect(page.getByText("Result").locator("..")).toContainText("—");
  }
});
