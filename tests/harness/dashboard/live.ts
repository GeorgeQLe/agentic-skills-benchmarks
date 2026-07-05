import { runDashboard, type OrchestratorOptions } from "./orchestrator.js";
import { renderFrame } from "./render.js";
import { cellStatus, type DashboardState } from "./state.js";

const ESC = "\x1b[";

export interface LiveOptions extends Omit<OrchestratorOptions, "onUpdate"> {
  /** Force live repaint / plain-log mode instead of auto-detecting a TTY. */
  live?: boolean;
  color?: boolean;
}

export interface LiveDashboardRuntime {
  stdout: {
    isTTY?: boolean;
    columns?: number;
    write(chunk: string): unknown;
  };
  setInterval(handler: () => void, ms: number): unknown;
  clearInterval(handle: unknown): void;
  onSignal(signal: NodeJS.Signals, handler: () => void): void;
  offSignal(signal: NodeJS.Signals, handler: () => void): void;
  exit(code: number): never;
  runDashboard(opts: OrchestratorOptions): Promise<DashboardState>;
}

const processRuntime: LiveDashboardRuntime = {
  stdout: process.stdout,
  setInterval: (handler, ms) => setInterval(handler, ms),
  clearInterval: (handle) => clearInterval(handle as NodeJS.Timeout),
  onSignal: (signal, handler) => process.on(signal, handler),
  offSignal: (signal, handler) => process.off(signal, handler),
  exit: (code) => process.exit(code),
  runDashboard,
};

/**
 * Wire the orchestrator to the renderer. On a TTY this repaints in place at a
 * fixed cadence (so the spinner/elapsed clock animate between events); off a
 * TTY it streams one line per completed run and prints a final frame — which is
 * what CI logs and `| tee` capture want.
 */
export async function runLiveDashboard(opts: LiveOptions): Promise<DashboardState> {
  return runLiveDashboardWithRuntime(opts, processRuntime);
}

export async function runLiveDashboardWithRuntime(
  opts: LiveOptions,
  runtime: LiveDashboardRuntime,
): Promise<DashboardState> {
  const isTty = Boolean(runtime.stdout.isTTY);
  const live = opts.live ?? isTty;
  const color = opts.color ?? isTty;
  const width = runtime.stdout.columns ?? 100;
  const out = runtime.stdout;

  let lastActivityLen = 0;

  if (live) {
    out.write(`${ESC}?25l`); // hide cursor
    out.write(`${ESC}2J${ESC}H`); // clear screen, home
  }

  const paint = (state: DashboardState) => {
    if (!live) return;
    const frame = renderFrame(state, { color, width });
    const body = frame.split("\n").join(`${ESC}K\n`);
    out.write(`${ESC}H${body}${ESC}K${ESC}0J`);
  };

  const logLine = (state: DashboardState) => {
    if (live) return;
    // Emit only newly-appended activity entries (unshift-ordered, newest first).
    const fresh = state.activity.length - lastActivityLen;
    for (let i = fresh - 1; i >= 0; i--) {
      const e = state.activity[i];
      out.write(
        `[${String(state.completedTasks).padStart(3)}/${state.totalTasks}] ` +
          `${e.status.toUpperCase().padEnd(7)} ${e.modelLabel} · ${e.targetName} #${e.runIndex} ` +
          `(${(e.durationMs / 1000).toFixed(1)}s)\n`,
      );
    }
    lastActivityLen = state.activity.length;
  };

  const restore = () => {
    if (live) out.write(`${ESC}?25h`); // show cursor
  };
  const onSignal = () => {
    restore();
    runtime.exit(130);
  };
  runtime.onSignal("SIGINT", onSignal);
  runtime.onSignal("SIGTERM", onSignal);

  let ticker: unknown | undefined;
  let latest: DashboardState | undefined;
  const clearTicker = () => {
    if (ticker !== undefined) {
      runtime.clearInterval(ticker);
      ticker = undefined;
    }
  };
  if (live) {
    ticker = runtime.setInterval(() => latest && paint(latest), 120);
  }

  try {
    const finalState = await runtime.runDashboard({
      ...opts,
      onUpdate: (state) => {
        latest = state;
        paint(state);
        logLine(state);
      },
    });
    clearTicker();
    paint(finalState);
    if (!live) out.write("\n" + renderFrame(finalState, { color, width }) + "\n");
    return finalState;
  } finally {
    clearTicker();
    restore();
    runtime.offSignal("SIGINT", onSignal);
    runtime.offSignal("SIGTERM", onSignal);
  }
}

export { cellStatus };
