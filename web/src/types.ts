export type Point = { x: number; y: number };

export type Cell = {
  wall: boolean;
  weight: number;
};

export type Algorithm =
  | "astar"
  | "bfs"
  | "bfs_bidirectional"
  | "dfs"
  | "dijkstra"
  | "fringe"
  | "idastar"
  | "iddfs"
  | "indexed_astar"
  | "indexed_bfs"
  | "indexed_dfs"
  | "indexed_dijkstra"
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

export type MultiGoalProblem = {
  width: number;
  height: number;
  cells: Cell[];
  start: Point;
  goals: Point[];
  algorithm: Algorithm;
  k?: number;
};

export type ExitResult = {
  goal: Point;
  found: boolean;
  path: Point[];
  path_cost: number | null;
};

export type MultiSolveResult = {
  algorithm: Algorithm;
  elapsed_ms: number;
  visited: Point[];
  visited_count: number;
  goals_count: number;
  reachable_goals_count: number;
  best_goal_index: number | null;
  results: ExitResult[];
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
