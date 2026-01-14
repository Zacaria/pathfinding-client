## 1. Project Scaffolding
- [x] 1.1 Create a Rust workspace with a WASM “engine” crate
- [x] 1.2 Add a path dependency on `../pathfinding` from the engine crate
- [x] 1.3 Create a Vite React app and initialize shadcn/ui + Tailwind
- [x] 1.4 Document local dev commands (build/serve)

## 2. Core Domain + Algorithms
- [x] 2.1 Implement the grid model with cell states, weights, start/goal
- [x] 2.2 Build adapters for BFS, DFS, Dijkstra, and A* that capture exploration order and final path
- [x] 2.3 Expose a WASM API returning a trace + metrics (serde-friendly)
- [x] 2.4 Capture timing and metrics for each run in Rust

## 3. UI + Interaction
- [x] 3.1 Render the grid and implement editing tools (walls, weights, start, goal)
- [x] 3.2 Add controls for algorithm selection, run/reset, random generation, and playback (play/pause/step/reset)
- [x] 3.3 Wire the UI to call the WASM engine and render results (visited + path)
- [x] 3.4 Implement step-by-step playback over recorded steps

## 4. Styling + Responsiveness
- [x] 4.1 Create a cohesive shadcn/ui-based theme (typography, colors, layout)
- [x] 4.2 Ensure the UI adapts for desktop and mobile sizes

## 5. Validation
- [x] 5.1 Run `cargo fmt` and `cargo check`
- [ ] 5.2 Manually verify `wasm-pack build` and `npm run dev` render and animations work
