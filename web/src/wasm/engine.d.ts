import type { Problem, RandomParams, SolveResult } from "@/types";
import type { MultiGoalProblem, MultiSolveResult } from "@/types";

export default function init(): Promise<void>;
export function solve(problem: Problem): SolveResult;
export function solve_multi(problem: MultiGoalProblem): MultiSolveResult;
export function generate_random(params: RandomParams): Problem;
