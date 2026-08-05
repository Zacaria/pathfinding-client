# Change: Add React + shadcn/ui Pathfinding Demo (Rust WASM Engine)

## Why
We need a browser-based demo that consumes the local `../pathfinding` crate and showcases the core algorithms with step-by-step visualization, metrics, and scenario setup, while using a sleek, standard shadcn/ui interface.

## What Changes
- Create a Rust “engine” crate compiled to WebAssembly that depends on `../pathfinding`
- Create a React (Vite) web app that uses shadcn/ui for the UI and calls into the WASM engine
- Build a grid-based editor with walls, weighted cells, and user-defined start/goal
- Add algorithm selection (BFS, DFS, Dijkstra, A*) with step-by-step animation
- Show timing and path metrics for each run
- Provide random case generation and a sleek, responsive UI

## Impact
- Affected specs: `specs/pathfinding-demo/spec.md`
- Affected code: new Rust WASM engine, new React/shadcn web app, and algorithm adapters
