## ADDED Requirements
### Requirement: Web Pathfinding Demo App
The system SHALL provide a web application with a React UI (using shadcn/ui) and a Rust WebAssembly engine that uses the local `../pathfinding` crate for algorithm execution.

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
- **THEN** the system runs the corresponding pathfinding algorithm using the local library

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
