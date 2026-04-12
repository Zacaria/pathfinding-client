import { describe, expect, it } from "vitest";

import { ALGORITHM_BADGES, ALGORITHM_GROUPS, getAlgorithmOption } from "@/algorithms";

describe("algorithm catalog", () => {
  it("keeps classic and indexed algorithms in separate groups", () => {
    expect(ALGORITHM_GROUPS.map((group) => group.label)).toEqual(["Classic", "Indexed"]);
    expect(ALGORITHM_GROUPS[0]?.options.length).toBeGreaterThan(0);
    expect(ALGORITHM_GROUPS[1]?.options.length).toBeGreaterThan(0);
  });

  it("exposes unique algorithm values across the catalog", () => {
    const values = ALGORITHM_GROUPS.flatMap((group) => group.options.map((option) => option.value));
    expect(new Set(values).size).toBe(values.length);
  });

  it("marks weight and k metadata correctly", () => {
    expect(getAlgorithmOption("indexed_bfs").ignoresWeights).toBe(true);
    expect(getAlgorithmOption("indexed_dijkstra").ignoresWeights).toBe(false);
    expect(getAlgorithmOption("yen").supportsK).toBe(true);
    expect(getAlgorithmOption("indexed_astar").supportsK).toBe(false);
    expect(ALGORITHM_BADGES).toContain("Indexed A*");
  });
});
