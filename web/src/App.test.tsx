import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App, { TOUR_STEPS } from "@/App";

vi.mock("@/engine", () => ({
  loadEngine: vi.fn(async () => ({
    solve: vi.fn(),
    solve_multi: vi.fn(),
    generate_random: vi.fn(),
  })),
}));

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("App algorithm selector", () => {
  it("links to the GitHub repository from the header", () => {
    render(<App />);

    expect(screen.getByRole("link", { name: "Open GitHub repository" })).toHaveAttribute(
      "href",
      "https://github.com/Zacaria/pathfinding-client",
    );
  });

  it("renders related content links in the footer", () => {
    render(<App />);

    const related = screen.getByRole("navigation", { name: "Related content" });

    expect(within(related).getByRole("link", { name: "Source" })).toHaveAttribute(
      "href",
      "https://github.com/Zacaria/pathfinding-client",
    );
    expect(within(related).getByRole("link", { name: "pathfinding crate" })).toHaveAttribute(
      "href",
      "https://crates.io/crates/pathfinding",
    );
    expect(within(related).getByRole("link", { name: "pathfinding-indexed crate" })).toHaveAttribute(
      "href",
      "https://crates.io/crates/pathfinding-indexed",
    );
    expect(within(related).getByRole("link", { name: "README" })).toHaveAttribute(
      "href",
      "https://github.com/Zacaria/pathfinding-client#readme",
    );
  });

  it("opens the UI tour from the header help button", async () => {
    localStorage.setItem("pf-demo-tour-seen-v1", "done");
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: "Open UI tour" }));

    expect(screen.getByText("Explore pathfinding")).toBeInTheDocument();
  });

  it("adds extra scroll offset for tour steps below the sticky metrics bar", () => {
    const tourStepsByTarget = new Map(TOUR_STEPS.map((step) => [String(step.target), step]));

    expect(tourStepsByTarget.get('[data-tour="algorithm"]')?.scrollOffset).toBe(104);
    expect(tourStepsByTarget.get('[data-tour="run"]')?.scrollOffset).toBe(104);
    expect(tourStepsByTarget.get('[data-tour="edit"]')?.scrollOffset).toBe(104);
    expect(tourStepsByTarget.get('[data-tour="random"]')?.scrollOffset).toBe(104);
  });

  it("renders classic and indexed groups in the algorithm menu", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    render(<App />);

    await user.click(screen.getAllByRole("combobox")[0]!);
    const listbox = await screen.findByRole("listbox");

    expect(within(listbox).getByText("Classic")).toBeInTheDocument();
    expect(within(listbox).getByText("Indexed")).toBeInTheDocument();
    expect(within(listbox).getByText("Indexed Dijkstra")).toBeInTheDocument();
  });

  it("updates algorithm-specific hints when switching to an indexed algorithm", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    render(<App />);

    await user.click(screen.getAllByRole("combobox")[0]!);
    const listbox = await screen.findByRole("listbox");
    await user.click(within(listbox).getByText("Indexed BFS"));

    expect(screen.getByText("This algorithm ignores weights (treats all costs as 1).")).toBeInTheDocument();
    expect(screen.queryByText("Returns the best path; higher k explores more alternatives.")).not.toBeInTheDocument();
  });
});
