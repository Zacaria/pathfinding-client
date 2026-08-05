## Context
This repo currently only contains OpenSpec metadata. The requested change introduces a new web demo with:
- A Rust “engine” compiled to WebAssembly that consumes the local `../pathfinding` crate
- A React UI using shadcn/ui for a sleek, standard interface

## Goals / Non-Goals
- Goals:
  - Web-only demo with step-by-step visualization of BFS, DFS, Dijkstra, A*
  - Grid editor with walls, weights, start, goal
  - Random case generation and metrics (time, steps, path length)
  - Clean, sleek shadcn/ui-based interface that is responsive for desktop and mobile
- Non-Goals:
  - Backend services, persistence, or multi-user features
  - Exhaustive algorithm catalog beyond the four specified
  - High-performance rendering for massive grids

## Decisions
- Create a Rust “engine” crate compiled to WASM and add a path dependency to `../pathfinding`.
- Create a React (Vite) app using shadcn/ui (Tailwind + Radix primitives) for UI components.
- Represent the problem as a 2D grid with cell states: empty, wall, weighted (cost value), start, goal.
- Use the `pathfinding` crate algorithms directly and capture exploration order by instrumenting the `successors` closure for each run; store the exploration list and final path for animation playback.
- Measure algorithm execution time around the library call with `Instant`, then animate the recorded steps on a separate UI timer so animation speed does not affect timing.
- Expose a minimal WASM API (via `wasm-bindgen`) that accepts the grid + start/goal + algorithm selection and returns a trace (visited order, final path, and metrics).
- Drive playback in React with a simple interval-driven loop for step-by-step animation; keep the default implementation minimal.
- Use a structured layout with a control panel, metrics panel, and main grid; use shadcn/ui components + Tailwind tokens for a cohesive look.

## Alternatives Considered
- Reimplementing algorithms to yield step-by-step states. Rejected: must demonstrate usage of the library.
- Real-time algorithm execution with async stepping. Rejected: adds complexity and risks UI jitter; precomputed steps are simpler.

## Risks / Trade-offs
- Precomputed step lists may not perfectly reflect internal algorithm behavior for all cases; mitigate by documenting that steps reflect expansion order.
- Large grids can produce long step lists; mitigate with grid size limits and a maximum animation duration.

## Migration Plan
- Add the new Rust WASM engine + React app and update documentation with run instructions.
- No existing code is modified, so rollback is removing the new app.

## Open Questions
- Default grid size and randomization parameters (density and weight range).
