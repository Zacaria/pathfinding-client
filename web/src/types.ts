export type Point = { x: number; y: number };

export type Cell = {
  wall: boolean;
  weight: number;
};

export type Algorithm =
  | "astar"
  | "bfs"
  | "bfs_bidirectional"
  | "bmssp"
  | "dfs"
  | "dijkstra"
  | "fringe"
  | "idastar"
  | "iddfs"
  | "yen";

export type Problem = {
  width: number;
  height: number;
  cells: Cell[];
  start: Point;
  goal: Point;
  algorithm: Algorithm;
  k?: number;
};

export type SolveResult = {
  found: boolean;
  algorithm: Algorithm;
  elapsed_ms: number;
  visited: Point[];
  path: Point[];
  path_cost: number | null;
  visited_count: number;
};

export type RandomParams = {
  width: number;
  height: number;
  wall_probability: number;
  weighted_probability: number;
  max_weight: number;
  seed: number;
};
