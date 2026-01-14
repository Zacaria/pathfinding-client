import { useEffect, useMemo, useRef, useState } from "react";
import {
  Flag,
  LocateFixed,
  Pause,
  Play,
  RefreshCw,
  Shuffle,
  Sigma,
  Square,
  Wand2,
} from "lucide-react";

import { loadEngine } from "@/engine";
import type { Algorithm, Cell, Point, Problem, SolveResult } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type Tool = "wall" | "erase" | "weight" | "start" | "goal";

function toIdx(width: number, p: Point) {
  return p.y * width + p.x;
}

function fromIdx(width: number, idx: number): Point {
  return { x: idx % width, y: Math.floor(idx / width) };
}

function emptyCells(width: number, height: number): Cell[] {
  return Array.from({ length: width * height }, () => ({ wall: false, weight: 1 }));
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const stored = localStorage.getItem("pf-demo-theme");
    return stored ? stored === "dark" : window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("pf-demo-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const [width, setWidth] = useState(30);
  const [height, setHeight] = useState(20);
  const [cells, setCells] = useState<Cell[]>(() => emptyCells(30, 20));
  const [start, setStart] = useState<Point>({ x: 2, y: 2 });
  const [goal, setGoal] = useState<Point>({ x: 27, y: 17 });

  const [tool, setTool] = useState<Tool>("wall");
  const [paintWeight, setPaintWeight] = useState(5);

  const [algorithm, setAlgorithm] = useState<Algorithm>("astar");
  const [yenK, setYenK] = useState(3);
  const [solveResult, setSolveResult] = useState<SolveResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [visitedTrace, setVisitedTrace] = useState<number[]>([]);
  const [pathTrace, setPathTrace] = useState<number[]>([]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [stepsPerSecond, setStepsPerSecond] = useState(80);
  const [visitedShown, setVisitedShown] = useState(0);
  const [pathShown, setPathShown] = useState(0);

  const [wallProbability, setWallProbability] = useState(0.22);
  const [weightedProbability, setWeightedProbability] = useState(0.25);
  const [maxWeight, setMaxWeight] = useState(9);

  const pointerDownRef = useRef(false);

  const startIdx = useMemo(() => toIdx(width, start), [start, width]);
  const goalIdx = useMemo(() => toIdx(width, goal), [goal, width]);

  const visibleVisited = useMemo(
    () => new Set(visitedTrace.slice(0, visitedShown)),
    [visitedShown, visitedTrace],
  );

  const visiblePath = useMemo(
    () => new Set(pathTrace.slice(0, pathShown)),
    [pathShown, pathTrace],
  );

  useEffect(() => {
    if (!isPlaying) return;
    if (visitedShown >= visitedTrace.length && pathShown >= pathTrace.length) return;

    const intervalMs = Math.max(5, Math.round(1000 / stepsPerSecond));
    const t = window.setInterval(() => {
      setVisitedShown((prev) => {
        if (prev < visitedTrace.length) return prev + 1;
        return prev;
      });
      setPathShown((prev) => {
        if (visitedShown + 1 < visitedTrace.length) return prev;
        if (prev < pathTrace.length) return prev + 1;
        return prev;
      });
    }, intervalMs);
    return () => window.clearInterval(t);
  }, [isPlaying, pathTrace.length, pathShown, stepsPerSecond, visitedShown, visitedTrace.length]);

  useEffect(() => {
    if (visitedShown >= visitedTrace.length && pathShown >= pathTrace.length) {
      setIsPlaying(false);
    }
  }, [pathShown, pathTrace.length, visitedShown, visitedTrace.length]);

  function resetPlayback() {
    setVisitedShown(0);
    setPathShown(0);
    setIsPlaying(false);
  }

  function setCellAt(idx: number, next: Cell) {
    setCells((prev) => {
      const copy = prev.slice();
      copy[idx] = next;
      return copy;
    });
  }

  function applyTool(idx: number) {
    const p = fromIdx(width, idx);
    const current = cells[idx];
    if (!current) return;

    if (tool === "start") {
      if (!current.wall) setStart(p);
      return;
    }
    if (tool === "goal") {
      if (!current.wall) setGoal(p);
      return;
    }
    if (idx === startIdx || idx === goalIdx) return;

    if (tool === "wall") {
      setCellAt(idx, { wall: true, weight: 1 });
      return;
    }
    if (tool === "erase") {
      setCellAt(idx, { wall: false, weight: 1 });
      return;
    }
    if (tool === "weight") {
      setCellAt(idx, { wall: false, weight: clamp(paintWeight, 2, 99) });
    }
  }

  async function runSolve() {
    setError(null);
    setSolveResult(null);
    resetPlayback();
    try {
      const engine = await loadEngine();
      const problem: Problem = {
        width,
        height,
        cells,
        start,
        goal,
        algorithm,
        k: algorithm === "yen" ? yenK : undefined,
      };
      const result = engine.solve(problem);
      setSolveResult(result);
      setVisitedTrace(result.visited.map((p) => toIdx(width, p)));
      setPathTrace(result.path.map((p) => toIdx(width, p)));
      setVisitedShown(0);
      setPathShown(0);
      setIsPlaying(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Failed to load/execute WASM engine. Build it with `npm run build:wasm` first.",
      );
    }
  }

  async function randomize() {
    setError(null);
    setSolveResult(null);
    resetPlayback();
    try {
      const engine = await loadEngine();
      const seed = Date.now();
      const p = engine.generate_random({
        width,
        height,
        wall_probability: wallProbability,
        weighted_probability: weightedProbability,
        max_weight: maxWeight,
        seed,
      });
      setCells(p.cells);
      setStart(p.start);
      setGoal(p.goal);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Failed to load WASM engine. Build it with `npm run build:wasm` first.",
      );
    }
  }

  function resetGrid() {
    setError(null);
    setSolveResult(null);
    resetPlayback();
    setCells(emptyCells(width, height));
  }

  function resizeGrid(nextWidth: number, nextHeight: number) {
    const w = clamp(nextWidth, 8, 80);
    const h = clamp(nextHeight, 8, 60);
    setWidth(w);
    setHeight(h);
    setCells(emptyCells(w, h));
    setStart({ x: 1, y: 1 });
    setGoal({ x: w - 2, y: h - 2 });
    setSolveResult(null);
    resetPlayback();
  }

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 p-4">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold tracking-tight">
              Pathfinding Demo{" "}
              <span className="text-muted-foreground">(Rust WASM + shadcn/ui)</span>
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary">BFS</Badge>
              <Badge variant="secondary">Bi-BFS</Badge>
              <Badge variant="secondary">DFS</Badge>
              <Badge variant="secondary">IDDFS</Badge>
              <Badge variant="secondary">Dijkstra</Badge>
              <Badge variant="secondary">BMSSP</Badge>
              <Badge variant="secondary">A*</Badge>
              <Badge variant="secondary">Fringe</Badge>
              <Badge variant="secondary">IDA*</Badge>
              <Badge variant="secondary">Yen</Badge>
              <span className="hidden sm:inline">·</span>
              <span>Click/drag to edit. Run to animate.</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="theme" className="text-sm text-muted-foreground">
                Dark
              </Label>
              <Switch
                id="theme"
                checked={darkMode}
                onCheckedChange={(v) => setDarkMode(Boolean(v))}
              />
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
          <aside className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Run</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <Label>Algorithm</Label>
                  <Select value={algorithm} onValueChange={(v) => setAlgorithm(v as Algorithm)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an algorithm" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bfs">BFS</SelectItem>
                      <SelectItem value="bfs_bidirectional">Bidirectional BFS</SelectItem>
                      <SelectItem value="dfs">DFS</SelectItem>
                      <SelectItem value="iddfs">IDDFS</SelectItem>
                      <SelectItem value="dijkstra">Dijkstra</SelectItem>
                      <SelectItem value="bmssp">BMSSP</SelectItem>
                      <SelectItem value="astar">A*</SelectItem>
                      <SelectItem value="fringe">Fringe</SelectItem>
                      <SelectItem value="idastar">IDA*</SelectItem>
                      <SelectItem value="yen">Yen (k-shortest)</SelectItem>
                    </SelectContent>
                  </Select>
                  {algorithm === "yen" ? (
                    <div className="mt-2 grid gap-2">
                      <div className="flex items-center justify-between">
                        <Label>k</Label>
                        <span className="text-xs text-muted-foreground">{yenK}</span>
                      </div>
                      <Slider
                        value={[yenK]}
                        min={1}
                        max={20}
                        step={1}
                        onValueChange={(v) => setYenK(v[0] ?? 3)}
                      />
                      <div className="text-xs text-muted-foreground">
                        Returns the best path; higher k explores more alternatives.
                      </div>
                    </div>
                  ) : null}
                  {algorithm === "bfs" ||
                  algorithm === "bfs_bidirectional" ||
                  algorithm === "dfs" ||
                  algorithm === "iddfs" ? (
                    <div className="text-xs text-muted-foreground">
                      This algorithm ignores weights (treats all costs as 1).
                    </div>
                  ) : null}
                  {algorithm === "iddfs" || algorithm === "idastar" ? (
                    <div className="text-xs text-muted-foreground">
                      Tip: start with a smaller grid; this algorithm can be very slow.
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={runSolve}>
                    <Play className="h-4 w-4" />
                    Run
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setIsPlaying((v) => !v)}
                    disabled={visitedTrace.length === 0 && pathTrace.length === 0}
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    {isPlaying ? "Pause" : "Play"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (visitedShown < visitedTrace.length) setVisitedShown((v) => v + 1);
                      else if (pathShown < pathTrace.length) setPathShown((v) => v + 1);
                    }}
                    disabled={
                      visitedShown >= visitedTrace.length && pathShown >= pathTrace.length
                    }
                  >
                    Step
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      resetPlayback();
                      setVisitedShown(0);
                      setPathShown(0);
                    }}
                    disabled={visitedTrace.length === 0 && pathTrace.length === 0}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reset
                  </Button>
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label>Speed</Label>
                    <span className="text-xs text-muted-foreground">{stepsPerSecond} steps/s</span>
                  </div>
                  <Slider
                    value={[stepsPerSecond]}
                    min={10}
                    max={240}
                    step={5}
                    onValueChange={(v) => setStepsPerSecond(v[0] ?? 80)}
                  />
                </div>

                {error ? (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Edit</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <Label>Tool</Label>
                  <ToggleGroup
                    type="single"
                    value={tool}
                    onValueChange={(v) => v && setTool(v as Tool)}
                    className="flex flex-wrap gap-2"
                  >
                    <ToggleGroupItem value="wall">
                      <Square className="h-4 w-4" />
                      Wall
                    </ToggleGroupItem>
                    <ToggleGroupItem value="erase">
                      <Wand2 className="h-4 w-4" />
                      Erase
                    </ToggleGroupItem>
                    <ToggleGroupItem value="weight">
                      <Sigma className="h-4 w-4" />
                      Weight
                    </ToggleGroupItem>
                    <ToggleGroupItem value="start">
                      <LocateFixed className="h-4 w-4" />
                      Start
                    </ToggleGroupItem>
                    <ToggleGroupItem value="goal">
                      <Flag className="h-4 w-4" />
                      Goal
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label>Paint weight</Label>
                    <span className="text-xs text-muted-foreground">{paintWeight}</span>
                  </div>
                  <Slider
                    value={[paintWeight]}
                    min={2}
                    max={maxWeight}
                    step={1}
                    onValueChange={(v) => setPaintWeight(v[0] ?? 5)}
                    disabled={tool !== "weight"}
                  />
                </div>

                <Separator />

                <div className="grid gap-3">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={randomize}>
                      <Shuffle className="h-4 w-4" />
                      Random
                    </Button>
                    <Button variant="outline" onClick={resetGrid}>
                      <Wand2 className="h-4 w-4" />
                      Clear
                    </Button>
                  </div>

                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label>Walls</Label>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(wallProbability * 100)}%
                      </span>
                    </div>
                    <Slider
                      value={[Math.round(wallProbability * 100)]}
                      min={0}
                      max={60}
                      step={1}
                      onValueChange={(v) => setWallProbability((v[0] ?? 22) / 100)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label>Weights</Label>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(weightedProbability * 100)}%
                      </span>
                    </div>
                    <Slider
                      value={[Math.round(weightedProbability * 100)]}
                      min={0}
                      max={70}
                      step={1}
                      onValueChange={(v) => setWeightedProbability((v[0] ?? 25) / 100)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label>Max weight</Label>
                      <span className="text-xs text-muted-foreground">{maxWeight}</span>
                    </div>
                    <Slider
                      value={[maxWeight]}
                      min={2}
                      max={30}
                      step={1}
                      onValueChange={(v) => setMaxWeight(v[0] ?? 9)}
                    />
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-2">
                      <Label>Width</Label>
                      <Slider
                        value={[width]}
                        min={8}
                        max={80}
                        step={1}
                        onValueChange={(v) => resizeGrid(v[0] ?? width, height)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Height</Label>
                      <Slider
                        value={[height]}
                        min={8}
                        max={60}
                        step={1}
                        onValueChange={(v) => resizeGrid(width, v[0] ?? height)}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Metrics</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Result</span>
                  <span>
                    {solveResult ? (solveResult.found ? "Path found" : "No path") : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Time</span>
                  <span>{solveResult ? `${solveResult.elapsed_ms.toFixed(2)} ms` : "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Visited</span>
                  <span>{solveResult ? solveResult.visited_count : "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Path length</span>
                  <span>{solveResult ? solveResult.path.length : "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Cost</span>
                  <span>
                    {solveResult
                      ? solveResult.path_cost ?? (solveResult.path.length ? solveResult.path.length - 1 : 0)
                      : "—"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </aside>

          <main>
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Grid</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="overflow-auto rounded-md border bg-muted/30 p-2"
                  onPointerUp={() => (pointerDownRef.current = false)}
                  onPointerLeave={() => (pointerDownRef.current = false)}
                >
                  <div
                    className="grid select-none"
                    style={{
                      gridTemplateColumns: `repeat(${width}, minmax(0, 24px))`,
                      gap: "2px",
                    }}
                  >
                    {cells.map((cell, idx) => {
                      const isStart = idx === startIdx;
                      const isGoal = idx === goalIdx;
                      const isWall = cell.wall;
                      const isWeighted = !cell.wall && cell.weight > 1;
                      const isVisited = visibleVisited.has(idx);
                      const isPath = visiblePath.has(idx);

                      const base =
                        "relative flex h-6 w-6 items-center justify-center rounded-[6px] text-[10px] font-medium transition-colors";

                      let cls = "bg-background text-foreground/70";
                      if (isWall) cls = "bg-foreground/80 text-background";
                      if (isWeighted) cls = "bg-secondary text-secondary-foreground";
                      if (isVisited) cls = "bg-blue-500/30 text-blue-950 dark:text-blue-50";
                      if (isPath) cls = "bg-emerald-500/60 text-emerald-950 dark:text-emerald-50";
                      if (isStart) cls = "bg-primary text-primary-foreground";
                      if (isGoal) cls = "bg-destructive text-destructive-foreground";

                      return (
                        <div
                          key={idx}
                          role="button"
                          tabIndex={0}
                          className={`${base} ${cls}`}
                          onPointerDown={() => {
                            pointerDownRef.current = true;
                            applyTool(idx);
                          }}
                          onPointerEnter={() => {
                            if (pointerDownRef.current) applyTool(idx);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") applyTool(idx);
                          }}
                        >
                          {isStart ? "S" : null}
                          {isGoal ? "G" : null}
                          {!isStart && !isGoal && isWeighted ? cell.weight : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </div>
  );
}
