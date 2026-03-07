import type { MultiGoalProblem, MultiSolveResult, Problem, RandomParams, SolveResult } from "@/types";

type EngineModule = {
  default: () => Promise<void>;
  solve: (problem: Problem) => SolveResult;
  solve_multi: (problem: MultiGoalProblem) => MultiSolveResult;
  generate_random: (params: RandomParams) => Problem;
};

let enginePromise: Promise<EngineModule> | null = null;

export async function loadEngine(): Promise<EngineModule> {
  if (!enginePromise) {
    enginePromise = import("./wasm/engine").then(async (m) => {
      const mod = m as unknown as EngineModule;
      await mod.default();
      return mod;
    });
  }
  return enginePromise;
}
