## Overview
Add a new “Scrolling Multi‑Exit” problem mode (new UI tab) where the map scrolls continuously and every free cell on one edge is treated as a goal (an “exit”). Each tick, the system recomputes paths from a single user-defined start to all exits and renders them.

The mode is intended to highlight why single-source shortest-path algorithms are attractive for repeated multi-goal replanning: one computation can be reused to derive best paths to many exits.

## Scrolling Model
The grid is a fixed-size viewport `(width × height)` that updates each “tick”.

### Direction
Support at least horizontal scrolling; to enable “top → bottom” later without duplication, represent scroll direction as an enum:
- `RightToLeft` (default requested)
- `LeftToRight`
- `TopToBottom` (optional extension requested)
- `BottomToTop` (optional extension)

Direction determines:
- which edge is **incoming** (new terrain generated each tick)
- which edge is **exit** (goals located there)
- how cells are shifted (x±1 or y±1)

### Terrain generation per tick (minimal)
- Shift the entire cell array by 1 in the scroll direction.
- Generate a new incoming column/row of cells using a seeded RNG (walls + optional weights).
- Force the start cell to remain free (never a wall).

## Exits (Goals)
At each tick:
- Exits = every non-wall cell on the configured exit edge.
  - Example (RightToLeft): exit edge is the **rightmost column**.
- The UI overlays paths to all exits and highlights the currently best (lowest cost) exit.

## Multi-Goal Solving Strategy
### Dijkstra (primary)
Run one Dijkstra single-source shortest paths computation, then build paths for each exit:
- `parents = dijkstra_all(start, successors)`
- `path(exit) = build_path(exit, parents)`

This avoids doing `O(#exits)` separate searches.

### Other algorithms (fallback)
Many algorithms in the library return a single path to a single goal (or k-shortest to a single goal). For the demo, allow “all algorithms runnable” by:
- Running the algorithm once per exit
- Collecting per-exit path/cost
- Applying safety caps / rate limits and clear UI messaging when a configuration is too heavy

This keeps correctness straightforward and makes the comparison (single-source vs per-exit) visible in time-per-tick metrics.

## Rendering + Metrics
Per tick:
- Render all paths (low opacity) and the best path (higher emphasis).
- Display:
  - time per tick (ms)
  - rolling average (e.g., last 30 ticks)
  - number of exits this tick

## Performance Guardrails (minimal)
To keep the demo responsive:
- Provide a maximum tick rate (configurable).
- Provide an optional “max exits rendered” control (still compute all, but render only top-N cheapest to reduce visual clutter).
- Reject or warn for settings known to be extremely slow (e.g., very tall grids + per-exit A* every tick).
