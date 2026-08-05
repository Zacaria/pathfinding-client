# pathfinding-demo Specification

## Purpose
Define the browser demo that visualizes pathfinding algorithms through a React interface backed by a Rust WebAssembly engine.
## Requirements
### Requirement: Web Pathfinding Demo App
The system SHALL provide a web application with a React UI (using shadcn/ui) and a Rust WebAssembly engine that uses the published `pathfinding` and `pathfinding-indexed` crates for algorithm execution.

#### Scenario: App loads in browser
- **WHEN** the user builds and runs the web app
- **THEN** a pathfinding demo UI is displayed

### Requirement: Rust Engine Integration
The system SHALL run pathfinding algorithms in Rust (compiled to WebAssembly) and return a deterministic trace suitable for step-by-step visualization in the UI.

#### Scenario: UI runs an algorithm via WASM
- **WHEN** the user starts a run from the UI
- **THEN** the UI calls the WASM engine and receives a trace and metrics for playback and display

### Requirement: Grid Editing and Problem Setup
The system SHALL allow users to create and edit a grid with walls, weighted cells, a single start, and a single goal.

#### Scenario: User defines start and goal
- **WHEN** the user selects the start or goal tool and clicks a cell
- **THEN** the grid updates to reflect the new start or goal position

### Requirement: Algorithm Selection and Execution
The system SHALL let users select BFS, DFS, Dijkstra, or A* and execute the chosen algorithm against the current grid.

#### Scenario: User runs a selected algorithm
- **WHEN** an algorithm is selected and the user initiates a run
- **THEN** the system runs the corresponding pathfinding algorithm through the Rust WebAssembly engine

### Requirement: Step-by-Step Visualization
The system SHALL animate the search step-by-step using the exploration order and then highlight the final path when one exists.

#### Scenario: Playback of exploration and path
- **WHEN** a run completes
- **THEN** the UI animates explored nodes in order and finishes by showing the path or a no-path result

### Requirement: Metrics Display
The system SHALL display algorithm execution time and path metrics for each run.

#### Scenario: Metrics after execution
- **WHEN** the algorithm finishes
- **THEN** the UI shows elapsed time and path length or a no-path indicator

### Requirement: Randomized Cases
The system SHALL generate random grids with walls and weighted cells.

#### Scenario: Generate a random case
- **WHEN** the user triggers random generation
- **THEN** the grid is populated with randomized walls and weighted cells

### Requirement: Scrolling Multi-Exit Mode
The system SHALL provide a “Scrolling Multi‑Exit” problem mode where the terrain scrolls continuously and paths to multiple exits are recomputed at each scroll tick.

#### Scenario: User opens the scrolling mode
- **WHEN** the user switches to the “Scrolling Multi‑Exit” tab
- **THEN** the UI displays a scrolling terrain viewport, an algorithm selector, and simulation controls

#### Scenario: Terrain scrolls deterministically
- **GIVEN** a fixed random seed and scroll settings
- **WHEN** the simulation runs for N ticks
- **THEN** the generated terrain sequence is deterministic for the same seed and settings

### Requirement: User-Defined Start With Forced Free Cell
The system SHALL use a user-defined start cell (selected like the existing grid mode) and MUST keep that start cell free of walls throughout the scrolling simulation.

#### Scenario: Start remains navigable
- **GIVEN** a user-selected start cell
- **WHEN** the terrain scrolls
- **THEN** the cell at the start position remains a non-wall cell

### Requirement: Exit Edge Goals
The system SHALL treat every non-wall cell on the configured exit edge as a goal (“exit”) and recompute paths from the start to all exits at each tick.

#### Scenario: Exits update as terrain scrolls
- **WHEN** the terrain scrolls by one tick
- **THEN** the set of exits is recalculated from the exit edge’s non-wall cells

### Requirement: All Algorithms Runnable In Scrolling Mode
The system SHALL allow the user to run any supported pathfinding algorithm in the “Scrolling Multi‑Exit” mode.

#### Scenario: User switches algorithms during simulation
- **GIVEN** the simulation is running
- **WHEN** the user selects a different algorithm
- **THEN** subsequent ticks recompute paths to exits using the newly selected algorithm

### Requirement: Multi-Exit Visualization
The system SHALL visualize all computed paths to exits for the current tick and SHALL highlight the best (lowest-cost) exit path when at least one exit is reachable.

#### Scenario: Multiple exit paths are shown
- **GIVEN** there are multiple reachable exits on the exit edge
- **WHEN** a tick completes
- **THEN** the UI displays a path overlay for each reachable exit and highlights the best path

### Requirement: Multi-Exit Timing Metrics
The system SHALL display per-tick timing metrics and a rolling average to facilitate comparing single-source algorithms against per-exit approaches in the scrolling multi-exit scenario.

#### Scenario: Timing metrics are shown per tick
- **WHEN** a tick completes
- **THEN** the UI displays the computation time for that tick and a rolling average over recent ticks

### Requirement: Configurable Scroll Direction
The system SHALL allow configuring the terrain scroll direction. At minimum, it MUST support right-to-left scrolling. Optionally, it MAY support vertical scrolling (top-to-bottom).

#### Scenario: Right-to-left scrolling
- **WHEN** the user selects right-to-left scrolling and starts the simulation
- **THEN** the terrain shifts left each tick and new terrain appears on the right edge

#### Scenario: Top-to-bottom scrolling (optional)
- **WHEN** the user selects top-to-bottom scrolling and starts the simulation
- **THEN** the terrain shifts downward each tick and new terrain appears on the top edge
