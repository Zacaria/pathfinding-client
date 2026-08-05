## Why
The current demo focuses on a single start and a single goal. That makes it hard to showcase algorithms designed for efficient **single-source shortest paths** when there are **many candidate goals** and the world changes frequently.

This change adds a new “Scrolling Multi‑Exit” problem mode to demonstrate the strengths of single-source shortest path algorithms in a more “game-like” scenario:
- one player start position
- multiple exits (goals) along an edge
- frequent replanning as the terrain scrolls
- side-by-side algorithm comparison and timing

## What Changes
- Add a new problem mode (separate UI tab) where the terrain continuously scrolls and new terrain is generated each tick.
- Treat **every free cell on the exit edge** as a goal (“exits”) and recompute paths from the start to all exits each tick.
- Allow running **any supported algorithm** in this mode, while highlighting the advantage of single-source algorithms (e.g., Dijkstra) for multi-goal replanning.
- Add controls for scroll speed, direction (horizontal, and optionally vertical), and deterministic random generation.

## User Experience Summary
- User edits a grid (as today) to define start/walls/weights.
- User switches to the “Scrolling Multi‑Exit” tab.
- User starts the simulation; the map scrolls continuously and paths to all exits update each tick.
- UI overlays all exit paths simultaneously, highlights the best exit path, and displays per-tick timing (plus a rolling average).

## Impact / Risks
- Performance risk: running “single-target” algorithms (e.g., A*) for *every* exit each tick can be expensive for tall grids. The minimal approach will include guardrails (caps/controls) to keep the UI responsive.
- Complexity risk: supporting multiple scroll directions is easiest if the terrain shift is abstracted into a direction-aware transform rather than duplicating logic.

## Out of Scope (for initial implementation)
- Advanced visualization features (heatmaps, per-node wavefront animation per tick, multi-path color palettes beyond basic highlighting).
- Persisting or exporting runs.
