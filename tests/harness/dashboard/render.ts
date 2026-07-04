import {
  cellKey,
  cellStatus,
  passRate,
  percentile,
  type CellStatus,
  type DashboardState,
  type ModelAggregate,
} from "./state.js";

const ESC = "\x1b[";
const c = {
  reset: `${ESC}0m`,
  dim: `${ESC}2m`,
  bold: `${ESC}1m`,
  red: `${ESC}31m`,
  green: `${ESC}32m`,
  yellow: `${ESC}33m`,
  blue: `${ESC}34m`,
  magenta: `${ESC}35m`,
  cyan: `${ESC}36m`,
  gray: `${ESC}90m`,
};

const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

const GLYPH: Record<CellStatus, { text: string; color: string }> = {
  pending: { text: "·", color: c.gray },
  running: { text: "●", color: c.yellow },
  pass: { text: "✓", color: c.green },
  fail: { text: "✗", color: c.red },
  blocked: { text: "▨", color: c.magenta },
};

export interface RenderOptions {
  color: boolean;
  width: number;
}

function paint(text: string, color: string, enabled: boolean): string {
  return enabled ? `${color}${text}${c.reset}` : text;
}

function fmtDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  return `${m}m${String(Math.round(s % 60)).padStart(2, "0")}s`;
}

function fmtClock(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function bar(fraction: number, cells: number, color: string, opts: RenderOptions): string {
  const clamped = Math.max(0, Math.min(1, fraction));
  const filled = Math.round(clamped * cells);
  const full = "█".repeat(filled);
  const empty = "░".repeat(cells - filled);
  return paint(full, color, opts.color) + paint(empty, c.gray, opts.color);
}

function passRateColor(rate: number, done: boolean): string {
  if (!done) return c.cyan;
  if (rate >= 0.8) return c.green;
  if (rate >= 0.5) return c.yellow;
  return c.red;
}

/** Short, unique column codes for the target grid header. */
function shortCodes(names: string[]): Map<string, string> {
  const codes = new Map<string, string>();
  const seen = new Set<string>();
  for (const name of names) {
    const base = name.replace(/[^a-z0-9]/gi, "").slice(0, 4).toLowerCase() || "t";
    let code = base;
    let n = 1;
    while (seen.has(code)) code = `${base}${n++}`;
    seen.add(code);
    codes.set(name, code);
  }
  return codes;
}

function padEnd(text: string, width: number): string {
  return text.length >= width ? text.slice(0, width) : text + " ".repeat(width - text.length);
}

export function renderFrame(state: DashboardState, opts: RenderOptions): string {
  const lines: string[] = [];
  const frame = SPINNER[Math.floor(state.now / 90) % SPINNER.length];
  const elapsed = state.now - state.startedAt;
  const progress = state.totalTasks > 0 ? state.completedTasks / state.totalTasks : 0;

  // Header
  const title = paint("SkillBench", c.bold + c.cyan, opts.color);
  const mode = state.mock ? paint(" [mock]", c.magenta, opts.color) : "";
  const spin = state.finished ? paint("done", c.green, opts.color) : paint(frame, c.yellow, opts.color);
  lines.push(
    `${title}${mode}  ${spin}  ${paint(fmtClock(elapsed), c.dim, opts.color)}  ` +
      `${bar(progress, 24, c.cyan, opts)} ${(progress * 100).toFixed(0).padStart(3)}%  ` +
      `${paint(`${state.completedTasks}/${state.totalTasks}`, c.dim, opts.color)}  ` +
      `$${state.totalCostUsd.toFixed(2)}/${paint(`$${state.budgetUsd.toFixed(2)}`, c.dim, opts.color)}` +
      (state.haltedByBudget ? paint("  ⚠ budget reached", c.red, opts.color) : ""),
  );
  lines.push("");

  // Leaderboard — ranked by pass rate, then model order.
  const ranked = [...state.models]
    .map((m) => state.aggregates.get(m.id)!)
    .sort((a, b) => {
      const done = a.done >= a.total && b.done >= b.total;
      if (done || (a.done > 0 && b.done > 0)) {
        const diff = passRate(b) - passRate(a);
        if (Math.abs(diff) > 1e-9) return diff;
      }
      return state.models.indexOf(a.target) - state.models.indexOf(b.target);
    });

  const nameW = Math.max(12, ...state.models.map((m) => m.label.length));
  lines.push(
    paint(
      `  ${padEnd("MODEL", nameW)}  ${padEnd("DONE", 7)} ${padEnd("PASS RATE", 20)} ` +
        `${padEnd("p50", 8)} ${padEnd("COST", 8)} STATUS`,
      c.dim,
      opts.color,
    ),
  );
  ranked.forEach((agg, i) => lines.push(leaderboardRow(agg, i, nameW, state, opts)));
  lines.push("");

  // Grid (rows = models, cols = targets)
  lines.push(...renderGrid(state, nameW, opts));

  // Activity tail
  lines.push("");
  lines.push(paint("  recent", c.dim, opts.color));
  const recent = state.activity.slice(0, 6);
  if (recent.length === 0) {
    lines.push(paint("    (waiting for first result…)", c.gray, opts.color));
  }
  for (const entry of recent) {
    const g = GLYPH[entry.status];
    lines.push(
      `    ${paint(g.text, g.color, opts.color)} ${padEnd(entry.modelLabel, nameW)} ` +
        `${paint("·", c.gray, opts.color)} ${padEnd(entry.targetName, 24)} ` +
        `${paint(`#${entry.runIndex}`, c.dim, opts.color)}  ` +
        paint(fmtDuration(entry.durationMs), c.dim, opts.color),
    );
  }

  lines.push("");
  lines.push(
    paint(
      state.finished
        ? "  finished — press Ctrl-C to exit"
        : "  running… Ctrl-C to stop",
      c.gray,
      opts.color,
    ),
  );

  return lines.join("\n");
}

function leaderboardRow(
  agg: ModelAggregate,
  rank: number,
  nameW: number,
  state: DashboardState,
  opts: RenderOptions,
): string {
  const done = agg.done >= agg.total;
  const rate = passRate(agg);
  const rateColor = passRateColor(rate, agg.evaluated > 0);
  const medal = rank === 0 && agg.evaluated > 0 ? paint("★", c.yellow, opts.color) : " ";
  const p50 = agg.durationsMs.length ? fmtDuration(percentile(agg.durationsMs, 50)) : "—";
  const rateText = agg.evaluated > 0 ? `${(rate * 100).toFixed(0)}%` : "—";
  const status = done
    ? paint("done", c.green, opts.color)
    : agg.current
      ? paint(`● ${agg.current}`, c.yellow, opts.color)
      : paint("queued", c.gray, opts.color);
  const blocked = agg.blocked > 0 ? paint(` (${agg.blocked} blk)`, c.magenta, opts.color) : "";

  return (
    `${medal} ${paint(padEnd(agg.target.label, nameW), c.bold, opts.color)}  ` +
    `${padEnd(`${agg.done}/${agg.total}`, 7)} ` +
    `${bar(rate, 10, rateColor, opts)} ${padEnd(rateText, 5)} ` +
    `${padEnd(p50, 8)} ` +
    `${padEnd(`$${agg.costUsd.toFixed(2)}`, 8)} ` +
    `${status}${blocked}`
  );
}

function renderGrid(state: DashboardState, nameW: number, opts: RenderOptions): string[] {
  const lines: string[] = [];
  const names = state.targets.map((t) => t.name);
  const codes = shortCodes(names);
  const colW = Math.max(3, ...names.map((n) => codes.get(n)!.length));

  const header = names.map((n) => padEnd(codes.get(n)!, colW)).join(" ");
  lines.push(`  ${padEnd("", nameW)}  ${paint(header, c.dim, opts.color)}`);

  for (const model of state.models) {
    const cellsText = state.targets
      .map((target) => {
        const cell = state.cells.get(cellKey(model.id, target.name))!;
        const status = cellStatus(cell);
        const g = GLYPH[status];
        return paint(padEnd(g.text, colW), g.color, opts.color);
      })
      .join(" ");
    lines.push(`  ${padEnd(model.label, nameW)}  ${cellsText}`);
  }

  lines.push(
    paint(
      `  legend: ${GLYPH.pass.text} pass  ${GLYPH.fail.text} fail  ${GLYPH.running.text} running  ` +
        `${GLYPH.blocked.text} infra-blocked  ${GLYPH.pending.text} pending`,
      c.gray,
      opts.color,
    ),
  );
  return lines;
}
