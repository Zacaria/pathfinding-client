use std::collections::HashSet;

use pathfinding::prelude::{
    astar, bfs, bfs_bidirectional, build_path, dfs, dijkstra, dijkstra_all, fringe, idastar, iddfs,
    yen,
};
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[wasm_bindgen(start)]
pub fn wasm_start() {
    console_error_panic_hook::set_once();
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Point {
    pub x: u32,
    pub y: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct Cell {
    pub wall: bool,
    pub weight: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Algorithm {
    Bfs,
    BfsBidirectional,
    Dfs,
    Iddfs,
    Dijkstra,
    Astar,
    Fringe,
    Idastar,
    Yen,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Problem {
    pub width: u32,
    pub height: u32,
    pub cells: Vec<Cell>,
    pub start: Point,
    pub goal: Point,
    pub algorithm: Algorithm,
    #[serde(default)]
    pub k: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MultiGoalProblem {
    pub width: u32,
    pub height: u32,
    pub cells: Vec<Cell>,
    pub start: Point,
    pub goals: Vec<Point>,
    pub algorithm: Algorithm,
    #[serde(default)]
    pub k: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExitResult {
    pub goal: Point,
    pub found: bool,
    pub path: Vec<Point>,
    pub path_cost: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MultiSolveResult {
    pub algorithm: Algorithm,
    pub elapsed_ms: f64,
    pub visited: Vec<Point>,
    pub visited_count: u32,
    pub goals_count: u32,
    pub reachable_goals_count: u32,
    pub best_goal_index: Option<u32>,
    pub results: Vec<ExitResult>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SolveResult {
    pub found: bool,
    pub algorithm: Algorithm,
    pub elapsed_ms: f64,
    pub visited: Vec<Point>,
    pub path: Vec<Point>,
    pub path_cost: Option<u32>,
    pub visited_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RandomParams {
    pub width: u32,
    pub height: u32,
    pub wall_probability: f32,
    pub weighted_probability: f32,
    pub max_weight: u32,
    pub seed: u64,
}

#[wasm_bindgen]
pub fn solve(problem: JsValue) -> Result<JsValue, JsValue> {
    let problem: Problem = serde_wasm_bindgen::from_value(problem)
        .map_err(|e| JsValue::from_str(&format!("Invalid problem: {e}")))?;

    let result =
        solve_problem(&problem).map_err(|e| JsValue::from_str(&format!("Solve error: {e}")))?;

    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsValue::from_str(&format!("Serialize error: {e}")))
}

#[wasm_bindgen]
pub fn generate_random(params: JsValue) -> Result<JsValue, JsValue> {
    let params: RandomParams = serde_wasm_bindgen::from_value(params)
        .map_err(|e| JsValue::from_str(&format!("Invalid params: {e}")))?;

    let problem = random_problem(params);
    serde_wasm_bindgen::to_value(&problem)
        .map_err(|e| JsValue::from_str(&format!("Serialize error: {e}")))
}

#[wasm_bindgen]
pub fn solve_multi(problem: JsValue) -> Result<JsValue, JsValue> {
    let problem: MultiGoalProblem = serde_wasm_bindgen::from_value(problem)
        .map_err(|e| JsValue::from_str(&format!("Invalid problem: {e}")))?;

    let result = solve_multi_problem(&problem)
        .map_err(|e| JsValue::from_str(&format!("Solve error: {e}")))?;

    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsValue::from_str(&format!("Serialize error: {e}")))
}

fn solve_problem(problem: &Problem) -> Result<SolveResult, String> {
    validate(problem)?;

    let start_idx = to_idx(problem.width, problem.start);
    let goal_idx = to_idx(problem.width, problem.goal);
    let open_nodes = problem.cells.iter().filter(|c| !c.wall).count().max(1);

    // Some algorithms can be extremely slow on dense graphs due to repeated deepening.
    // Since this runs synchronously in WASM (blocking the UI), cap them to keep the demo responsive.
    match problem.algorithm {
        Algorithm::Iddfs if open_nodes > 200 => {
            return Err(
                "IDDFS can be extremely slow on larger grids; reduce open cells to <= 200.".into(),
            );
        }
        Algorithm::Idastar if open_nodes > 600 => {
            return Err(
                "IDA* can be extremely slow on larger grids; reduce open cells to <= 600.".into(),
            );
        }
        _ => {}
    }

    let expanded = std::cell::RefCell::<Vec<usize>>::new(Vec::new());
    let expanded_set = std::cell::RefCell::<HashSet<usize>>::new(HashSet::new());
    let record_expand = |idx: usize| {
        let mut set = expanded_set.borrow_mut();
        if set.insert(idx) {
            expanded.borrow_mut().push(idx);
        }
    };

    let t0 = now_ms();

    let (path, cost) = match problem.algorithm {
        Algorithm::Bfs => {
            let path = bfs(
                &start_idx,
                |n| successors_unweighted(problem, *n, &record_expand),
                |n| *n == goal_idx,
            );
            let cost = path.as_ref().map(|p| p.len().saturating_sub(1) as u32);
            (path, cost)
        }
        Algorithm::BfsBidirectional => {
            let path = bfs_bidirectional(
                &start_idx,
                &goal_idx,
                |n| successors_unweighted(problem, *n, &record_expand),
                |n| successors_unweighted(problem, *n, &record_expand),
            );
            let cost = path.as_ref().map(|p| p.len().saturating_sub(1) as u32);
            (path, cost)
        }
        Algorithm::Dfs => {
            let path = dfs(
                start_idx,
                |n| successors_unweighted(problem, *n, &record_expand),
                |n| *n == goal_idx,
            );
            let cost = path.as_ref().map(|p| p.len().saturating_sub(1) as u32);
            (path, cost)
        }
        Algorithm::Iddfs => {
            let path = iddfs(
                start_idx,
                |n| successors_unweighted(problem, *n, &record_expand),
                |n| *n == goal_idx,
            );
            let cost = path.as_ref().map(|p| p.len().saturating_sub(1) as u32);
            (path, cost)
        }
        Algorithm::Dijkstra => {
            let result = dijkstra(
                &start_idx,
                |n| successors_weighted(problem, *n, &record_expand),
                |n| *n == goal_idx,
            );
            match result {
                Some((path, cost)) => (Some(path), Some(cost)),
                None => (None, None),
            }
        }
        Algorithm::Astar => {
            let result = astar(
                &start_idx,
                |n| successors_weighted(problem, *n, &record_expand),
                |n| heuristic(problem.width, *n, goal_idx),
                |n| *n == goal_idx,
            );
            match result {
                Some((path, cost)) => (Some(path), Some(cost)),
                None => (None, None),
            }
        }
        Algorithm::Fringe => {
            let result = fringe(
                &start_idx,
                |n| successors_weighted(problem, *n, &record_expand),
                |n| heuristic(problem.width, *n, goal_idx),
                |n| *n == goal_idx,
            );
            match result {
                Some((path, cost)) => (Some(path), Some(cost)),
                None => (None, None),
            }
        }
        Algorithm::Idastar => {
            let result = idastar(
                &start_idx,
                |n| successors_weighted(problem, *n, &record_expand),
                |n| heuristic(problem.width, *n, goal_idx),
                |n| *n == goal_idx,
            );
            match result {
                Some((path, cost)) => (Some(path), Some(cost)),
                None => (None, None),
            }
        }
        Algorithm::Yen => {
            let k = problem.k.unwrap_or(3).clamp(1, 20) as usize;
            let paths = yen(
                &start_idx,
                |n| successors_weighted(problem, *n, &record_expand),
                |n| *n == goal_idx,
                k,
            );
            match paths.into_iter().next() {
                Some((path, cost)) => (Some(path), Some(cost)),
                None => (None, None),
            }
        }
    };

    let elapsed_ms = now_ms() - t0;

    let visited_indices = expanded.into_inner();
    let visited_points = visited_indices
        .into_iter()
        .map(|idx| from_idx(problem.width, idx))
        .collect::<Vec<_>>();

    let path_points = path
        .unwrap_or_default()
        .into_iter()
        .map(|idx| from_idx(problem.width, idx))
        .collect::<Vec<_>>();

    Ok(SolveResult {
        found: !path_points.is_empty(),
        algorithm: problem.algorithm,
        elapsed_ms,
        visited_count: visited_points.len() as u32,
        visited: visited_points,
        path: path_points,
        path_cost: cost,
    })
}

fn solve_multi_problem(problem: &MultiGoalProblem) -> Result<MultiSolveResult, String> {
    validate_multi(problem)?;

    let start_idx = to_idx(problem.width, problem.start);
    let goal_indices = problem
        .goals
        .iter()
        .map(|g| to_idx(problem.width, *g))
        .collect::<Vec<_>>();

    let open_nodes = problem.cells.iter().filter(|c| !c.wall).count().max(1);

    // Per-goal replanning can explode; keep the demo responsive.
    // (Dijkstra computes all goals in one run.)
    let is_single_source_all = matches!(problem.algorithm, Algorithm::Dijkstra);
    if !is_single_source_all && goal_indices.len() > 40 {
        return Err(
            "Too many exits for per-exit algorithms; reduce grid height or slow the tick rate."
                .into(),
        );
    }
    match problem.algorithm {
        Algorithm::Iddfs if open_nodes > 200 => {
            return Err(
                "IDDFS can be extremely slow on larger grids; reduce open cells to <= 200.".into(),
            );
        }
        Algorithm::Idastar if open_nodes > 600 => {
            return Err(
                "IDA* can be extremely slow on larger grids; reduce open cells to <= 600.".into(),
            );
        }
        _ => {}
    }

    let expanded = std::cell::RefCell::<Vec<usize>>::new(Vec::new());
    let expanded_set = std::cell::RefCell::<HashSet<usize>>::new(HashSet::new());
    let record_expand = |idx: usize| {
        let mut set = expanded_set.borrow_mut();
        if set.insert(idx) {
            expanded.borrow_mut().push(idx);
        }
    };

    let t0 = now_ms();

    let mut results = Vec::<ExitResult>::with_capacity(goal_indices.len());
    let mut best_goal_index: Option<u32> = None;
    let mut best_cost: Option<u32> = None;
    let mut reachable = 0u32;

    if matches!(problem.algorithm, Algorithm::Dijkstra) {
        let parents = dijkstra_all(&start_idx, |n| {
            successors_weighted_multi(problem, *n, &record_expand)
        });

        for (i, (goal_point, goal_idx)) in problem
            .goals
            .iter()
            .copied()
            .zip(goal_indices.iter().copied())
            .enumerate()
        {
            let (found, path, cost) = if goal_idx == start_idx {
                (true, vec![problem.start], Some(0))
            } else if let Some((_, c)) = parents.get(&goal_idx) {
                let path = build_path(&goal_idx, &parents)
                    .into_iter()
                    .map(|idx| from_idx(problem.width, idx))
                    .collect::<Vec<_>>();
                (true, path, Some(*c))
            } else {
                (false, Vec::new(), None)
            };

            if found {
                reachable += 1;
                if best_cost.map_or(true, |bc| cost.unwrap_or(u32::MAX) < bc) {
                    best_cost = cost;
                    best_goal_index = Some(i as u32);
                }
            }

            results.push(ExitResult {
                goal: goal_point,
                found,
                path,
                path_cost: cost,
            });
        }
    } else {
        for (i, (goal_point, goal_idx)) in problem
            .goals
            .iter()
            .copied()
            .zip(goal_indices.iter().copied())
            .enumerate()
        {
            let (path_indices, cost) = solve_one_goal(problem, start_idx, goal_idx, &record_expand);
            let found = path_indices.is_some();
            let path_points = path_indices
                .unwrap_or_default()
                .into_iter()
                .map(|idx| from_idx(problem.width, idx))
                .collect::<Vec<_>>();

            if found {
                reachable += 1;
                if best_cost.map_or(true, |bc| cost.unwrap_or(u32::MAX) < bc) {
                    best_cost = cost;
                    best_goal_index = Some(i as u32);
                }
            }

            results.push(ExitResult {
                goal: goal_point,
                found,
                path: path_points,
                path_cost: cost,
            });
        }
    }

    let elapsed_ms = now_ms() - t0;

    let visited_indices = expanded.into_inner();
    let visited_points = visited_indices
        .into_iter()
        .map(|idx| from_idx(problem.width, idx))
        .collect::<Vec<_>>();

    Ok(MultiSolveResult {
        algorithm: problem.algorithm,
        elapsed_ms,
        visited_count: visited_points.len() as u32,
        visited: visited_points,
        goals_count: goal_indices.len() as u32,
        reachable_goals_count: reachable,
        best_goal_index,
        results,
    })
}

#[cfg(target_arch = "wasm32")]
fn now_ms() -> f64 {
    js_sys::Date::now()
}

#[cfg(not(target_arch = "wasm32"))]
fn now_ms() -> f64 {
    use std::time::{SystemTime, UNIX_EPOCH};

    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs_f64()
        * 1000.0
}

fn validate(problem: &Problem) -> Result<(), String> {
    if problem.width == 0 || problem.height == 0 {
        return Err("width/height must be > 0".into());
    }
    let expected = (problem.width as usize)
        .checked_mul(problem.height as usize)
        .ok_or_else(|| "grid too large".to_string())?;
    if problem.cells.len() != expected {
        return Err(format!(
            "cells length mismatch: expected {expected}, got {}",
            problem.cells.len()
        ));
    }
    if problem.start.x >= problem.width || problem.start.y >= problem.height {
        return Err("start out of bounds".into());
    }
    if problem.goal.x >= problem.width || problem.goal.y >= problem.height {
        return Err("goal out of bounds".into());
    }
    let start_idx = to_idx(problem.width, problem.start);
    let goal_idx = to_idx(problem.width, problem.goal);
    if problem.cells[start_idx].wall {
        return Err("start is on a wall".into());
    }
    if problem.cells[goal_idx].wall {
        return Err("goal is on a wall".into());
    }
    Ok(())
}

fn validate_multi(problem: &MultiGoalProblem) -> Result<(), String> {
    if problem.width == 0 || problem.height == 0 {
        return Err("width/height must be > 0".into());
    }
    let expected = (problem.width as usize)
        .checked_mul(problem.height as usize)
        .ok_or_else(|| "grid too large".to_string())?;
    if problem.cells.len() != expected {
        return Err(format!(
            "cells length mismatch: expected {expected}, got {}",
            problem.cells.len()
        ));
    }
    if problem.start.x >= problem.width || problem.start.y >= problem.height {
        return Err("start out of bounds".into());
    }
    let start_idx = to_idx(problem.width, problem.start);
    if problem.cells[start_idx].wall {
        return Err("start is on a wall".into());
    }
    for g in &problem.goals {
        if g.x >= problem.width || g.y >= problem.height {
            return Err("goal out of bounds".into());
        }
        let idx = to_idx(problem.width, *g);
        if problem.cells[idx].wall {
            return Err("goal is on a wall".into());
        }
    }
    Ok(())
}

fn to_idx(width: u32, p: Point) -> usize {
    (p.y as usize) * (width as usize) + (p.x as usize)
}

fn from_idx(width: u32, idx: usize) -> Point {
    let w = width as usize;
    Point {
        x: (idx % w) as u32,
        y: (idx / w) as u32,
    }
}

fn neighbors_4(width: u32, height: u32, idx: usize) -> [Option<usize>; 4] {
    let w = width as usize;
    let x = idx % w;
    let y = idx / w;

    [
        (y > 0).then_some(idx - w),
        (x + 1 < w).then_some(idx + 1),
        (y + 1 < height as usize).then_some(idx + w),
        (x > 0).then_some(idx - 1),
    ]
}

fn successors_unweighted<F>(problem: &Problem, idx: usize, record_expand: &F) -> Vec<usize>
where
    F: Fn(usize),
{
    record_expand(idx);
    let mut out = Vec::with_capacity(4);
    for n in neighbors_4(problem.width, problem.height, idx) {
        let Some(nidx) = n else { continue };
        if !problem.cells[nidx].wall {
            out.push(nidx);
        }
    }
    out
}

fn successors_weighted<F>(problem: &Problem, idx: usize, record_expand: &F) -> Vec<(usize, u32)>
where
    F: Fn(usize),
{
    record_expand(idx);
    let mut out = Vec::with_capacity(4);
    for n in neighbors_4(problem.width, problem.height, idx) {
        let Some(nidx) = n else { continue };
        let cell = problem.cells[nidx];
        if cell.wall {
            continue;
        }
        let cost = cell.weight.max(1);
        out.push((nidx, cost));
    }
    out
}

fn successors_unweighted_multi<F>(
    problem: &MultiGoalProblem,
    idx: usize,
    record_expand: &F,
) -> Vec<usize>
where
    F: Fn(usize),
{
    record_expand(idx);
    let mut out = Vec::with_capacity(4);
    for n in neighbors_4(problem.width, problem.height, idx) {
        let Some(nidx) = n else { continue };
        if !problem.cells[nidx].wall {
            out.push(nidx);
        }
    }
    out
}

fn successors_weighted_multi<F>(
    problem: &MultiGoalProblem,
    idx: usize,
    record_expand: &F,
) -> Vec<(usize, u32)>
where
    F: Fn(usize),
{
    record_expand(idx);
    let mut out = Vec::with_capacity(4);
    for n in neighbors_4(problem.width, problem.height, idx) {
        let Some(nidx) = n else { continue };
        let cell = problem.cells[nidx];
        if cell.wall {
            continue;
        }
        let cost = cell.weight.max(1);
        out.push((nidx, cost));
    }
    out
}

fn heuristic(width: u32, node_idx: usize, goal_idx: usize) -> u32 {
    let a = from_idx(width, node_idx);
    let b = from_idx(width, goal_idx);
    a.x.abs_diff(b.x) + a.y.abs_diff(b.y)
}

fn solve_one_goal<F>(
    problem: &MultiGoalProblem,
    start_idx: usize,
    goal_idx: usize,
    record_expand: &F,
) -> (Option<Vec<usize>>, Option<u32>)
where
    F: Fn(usize),
{
    match problem.algorithm {
        Algorithm::Bfs => {
            let path = bfs(
                &start_idx,
                |n| successors_unweighted_multi(problem, *n, record_expand),
                |n| *n == goal_idx,
            );
            let cost = path.as_ref().map(|p| p.len().saturating_sub(1) as u32);
            (path, cost)
        }
        Algorithm::BfsBidirectional => {
            let path = bfs_bidirectional(
                &start_idx,
                &goal_idx,
                |n| successors_unweighted_multi(problem, *n, record_expand),
                |n| successors_unweighted_multi(problem, *n, record_expand),
            );
            let cost = path.as_ref().map(|p| p.len().saturating_sub(1) as u32);
            (path, cost)
        }
        Algorithm::Dfs => {
            let path = dfs(
                start_idx,
                |n| successors_unweighted_multi(problem, *n, record_expand),
                |n| *n == goal_idx,
            );
            let cost = path.as_ref().map(|p| p.len().saturating_sub(1) as u32);
            (path, cost)
        }
        Algorithm::Iddfs => {
            let path = iddfs(
                start_idx,
                |n| successors_unweighted_multi(problem, *n, record_expand),
                |n| *n == goal_idx,
            );
            let cost = path.as_ref().map(|p| p.len().saturating_sub(1) as u32);
            (path, cost)
        }
        Algorithm::Astar => {
            let result = astar(
                &start_idx,
                |n| successors_weighted_multi(problem, *n, record_expand),
                |n| heuristic(problem.width, *n, goal_idx),
                |n| *n == goal_idx,
            );
            match result {
                Some((path, cost)) => (Some(path), Some(cost)),
                None => (None, None),
            }
        }
        Algorithm::Fringe => {
            let result = fringe(
                &start_idx,
                |n| successors_weighted_multi(problem, *n, record_expand),
                |n| heuristic(problem.width, *n, goal_idx),
                |n| *n == goal_idx,
            );
            match result {
                Some((path, cost)) => (Some(path), Some(cost)),
                None => (None, None),
            }
        }
        Algorithm::Idastar => {
            let result = idastar(
                &start_idx,
                |n| successors_weighted_multi(problem, *n, record_expand),
                |n| heuristic(problem.width, *n, goal_idx),
                |n| *n == goal_idx,
            );
            match result {
                Some((path, cost)) => (Some(path), Some(cost)),
                None => (None, None),
            }
        }
        Algorithm::Yen => {
            let k = problem.k.unwrap_or(3).clamp(1, 20) as usize;
            let paths = yen(
                &start_idx,
                |n| successors_weighted_multi(problem, *n, record_expand),
                |n| *n == goal_idx,
                k,
            );
            match paths.into_iter().next() {
                Some((path, cost)) => (Some(path), Some(cost)),
                None => (None, None),
            }
        }
        // Handled at a higher level for multi-goal efficiency.
        Algorithm::Dijkstra => (None, None),
    }
}

fn random_problem(params: RandomParams) -> Problem {
    let width = params.width.max(1);
    let height = params.height.max(1);
    let cell_count = (width as usize) * (height as usize);
    let mut rng = XorShift64::new(params.seed);

    let wall_p = params.wall_probability.clamp(0.0, 1.0);
    let weighted_p = params.weighted_probability.clamp(0.0, 1.0);
    let max_w = params.max_weight.max(1);

    let mut cells = Vec::with_capacity(cell_count);
    for _ in 0..cell_count {
        let is_wall = rng.next_f32() < wall_p;
        let is_weighted = !is_wall && (rng.next_f32() < weighted_p);
        let weight = if is_weighted {
            2 + (rng.next_u32() % (max_w.saturating_sub(1).max(1)))
        } else {
            1
        };
        cells.push(Cell {
            wall: is_wall,
            weight,
        });
    }

    let start = Point { x: 0, y: 0 };
    let goal = Point {
        x: width - 1,
        y: height - 1,
    };

    let start_idx = to_idx(width, start);
    let goal_idx = to_idx(width, goal);
    cells[start_idx] = Cell {
        wall: false,
        weight: 1,
    };
    cells[goal_idx] = Cell {
        wall: false,
        weight: 1,
    };

    Problem {
        width,
        height,
        cells,
        start,
        goal,
        algorithm: Algorithm::Astar,
        k: None,
    }
}

struct XorShift64 {
    state: u64,
}

impl XorShift64 {
    fn new(seed: u64) -> Self {
        Self {
            state: if seed == 0 {
                0xdead_beef_cafe_babe
            } else {
                seed
            },
        }
    }

    fn next_u64(&mut self) -> u64 {
        let mut x = self.state;
        x ^= x << 13;
        x ^= x >> 7;
        x ^= x << 17;
        self.state = x;
        x
    }

    fn next_u32(&mut self) -> u32 {
        (self.next_u64() >> 32) as u32
    }

    fn next_f32(&mut self) -> f32 {
        let v = self.next_u32();
        (v as f32) / (u32::MAX as f32)
    }
}
