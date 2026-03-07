## 1. Spec + Design
- [ ] 1.1 Define the “Scrolling Multi‑Exit” mode requirements and scenarios in `openspec/changes/add-scrolling-multi-exit-demo/specs/pathfinding-demo/spec.md`.
- [ ] 1.2 Add a lightweight design note describing the scrolling model, exits definition, and per-tick recomputation strategy.

## 2. Engine Support (Rust/WASM)
- [ ] 2.1 Add a new engine API to solve **one start → many goals** and return per-goal results (paths + costs + visited trace + metrics).
- [ ] 2.2 Implement Dijkstra multi-goal solving efficiently (single SSSP run + build paths for all exits).
- [ ] 2.3 Implement fallbacks for other algorithms (likely one run per exit), with safety caps and clear error messages when computation is too slow.

## 3. UI: New Tab + Simulation Loop
- [ ] 3.1 Add a new “Scrolling Multi‑Exit” tab next to the existing grid editor/run UI.
- [ ] 3.2 Implement deterministic terrain scrolling:
  - shift existing cells
  - generate new incoming column/row each tick
  - ensure the start cell remains free
- [ ] 3.3 Identify exits as all free cells on the configured exit edge each tick.
- [ ] 3.4 Recompute and render all exit paths each tick; highlight the best path.
- [ ] 3.5 Add controls: run/pause, tick rate, direction, random seed/reset, algorithm selector, and optional limits (max exits displayed).
- [ ] 3.6 Display performance metrics (ms/tick + rolling average) per algorithm.

## 4. Validation
- [ ] 4.1 `just dev` runs and the scrolling mode renders correctly in the browser.
- [ ] 4.2 Smoke test: each algorithm runs at least once in scrolling mode on a small grid without freezing.
- [ ] 4.3 `just release` succeeds.
