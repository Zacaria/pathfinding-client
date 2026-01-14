import type { Problem, RandomParams, SolveResult } from "@/types";

type EngineModule = {
  default: () => Promise<void>;
  solve: (problem: Problem) => SolveResult;
  generate_random: (params: RandomParams) => Problem;
};

let enginePromise: Promise<EngineModule> | null = null;

export async function loadEngine(): Promise<EngineModule> {
  if (!enginePromise) {
    enginePromise = import("./wasm/engine.js").then(async (m) => {
      const mod = m as unknown as EngineModule;
      await mod.default();
      return mod;
    });
  }
  return enginePromise;
}

