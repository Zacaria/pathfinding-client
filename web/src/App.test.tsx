import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import App from "@/App";

vi.mock("@/engine", () => ({
  loadEngine: vi.fn(async () => ({
    solve: vi.fn(),
    solve_multi: vi.fn(),
    generate_random: vi.fn(),
  })),
}));

describe("App algorithm selector", () => {
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
