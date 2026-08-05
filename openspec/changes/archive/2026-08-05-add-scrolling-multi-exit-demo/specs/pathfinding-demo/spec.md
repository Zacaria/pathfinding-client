## ADDED Requirements

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
