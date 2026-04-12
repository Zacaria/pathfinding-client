import type { Algorithm } from "@/types";

export type AlgorithmOption = {
  value: Algorithm;
  label: string;
  shortLabel: string;
  ignoresWeights: boolean;
  mayBeSlow: boolean;
  supportsK: boolean;
};

export type AlgorithmGroup = {
  id: "classic" | "indexed";
  label: string;
  options: readonly AlgorithmOption[];
};

const CLASSIC_ALGORITHMS: readonly AlgorithmOption[] = [
  { value: "bfs", label: "BFS", shortLabel: "BFS", ignoresWeights: true, mayBeSlow: false, supportsK: false },
  {
    value: "bfs_bidirectional",
    label: "Bidirectional BFS",
    shortLabel: "Bi-BFS",
    ignoresWeights: true,
    mayBeSlow: false,
    supportsK: false,
  },
  { value: "dfs", label: "DFS", shortLabel: "DFS", ignoresWeights: true, mayBeSlow: false, supportsK: false },
  { value: "iddfs", label: "IDDFS", shortLabel: "IDDFS", ignoresWeights: true, mayBeSlow: true, supportsK: false },
  {
    value: "dijkstra",
    label: "Dijkstra",
    shortLabel: "Dijkstra",
    ignoresWeights: false,
    mayBeSlow: false,
    supportsK: false,
  },
  { value: "astar", label: "A*", shortLabel: "A*", ignoresWeights: false, mayBeSlow: false, supportsK: false },
  {
    value: "fringe",
    label: "Fringe",
    shortLabel: "Fringe",
    ignoresWeights: false,
    mayBeSlow: false,
    supportsK: false,
  },
  { value: "idastar", label: "IDA*", shortLabel: "IDA*", ignoresWeights: false, mayBeSlow: true, supportsK: false },
  {
    value: "yen",
    label: "Yen (k-shortest)",
    shortLabel: "Yen",
    ignoresWeights: false,
    mayBeSlow: false,
    supportsK: true,
  },
] as const;

const INDEXED_ALGORITHMS: readonly AlgorithmOption[] = [
  {
    value: "indexed_bfs",
    label: "Indexed BFS",
    shortLabel: "Indexed BFS",
    ignoresWeights: true,
    mayBeSlow: false,
    supportsK: false,
  },
  {
    value: "indexed_dfs",
    label: "Indexed DFS",
    shortLabel: "Indexed DFS",
    ignoresWeights: true,
    mayBeSlow: false,
    supportsK: false,
  },
  {
    value: "indexed_dijkstra",
    label: "Indexed Dijkstra",
    shortLabel: "Indexed Dijkstra",
    ignoresWeights: false,
    mayBeSlow: false,
    supportsK: false,
  },
  {
    value: "indexed_astar",
    label: "Indexed A*",
    shortLabel: "Indexed A*",
    ignoresWeights: false,
    mayBeSlow: false,
    supportsK: false,
  },
] as const;

export const DEFAULT_ALGORITHM: Algorithm = "astar";

export const ALGORITHM_GROUPS = [
  { id: "classic", label: "Classic", options: CLASSIC_ALGORITHMS },
  { id: "indexed", label: "Indexed", options: INDEXED_ALGORITHMS },
] as const satisfies readonly AlgorithmGroup[];

const ALGORITHMS: readonly AlgorithmOption[] = ALGORITHM_GROUPS.flatMap((group) => group.options);
const ALGORITHM_BY_VALUE = new Map<Algorithm, AlgorithmOption>(
  ALGORITHMS.map((option) => [option.value, option]),
);

export const ALGORITHM_BADGES = ALGORITHMS.map((option) => option.shortLabel);

export function getAlgorithmOption(value: Algorithm): AlgorithmOption {
  const option = ALGORITHM_BY_VALUE.get(value);
  if (!option) {
    throw new Error(`Unknown algorithm: ${value}`);
  }
  return option;
}
