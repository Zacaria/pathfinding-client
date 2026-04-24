import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  ExternalLink,
  Flag,
  Github,
  HelpCircle,
  LocateFixed,
  Package,
  Pause,
  Play,
  RefreshCw,
  Shuffle,
  Sigma,
  Square,
  Wand2,
} from "lucide-react";
import { Joyride, STATUS, type EventData, type Step } from "react-joyride";

import { loadEngine } from "@/engine";
import {
  ALGORITHM_BADGES,
  ALGORITHM_GROUPS,
  DEFAULT_ALGORITHM,
  getAlgorithmOption,
} from "@/algorithms";
import type {
  Algorithm,
  Cell,
  MultiGoalProblem,
  MultiSolveResult,
  Point,
  Problem,
  SolveResult,
} from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type Tool = "wall" | "erase" | "weight" | "start" | "goal";
type Mode = "grid" | "scrolling";
type ScrollDirection = "right_to_left" | "left_to_right" | "top_to_bottom" | "bottom_to_top";

const TOUR_STORAGE_KEY = "pf-demo-tour-seen-v1";

const RELATED_LINKS = [
  {
    label: "Source",
    href: "https://github.com/Zacaria/pathfinding-client",
    Icon: Github,
  },
  {
    label: "pathfinding crate",
    href: "https://crates.io/crates/pathfinding",
    Icon: Package,
  },
  {
    label: "pathfinding-indexed crate",
    href: "https://crates.io/crates/pathfinding-indexed",
    Icon: Package,
  },
  {
    label: "README",
    href: "https://github.com/Zacaria/pathfinding-client#readme",
    Icon: BookOpen,
  },
] as const;

const TOUR_STEPS: Step[] = [
  {
    target: "body",
    placement: "center",
    title: "Explore pathfinding",
    content:
      "This short tour shows where to choose a mode, set up a grid, run an algorithm, and read the results.",
  },
  {
    target: '[data-tour="mode"]',
    title: "Choose a mode",
    content:
      "Grid mode lets you paint a static problem. Scrolling mode continuously shifts terrain and recomputes paths to exits.",
  },
  {
    target: '[data-tour="algorithm"]',
    title: "Pick an algorithm",
    content:
      "Select the search strategy here. Some algorithms ignore weights, while weighted algorithms use each cell cost.",
  },
  {
    target: '[data-tour="run"]',
    title: "Run and replay",
    content:
      "Run computes the path, then playback controls animate visited cells and the final route.",
  },
  {
    target: '[data-tour="edit"]',
    title: "Shape the grid",
    content:
      "Use the edit tools to place walls, erase cells, add weights, or move the start and goal.",
  },
  {
    target: '[data-tour="grid"]',
    title: "Interact with cells",
    content:
      "Click or drag on the grid to apply the selected tool. The S and G cells mark the start and goal.",
  },
  {
    target: '[data-tour="metrics"]',
    title: "Compare results",
    content:
      "After each run, this bar shows whether a path was found, execution time, visited count, path length, and cost.",
  },
  {
    target: '[data-tour="random"]',
    title: "Try new cases",
    content:
      "Generate random grids and tune wall density, weight density, grid size, and maximum weight.",
  },
];

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

function exitsForDirection(
  direction: ScrollDirection,
  width: number,
  height: number,
  cells: Cell[],
): Point[] {
  const exits: Point[] = [];
  if (direction === "right_to_left") {
    const x = width - 1;
    for (let y = 0; y < height; y++) {
      const idx = y * width + x;
      if (!cells[idx]?.wall) exits.push({ x, y });
    }
    return exits;
  }
  if (direction === "left_to_right") {
    const x = 0;
    for (let y = 0; y < height; y++) {
      const idx = y * width + x;
      if (!cells[idx]?.wall) exits.push({ x, y });
    }
    return exits;
  }
  if (direction === "top_to_bottom") {
    const y = 0;
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (!cells[idx]?.wall) exits.push({ x, y });
    }
    return exits;
  }
  const y = height - 1;
  for (let x = 0; x < width; x++) {
    const idx = y * width + x;
    if (!cells[idx]?.wall) exits.push({ x, y });
  }
  return exits;
}

function shiftCells(
  direction: ScrollDirection,
  width: number,
  height: number,
  prev: Cell[],
  makeIncoming: () => Cell,
): Cell[] {
  const next = prev.slice();

  if (direction === "right_to_left") {
    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = 0; x < width - 1; x++) {
        next[row + x] = prev[row + x + 1] ?? { wall: false, weight: 1 };
      }
      next[row + (width - 1)] = makeIncoming();
    }
    return next;
  }

  if (direction === "left_to_right") {
    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = width - 1; x > 0; x--) {
        next[row + x] = prev[row + x - 1] ?? { wall: false, weight: 1 };
      }
      next[row + 0] = makeIncoming();
    }
    return next;
  }

  if (direction === "top_to_bottom") {
    for (let y = height - 1; y > 0; y--) {
      for (let x = 0; x < width; x++) {
        next[y * width + x] = prev[(y - 1) * width + x] ?? { wall: false, weight: 1 };
      }
    }
    for (let x = 0; x < width; x++) next[x] = makeIncoming();
    return next;
  }

  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width; x++) {
      next[y * width + x] = prev[(y + 1) * width + x] ?? { wall: false, weight: 1 };
    }
  }
  for (let x = 0; x < width; x++) next[(height - 1) * width + x] = makeIncoming();
  return next;
}

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const stored = localStorage.getItem("pf-demo-theme");
    return stored ? stored === "dark" : window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  });
  const [tourRun, setTourRun] = useState(false);
  const [tourInstance, setTourInstance] = useState(0);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("pf-demo-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    if (localStorage.getItem(TOUR_STORAGE_KEY) !== "done") {
      setTourRun(true);
    }
  }, []);

  const [width, setWidth] = useState(30);
  const [height, setHeight] = useState(20);
  const [cells, setCells] = useState<Cell[]>(() => emptyCells(30, 20));
  const [start, setStart] = useState<Point>({ x: 2, y: 2 });
  const [goal, setGoal] = useState<Point>({ x: 27, y: 17 });
  const [widthDraft, setWidthDraft] = useState(() => String(30));
  const [heightDraft, setHeightDraft] = useState(() => String(20));

  const [tool, setTool] = useState<Tool>("wall");
  const [paintWeight, setPaintWeight] = useState(5);

  const [algorithm, setAlgorithm] = useState<Algorithm>(DEFAULT_ALGORITHM);
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
  const engineRef = useRef<Awaited<ReturnType<typeof loadEngine>> | null>(null);

  const [mode, setMode] = useState<Mode>("grid");
  const [scrollingRunning, setScrollingRunning] = useState(false);
  const [scrollDirection, setScrollDirection] = useState<ScrollDirection>("right_to_left");
  const [ticksPerSecond, setTicksPerSecond] = useState(4);
  const [scrollSeed, setScrollSeed] = useState<number>(() => Date.now());
  const rngStateRef = useRef<number>(scrollSeed >>> 0);
  const [scrollingCells, setScrollingCells] = useState<Cell[]>(() => emptyCells(30, 20));
  const scrollingCellsRef = useRef<Cell[]>(scrollingCells);
  const [multiSolve, setMultiSolve] = useState<MultiSolveResult | null>(null);
  const [scrollOverlayAll, setScrollOverlayAll] = useState<Set<number>>(() => new Set());
  const [scrollOverlayBest, setScrollOverlayBest] = useState<Set<number>>(() => new Set());
  const [scrollExits, setScrollExits] = useState<Set<number>>(() => new Set());
  const [tickMs, setTickMs] = useState<number | null>(null);
  const tickHistoryRef = useRef<number[]>([]);

  const startIdx = useMemo(() => toIdx(width, start), [start, width]);
  const goalIdx = useMemo(() => toIdx(width, goal), [goal, width]);
  const algorithmMeta = useMemo(() => getAlgorithmOption(algorithm), [algorithm]);

  const visibleVisited = useMemo(
    () => new Set(visitedTrace.slice(0, visitedShown)),
    [visitedShown, visitedTrace],
  );

  const visiblePath = useMemo(
    () => new Set(pathTrace.slice(0, pathShown)),
    [pathShown, pathTrace],
  );

  const metrics = useMemo(() => {
    if (mode === "scrolling") {
      const result =
        multiSolve == null
          ? "—"
          : multiSolve.reachable_goals_count > 0
            ? "Exit reachable"
            : "No exit";
      const time = tickMs != null ? `${tickMs.toFixed(2)} ms/tick` : "—";
      const visited = multiSolve != null ? String(multiSolve.visited_count) : "—";
      const pathLen = multiSolve?.best_goal_index != null
        ? String(multiSolve.results[multiSolve.best_goal_index]?.path.length ?? 0)
        : "—";
      const exits = multiSolve != null ? `${multiSolve.reachable_goals_count}/${multiSolve.goals_count}` : "—";
      const cost =
        multiSolve?.best_goal_index != null
          ? String(
              multiSolve.results[multiSolve.best_goal_index]?.path_cost ??
                (multiSolve.results[multiSolve.best_goal_index]?.path.length
                  ? multiSolve.results[multiSolve.best_goal_index]!.path.length - 1
                  : 0),
            )
          : "—";
      return {
        result,
        time,
        visited,
        secondaryLabel: "Exits",
        secondaryValue: exits,
        costLabel: "Cost (best)",
        costValue: cost,
        pathLen,
      };
    }

    const result = solveResult == null ? "—" : solveResult.found ? "Path found" : "No path";
    const time = solveResult == null ? "—" : `${solveResult.elapsed_ms.toFixed(2)} ms`;
    const visited = solveResult == null ? "—" : String(solveResult.visited_count);
    const pathLen = solveResult == null ? "—" : String(solveResult.path.length);
    const cost =
      solveResult == null
        ? "—"
        : String(solveResult.path_cost ?? (solveResult.path.length ? solveResult.path.length - 1 : 0));
    return {
      result,
      time,
      visited,
      secondaryLabel: "Path length",
      secondaryValue: pathLen,
      costLabel: "Cost",
      costValue: cost,
      pathLen,
    };
  }, [mode, multiSolve, solveResult, tickMs]);

  useEffect(() => {
    loadEngine()
      .then((m) => {
        engineRef.current = m;
      })
      .catch(() => {
        // handled on demand
      });
  }, []);

  useEffect(() => {
    rngStateRef.current = scrollSeed >>> 0;
  }, [scrollSeed]);

  useEffect(() => {
    scrollingCellsRef.current = scrollingCells;
  }, [scrollingCells]);

  useEffect(() => {
    setWidthDraft(String(width));
  }, [width]);

  useEffect(() => {
    setHeightDraft(String(height));
  }, [height]);

  useEffect(() => {
    if (mode !== "scrolling") {
      setScrollingRunning(false);
      return;
    }
    setScrollingCells(cells);
    setMultiSolve(null);
    setScrollOverlayAll(new Set());
    setScrollOverlayBest(new Set());
    setScrollExits(new Set());
    setTickMs(null);
    tickHistoryRef.current = [];
    rngStateRef.current = scrollSeed >>> 0;
    setError(null);
  }, [cells, mode, scrollSeed]);

  function rand01() {
    let x = rngStateRef.current >>> 0;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    rngStateRef.current = x >>> 0;
    return (rngStateRef.current >>> 0) / 0xffffffff;
  }

  function makeIncomingCell(): Cell {
    const isWall = rand01() < wallProbability;
    if (isWall) return { wall: true, weight: 1 };
    const isWeighted = rand01() < weightedProbability;
    if (!isWeighted) return { wall: false, weight: 1 };
    const maxW = clamp(maxWeight, 2, 99);
    const w = 2 + Math.floor(rand01() * Math.max(1, maxW - 1));
    return { wall: false, weight: clamp(w, 2, 99) };
  }

  async function scrollingTick(nextCells: Cell[]) {
    const engine = engineRef.current ?? (await loadEngine());
    engineRef.current = engine;

    const exits = exitsForDirection(scrollDirection, width, height, nextCells);
    setScrollExits(new Set(exits.map((p) => toIdx(width, p))));

    const problem: MultiGoalProblem = {
      width,
      height,
      cells: nextCells,
      start,
      goals: exits,
      algorithm,
      k: algorithm === "yen" ? yenK : undefined,
    };

    const t0 = performance.now();
    const r = engine.solve_multi(problem);
    const dt = performance.now() - t0;
    setTickMs(dt);
    tickHistoryRef.current = [...tickHistoryRef.current.slice(-29), dt];
    setMultiSolve(r);

    const all = new Set<number>();
    for (const rr of r.results) {
      for (const p of rr.path) all.add(toIdx(width, p));
    }
    setScrollOverlayAll(all);

    const best = new Set<number>();
    if (r.best_goal_index != null) {
      const idx = r.best_goal_index;
      const bestPath = r.results[idx]?.path ?? [];
      for (const p of bestPath) best.add(toIdx(width, p));
    }
    setScrollOverlayBest(best);
  }

  useEffect(() => {
    if (mode !== "scrolling") return;
    if (!scrollingRunning) return;

    const intervalMs = Math.max(60, Math.round(1000 / clamp(ticksPerSecond, 1, 30)));
    const t = window.setInterval(() => {
      const prev = scrollingCellsRef.current;
      const shifted = shiftCells(scrollDirection, width, height, prev, makeIncomingCell);
      const sIdx = toIdx(width, start);
      if (shifted[sIdx]) shifted[sIdx] = { wall: false, weight: 1 };
      setScrollingCells(shifted);
      scrollingTick(shifted).catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
        setScrollingRunning(false);
      });
    }, intervalMs);

    return () => window.clearInterval(t);
  }, [
    algorithm,
    height,
    mode,
    scrollDirection,
    scrollingRunning,
    start,
    ticksPerSecond,
    wallProbability,
    weightedProbability,
    width,
    yenK,
    maxWeight,
  ]);

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

  const startTour = useCallback(() => {
    setTourInstance((current) => current + 1);
    setTourRun(true);
  }, []);

  const handleTourEvent = useCallback((data: EventData) => {
    if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) {
      localStorage.setItem(TOUR_STORAGE_KEY, "done");
      setTourRun(false);
    }
  }, []);

  return (
    <div className="min-h-full bg-background">
      <Joyride
        key={tourInstance}
        continuous
        run={tourRun}
        scrollToFirstStep
        steps={TOUR_STEPS}
        locale={{
          last: "Done",
          next: "Next",
          nextWithProgress: "Next ({current}/{total})",
          skip: "Skip",
        }}
        options={{
          arrowColor: "hsl(var(--popover))",
          backgroundColor: "hsl(var(--popover))",
          buttons: ["back", "skip", "primary"],
          overlayClickAction: false,
          overlayColor: "rgba(2, 6, 23, 0.72)",
          primaryColor: "hsl(var(--primary))",
          scrollDuration: 450,
          showProgress: true,
          textColor: "hsl(var(--popover-foreground))",
          width: 360,
          zIndex: 70,
        }}
        styles={{
          buttonBack: {
            color: "hsl(var(--muted-foreground))",
          },
          buttonPrimary: {
            borderRadius: 6,
            color: "hsl(var(--primary-foreground))",
          },
          buttonSkip: {
            color: "hsl(var(--muted-foreground))",
          },
          tooltip: {
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            boxShadow: "0 20px 48px rgba(0, 0, 0, 0.32)",
          },
          tooltipContent: {
            lineHeight: 1.5,
          },
          tooltipTitle: {
            fontSize: 16,
            fontWeight: 600,
          },
        }}
        onEvent={handleTourEvent}
      />
      <div className="mx-auto flex max-w-7xl flex-col gap-4 p-4">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold tracking-tight">Pathfinding Demo</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {ALGORITHM_BADGES.map((label) => (
                <Badge key={label} variant="secondary">
                  {label}
                </Badge>
              ))}
              <span className="hidden sm:inline">·</span>
              <span>Click/drag to edit. Run to animate.</span>
            </div>
          </div>

          <div className="flex items-center gap-3" data-tour="mode">
            <ToggleGroup
              type="single"
              value={mode}
              onValueChange={(v) => v && setMode(v as Mode)}
              className="hidden sm:flex"
            >
              <ToggleGroupItem value="grid">Grid</ToggleGroupItem>
              <ToggleGroupItem value="scrolling">Scrolling</ToggleGroupItem>
            </ToggleGroup>
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
            <Button
              variant="outline"
              size="icon"
              type="button"
              aria-label="Open UI tour"
              title="Open UI tour"
              onClick={startTour}
            >
              <HelpCircle aria-hidden="true" />
            </Button>
            <Button variant="outline" size="icon" asChild>
              <a
                href="https://github.com/Zacaria/pathfinding-client"
                aria-label="Open GitHub repository"
                title="Open GitHub repository"
                target="_blank"
                rel="noreferrer"
              >
                <Github aria-hidden="true" />
              </a>
            </Button>
          </div>
        </header>

        <Card
          className="sticky top-0 z-10 border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60"
          data-tour="metrics"
        >
          <CardContent className="grid gap-2 p-4 text-sm sm:grid-cols-5">
            <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-start">
              <span className="text-muted-foreground">Result</span>
              <span className="font-medium">{metrics.result}</span>
            </div>
            <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-start">
              <span className="text-muted-foreground">Time</span>
              <span className="font-medium">{metrics.time}</span>
            </div>
            <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-start">
              <span className="text-muted-foreground">Visited</span>
              <span className="font-medium">{metrics.visited}</span>
            </div>
            <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-start">
              <span className="text-muted-foreground">{metrics.secondaryLabel}</span>
              <span className="font-medium">{metrics.secondaryValue}</span>
            </div>
            <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-start">
              <span className="text-muted-foreground">{metrics.costLabel}</span>
              <span className="font-medium">{metrics.costValue}</span>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
          <aside className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Run</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid gap-2" data-tour="algorithm">
                  <Label>Algorithm</Label>
                  <Select value={algorithm} onValueChange={(v) => setAlgorithm(v as Algorithm)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an algorithm" />
                    </SelectTrigger>
                    <SelectContent>
                      {ALGORITHM_GROUPS.map((group, index) => (
                        <Fragment key={group.id}>
                          {index > 0 ? <SelectSeparator /> : null}
                          <SelectGroup>
                            <SelectLabel>{group.label}</SelectLabel>
                            {group.options.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </Fragment>
                      ))}
                    </SelectContent>
                  </Select>
                  {algorithmMeta.supportsK ? (
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
                  {algorithmMeta.ignoresWeights ? (
                    <div className="text-xs text-muted-foreground">
                      This algorithm ignores weights (treats all costs as 1).
                    </div>
                  ) : null}
                  {algorithmMeta.mayBeSlow ? (
                    <div className="text-xs text-muted-foreground">
                      Tip: start with a smaller grid; this algorithm can be very slow.
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2" data-tour="run">
                  <Button
                    onClick={mode === "scrolling" ? () => setScrollingRunning(true) : runSolve}
                  >
                    <Play className="h-4 w-4" />
                    {mode === "scrolling" ? "Start" : "Run"}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (mode === "scrolling") setScrollingRunning((v) => !v);
                      else setIsPlaying((v) => !v);
                    }}
                    disabled={
                      mode === "scrolling" ? false : visitedTrace.length === 0 && pathTrace.length === 0
                    }
                  >
                    {mode === "scrolling" ? (
                      scrollingRunning ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )
                    ) : isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    {mode === "scrolling"
                      ? scrollingRunning
                        ? "Pause"
                        : "Play"
                      : isPlaying
                        ? "Pause"
                        : "Play"}
                  </Button>
                  {mode === "grid" ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (visitedShown < visitedTrace.length) setVisitedShown((v) => v + 1);
                        else if (pathShown < pathTrace.length) setPathShown((v) => v + 1);
                      }}
                      disabled={visitedShown >= visitedTrace.length && pathShown >= pathTrace.length}
                    >
                      Step
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (mode === "scrolling") {
                        setScrollingRunning(false);
                        setScrollingCells(cells);
                        setMultiSolve(null);
                        setScrollOverlayAll(new Set());
                        setScrollOverlayBest(new Set());
                        setScrollExits(new Set());
                        setTickMs(null);
                        tickHistoryRef.current = [];
                        rngStateRef.current = scrollSeed >>> 0;
                        setError(null);
                      } else {
                        resetPlayback();
                        setVisitedShown(0);
                        setPathShown(0);
                      }
                    }}
                    disabled={
                      mode === "grid" ? visitedTrace.length === 0 && pathTrace.length === 0 : false
                    }
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reset
                  </Button>
                </div>

                {mode === "grid" ? (
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label>Speed</Label>
                      <span className="text-xs text-muted-foreground">
                        {stepsPerSecond} steps/s
                      </span>
                    </div>
                    <Slider
                      value={[stepsPerSecond]}
                      min={10}
                      max={240}
                      step={5}
                      onValueChange={(v) => setStepsPerSecond(v[0] ?? 80)}
                    />
                  </div>
                ) : (
                  <div className="grid gap-3">
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <Label>Tick rate</Label>
                        <span className="text-xs text-muted-foreground">
                          {ticksPerSecond} ticks/s
                        </span>
                      </div>
                      <Slider
                        value={[ticksPerSecond]}
                        min={1}
                        max={30}
                        step={1}
                        onValueChange={(v) => setTicksPerSecond(v[0] ?? 4)}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>Scroll direction</Label>
                      <Select
                        value={scrollDirection}
                        onValueChange={(v) => setScrollDirection(v as ScrollDirection)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select direction" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="right_to_left">Right → Left</SelectItem>
                          <SelectItem value="left_to_right">Left → Right</SelectItem>
                          <SelectItem value="top_to_bottom">Top → Bottom</SelectItem>
                          <SelectItem value="bottom_to_top">Bottom → Top</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="text-xs text-muted-foreground">
                        Exits are all free cells on the incoming edge.
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <Label>Seed</Label>
                        <span className="text-xs text-muted-foreground">{scrollSeed}</span>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => {
                          const s = Date.now();
                          setScrollSeed(s);
                          rngStateRef.current = s >>> 0;
                        }}
                      >
                        New seed
                      </Button>
                      <div className="text-xs text-muted-foreground">
                        Same seed + settings → same terrain.
                      </div>
                    </div>
                  </div>
                )}

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
              <CardContent className="flex flex-col gap-4" data-tour="edit">
                {mode === "scrolling" ? (
                  <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                    Scrolling mode generates terrain continuously. Click a free cell on the grid to
                    move the start.
                  </div>
                ) : null}
                <div className="grid gap-2">
                  <Label>Tool</Label>
                  <ToggleGroup
                    type="single"
                    value={tool}
                    onValueChange={(v) => v && setTool(v as Tool)}
                    className="flex flex-wrap gap-2"
                    disabled={mode === "scrolling"}
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

                <div className="grid gap-3" data-tour="random">
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
                      <Label htmlFor="grid-width">Width</Label>
                      <Input
                        id="grid-width"
                        type="number"
                        inputMode="numeric"
                        min={8}
                        max={80}
                        step={1}
                        value={widthDraft}
                        onChange={(e) => setWidthDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        }}
                        onBlur={() => {
                          const parsed = Number.parseInt(widthDraft, 10);
                          if (!Number.isFinite(parsed)) {
                            setWidthDraft(String(width));
                            return;
                          }
                          resizeGrid(parsed, height);
                        }}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="grid-height">Height</Label>
                      <Input
                        id="grid-height"
                        type="number"
                        inputMode="numeric"
                        min={8}
                        max={60}
                        step={1}
                        value={heightDraft}
                        onChange={(e) => setHeightDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        }}
                        onBlur={() => {
                          const parsed = Number.parseInt(heightDraft, 10);
                          if (!Number.isFinite(parsed)) {
                            setHeightDraft(String(height));
                            return;
                          }
                          resizeGrid(width, parsed);
                        }}
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
                <div className="text-muted-foreground">
                  Metrics are shown in the top bar for quick access.
                </div>
              </CardContent>
            </Card>
          </aside>

          <main>
            <Card className="h-full" data-tour="grid">
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
                    {(mode === "scrolling" ? scrollingCells : cells).map((cell, idx) => {
                      const isStart = idx === startIdx;
                      const isGoal = mode === "grid" ? idx === goalIdx : false;
                      const isExit = mode === "scrolling" ? scrollExits.has(idx) : false;
                      const isWall = cell.wall;
                      const isWeighted = !cell.wall && cell.weight > 1;
                      const isVisited = mode === "grid" ? visibleVisited.has(idx) : false;
                      const isPath =
                        mode === "grid" ? visiblePath.has(idx) : scrollOverlayBest.has(idx);
                      const isAnyPath = mode === "scrolling" ? scrollOverlayAll.has(idx) : false;

                      const base =
                        "relative flex h-6 w-6 items-center justify-center rounded-[6px] text-[10px] font-medium transition-colors";

                      let cls = "bg-background text-foreground/70";
                      if (isWall) cls = "bg-foreground/80 text-background";
                      if (isWeighted) cls = "bg-secondary text-secondary-foreground";
                      if (isVisited) cls = "bg-blue-500/30 text-blue-950 dark:text-blue-50";
                      if (isAnyPath) cls = "bg-fuchsia-500/20 text-fuchsia-950 dark:text-fuchsia-50";
                      if (isPath) cls = "bg-emerald-500/60 text-emerald-950 dark:text-emerald-50";
                      if (isStart) cls = "bg-primary text-primary-foreground";
                      if (isGoal) cls = "bg-destructive text-destructive-foreground";
                      if (isExit && !isWall && mode === "scrolling" && !isStart) {
                        cls = `${cls} ring-2 ring-yellow-500/70`;
                      }

                      return (
                        <div
                          key={idx}
                          role="button"
                          tabIndex={0}
                          className={`${base} ${cls}`}
                          onPointerDown={() => {
                            pointerDownRef.current = true;
                            if (mode === "scrolling") {
                              if (!cell.wall) setStart(fromIdx(width, idx));
                            } else {
                              applyTool(idx);
                            }
                          }}
                          onPointerEnter={() => {
                            if (!pointerDownRef.current) return;
                            if (mode === "scrolling") return;
                            applyTool(idx);
                          }}
                          onKeyDown={(e) => {
                            if (e.key !== "Enter" && e.key !== " ") return;
                            if (mode === "scrolling") {
                              if (!cell.wall) setStart(fromIdx(width, idx));
                            } else {
                              applyTool(idx);
                            }
                          }}
                        >
                          {isStart ? "S" : null}
                          {isGoal ? "G" : null}
                          {isExit && !isStart && !isGoal ? "E" : null}
                          {!isStart && !isGoal && !isExit && isWeighted ? cell.weight : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>

        <footer className="flex flex-col gap-3 border-t py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>Related content</span>
          <nav aria-label="Related content" className="flex flex-wrap items-center gap-2">
            {RELATED_LINKS.map(({ label, href, Icon }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Icon aria-hidden="true" className="size-4" />
                <span>{label}</span>
                <ExternalLink aria-hidden="true" className="size-3.5 text-muted-foreground" />
              </a>
            ))}
          </nav>
        </footer>
      </div>
    </div>
  );
}
