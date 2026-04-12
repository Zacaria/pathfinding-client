use pathfinding_indexed::IndexedGraph;

use crate::{
    Algorithm, Cell, ExitResult, MultiGoalProblem, MultiSolveResult, Point, Problem, SolveResult,
    from_idx, heuristic, neighbors_4, now_ms, to_idx,
};

type WeightedGraph = IndexedGraph<u32>;

pub(crate) fn is_indexed_algorithm(algorithm: Algorithm) -> bool {
    matches!(
        algorithm,
        Algorithm::IndexedBfs
            | Algorithm::IndexedDfs
            | Algorithm::IndexedDijkstra
            | Algorithm::IndexedAstar
    )
}

pub(crate) fn solve_problem(problem: &Problem) -> Result<SolveResult, String> {
    let graph = build_graph(problem.width, problem.height, &problem.cells);
    let start_idx = to_idx(problem.width, problem.start);
    let goal_idx = to_idx(problem.width, problem.goal);

    let t0 = now_ms();
    let (visited_indices, path, cost) = match problem.algorithm {
        Algorithm::IndexedBfs => {
            let visited = graph.bfs_reach(start_idx).collect::<Vec<_>>();
            let path = graph.bfs(start_idx, |node| node == goal_idx);
            let cost = path_cost_unweighted(path.as_deref());
            (visited, path, cost)
        }
        Algorithm::IndexedDfs => {
            let visited = graph.dfs_reach(start_idx).collect::<Vec<_>>();
            let path = graph.dfs(start_idx, |node| node == goal_idx);
            let cost = path_cost_unweighted(path.as_deref());
            (visited, path, cost)
        }
        Algorithm::IndexedDijkstra => {
            let visited = graph
                .dijkstra_reach(start_idx)
                .map(|(node, _, _)| node)
                .collect::<Vec<_>>();
            let result = graph.dijkstra(start_idx, |node| node == goal_idx);
            match result {
                Some((path, cost)) => (visited, Some(path), Some(cost)),
                None => (visited, None, None),
            }
        }
        Algorithm::IndexedAstar => {
            let result = graph.astar(
                start_idx,
                |node| heuristic(problem.width, node, goal_idx),
                |node| node == goal_idx,
            );
            match result {
                Some((path, cost)) => (path.clone(), Some(path), Some(cost)),
                None => (vec![start_idx], None, None),
            }
        }
        _ => return Err("Unsupported indexed algorithm".into()),
    };
    let elapsed_ms = now_ms() - t0;

    let visited_points = dedupe_indices(visited_indices)
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

pub(crate) fn solve_multi_problem(problem: &MultiGoalProblem) -> Result<MultiSolveResult, String> {
    let graph = build_graph(problem.width, problem.height, &problem.cells);
    let start_idx = to_idx(problem.width, problem.start);
    let goal_indices = problem
        .goals
        .iter()
        .map(|goal| to_idx(problem.width, *goal))
        .collect::<Vec<_>>();

    let t0 = now_ms();
    let mut visited_indices = Vec::<usize>::new();
    let mut results = Vec::<ExitResult>::with_capacity(goal_indices.len());
    let mut best_goal_index = None;
    let mut best_cost = None;
    let mut reachable_goals_count = 0u32;

    match problem.algorithm {
        Algorithm::IndexedDijkstra => {
            visited_indices.extend(graph.dijkstra_reach(start_idx).map(|(node, _, _)| node));
            let parents = graph.dijkstra_all(start_idx);

            for (i, (goal_point, goal_idx)) in problem
                .goals
                .iter()
                .copied()
                .zip(goal_indices.iter().copied())
                .enumerate()
            {
                let (found, path, path_cost) = solve_dijkstra_goal(
                    problem.width,
                    problem.start,
                    start_idx,
                    goal_idx,
                    &parents,
                );
                if found {
                    reachable_goals_count += 1;
                    if best_cost.is_none_or(|current| path_cost.unwrap_or(u32::MAX) < current) {
                        best_cost = path_cost;
                        best_goal_index = Some(i as u32);
                    }
                }

                results.push(ExitResult {
                    goal: goal_point,
                    found,
                    path,
                    path_cost,
                });
            }
        }
        Algorithm::IndexedBfs | Algorithm::IndexedDfs | Algorithm::IndexedAstar => {
            for (i, (goal_point, goal_idx)) in problem
                .goals
                .iter()
                .copied()
                .zip(goal_indices.iter().copied())
                .enumerate()
            {
                let (trace, path, path_cost) = solve_one_goal(
                    problem.width,
                    &graph,
                    problem.algorithm,
                    start_idx,
                    goal_idx,
                );
                visited_indices.extend(trace);
                let found = !path.is_empty();

                if found {
                    reachable_goals_count += 1;
                    if best_cost.is_none_or(|current| path_cost.unwrap_or(u32::MAX) < current) {
                        best_cost = path_cost;
                        best_goal_index = Some(i as u32);
                    }
                }

                results.push(ExitResult {
                    goal: goal_point,
                    found,
                    path,
                    path_cost,
                });
            }
        }
        _ => return Err("Unsupported indexed algorithm".into()),
    }

    let elapsed_ms = now_ms() - t0;
    let visited = dedupe_indices(visited_indices)
        .into_iter()
        .map(|idx| from_idx(problem.width, idx))
        .collect::<Vec<_>>();

    Ok(MultiSolveResult {
        algorithm: problem.algorithm,
        elapsed_ms,
        visited_count: visited.len() as u32,
        visited,
        goals_count: goal_indices.len() as u32,
        reachable_goals_count,
        best_goal_index,
        results,
    })
}

fn build_graph(width: u32, height: u32, cells: &[Cell]) -> WeightedGraph {
    let mut adjacency = vec![Vec::new(); cells.len()];

    for idx in 0..cells.len() {
        if cells[idx].wall {
            continue;
        }

        for neighbor in neighbors_4(width, height, idx) {
            let Some(next_idx) = neighbor else { continue };
            let next_cell = cells[next_idx];
            if next_cell.wall {
                continue;
            }
            adjacency[idx].push((next_idx, next_cell.weight.max(1)));
        }
    }

    IndexedGraph::from_adjacency(adjacency)
}

fn solve_one_goal(
    width: u32,
    graph: &WeightedGraph,
    algorithm: Algorithm,
    start_idx: usize,
    goal_idx: usize,
) -> (Vec<usize>, Vec<Point>, Option<u32>) {
    match algorithm {
        Algorithm::IndexedBfs => {
            let path = graph.bfs(start_idx, |node| node == goal_idx);
            let trace = path.clone().unwrap_or_else(|| vec![start_idx]);
            let path_points = points_for_path(width, path.clone());
            (trace, path_points, path_cost_unweighted(path.as_deref()))
        }
        Algorithm::IndexedDfs => {
            let path = graph.dfs(start_idx, |node| node == goal_idx);
            let trace = path.clone().unwrap_or_else(|| vec![start_idx]);
            let path_points = points_for_path(width, path.clone());
            (trace, path_points, path_cost_unweighted(path.as_deref()))
        }
        Algorithm::IndexedAstar => {
            let result = graph.astar(
                start_idx,
                |node| heuristic(width, node, goal_idx),
                |node| node == goal_idx,
            );
            match result {
                Some((path, cost)) => {
                    let trace = path.clone();
                    let path_points = points_for_path(width, Some(path));
                    (trace, path_points, Some(cost))
                }
                None => (vec![start_idx], Vec::new(), None),
            }
        }
        _ => (Vec::new(), Vec::new(), None),
    }
}

fn solve_dijkstra_goal(
    width: u32,
    start: Point,
    start_idx: usize,
    goal_idx: usize,
    parents: &[Option<(usize, u32)>],
) -> (bool, Vec<Point>, Option<u32>) {
    if goal_idx == start_idx {
        return (true, vec![start], Some(0));
    }

    let Some((_, cost)) = parents.get(goal_idx).copied().flatten() else {
        return (false, Vec::new(), None);
    };

    let path = build_path_from_parents(start_idx, goal_idx, parents)
        .into_iter()
        .map(|idx| from_idx(width, idx))
        .collect::<Vec<_>>();

    (true, path, Some(cost))
}

fn build_path_from_parents(
    start_idx: usize,
    goal_idx: usize,
    parents: &[Option<(usize, u32)>],
) -> Vec<usize> {
    let mut path = vec![goal_idx];
    let mut current = goal_idx;

    while current != start_idx {
        let Some((parent, _)) = parents[current] else {
            return Vec::new();
        };
        current = parent;
        path.push(current);
    }

    path.reverse();
    path
}

fn points_for_path(width: u32, path: Option<Vec<usize>>) -> Vec<Point> {
    path.unwrap_or_default()
        .into_iter()
        .map(|idx| from_idx(width, idx))
        .collect()
}

fn path_cost_unweighted(path: Option<&[usize]>) -> Option<u32> {
    path.map(|nodes| nodes.len().saturating_sub(1) as u32)
}

fn dedupe_indices(indices: Vec<usize>) -> Vec<usize> {
    let mut seen = vec![false; indices.iter().copied().max().map_or(0, |max| max + 1)];
    let mut out = Vec::with_capacity(indices.len());
    for idx in indices {
        if let Some(entry) = seen.get_mut(idx) {
            if *entry {
                continue;
            }
            *entry = true;
        }
        out.push(idx);
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn empty_cells(width: u32, height: u32) -> Vec<Cell> {
        vec![
            Cell {
                wall: false,
                weight: 1,
            };
            (width * height) as usize
        ]
    }

    #[test]
    fn build_graph_skips_walls_and_uses_destination_weights() {
        let width = 3;
        let height = 2;
        let mut cells = empty_cells(width, height);
        cells[1] = Cell {
            wall: true,
            weight: 1,
        };
        cells[3] = Cell {
            wall: false,
            weight: 7,
        };

        let graph = build_graph(width, height, &cells);
        assert_eq!(graph.successors(0), &[(3, 7)]);
        assert_eq!(graph.successors(1), &[]);
    }

    #[test]
    fn indexed_bfs_finds_unweighted_path() {
        let problem = Problem {
            width: 3,
            height: 3,
            cells: empty_cells(3, 3),
            start: Point { x: 0, y: 0 },
            goal: Point { x: 2, y: 2 },
            algorithm: Algorithm::IndexedBfs,
            k: None,
        };

        let result = solve_problem(&problem).expect("indexed bfs result");
        assert!(result.found);
        assert_eq!(result.path.first(), Some(&Point { x: 0, y: 0 }));
        assert_eq!(result.path.last(), Some(&Point { x: 2, y: 2 }));
        assert_eq!(result.path_cost, Some(4));
        assert!(result.visited_count >= result.path.len() as u32);
    }

    #[test]
    fn indexed_dijkstra_respects_weights() {
        let mut cells = empty_cells(3, 2);
        cells[1].weight = 9;
        cells[4].weight = 2;

        let problem = Problem {
            width: 3,
            height: 2,
            cells,
            start: Point { x: 0, y: 0 },
            goal: Point { x: 2, y: 0 },
            algorithm: Algorithm::IndexedDijkstra,
            k: None,
        };

        let result = solve_problem(&problem).expect("indexed dijkstra result");
        assert!(result.found);
        assert_eq!(result.path_cost, Some(5));
        assert_eq!(result.path.last(), Some(&Point { x: 2, y: 0 }));
    }

    #[test]
    fn indexed_multi_dijkstra_picks_best_exit() {
        let mut cells = empty_cells(4, 2);
        cells[1].weight = 5;
        cells[2].weight = 5;

        let problem = MultiGoalProblem {
            width: 4,
            height: 2,
            cells,
            start: Point { x: 0, y: 0 },
            goals: vec![Point { x: 3, y: 0 }, Point { x: 0, y: 1 }],
            algorithm: Algorithm::IndexedDijkstra,
            k: None,
        };

        let result = solve_multi_problem(&problem).expect("indexed multi dijkstra result");
        assert_eq!(result.reachable_goals_count, 2);
        assert_eq!(result.best_goal_index, Some(1));
        assert_eq!(result.results[1].path_cost, Some(1));
    }
}
