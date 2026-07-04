import { runDashboard, type OrchestratorOptions } from "./orchestrator.js";
import { renderFrame } from "./render.js";
import { cellStatus, type DashboardState } from "./state.js";

const ESC = "\x1b[";

export interface LiveOptions extends Omit<OrchestratorOptions, "onUpdate"> {
  /** Force live repaint / plain-log mode instead of auto-detecting a TTY. */
  live?: boolean;
  color?: boolean;
}

/**
 * Wire the orchestrator to the renderer. On a TTY this repaints in place at a
 * fixed cadence (so the spinner/elapsed clock animate between events); off a
 * TTY it streams one line per completed run and prints a final frame — which is
 * what CI logs and `| tee` capture want.
 */
export async function runLiveDashboard(opts: LiveOptions): Promise<DashboardState> {
  const isTty = Boolean(process.stdout.isTTY);
  const live = opts.live ?? isTty;
  const color = opts.color ?? isTty;
  const width = process.stdout.columns ?? 100;
  const out = process.stdout;

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
    process.exit(130);
  };
  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);

  let ticker: NodeJS.Timeout | undefined;
  let latest: DashboardState | undefined;
  if (live) {
    ticker = setInterval(() => latest && paint(latest), 120);
  }

  try {
    const finalState = await runDashboard({
      ...opts,
      onUpdate: (state) => {
        latest = state;
        paint(state);
        logLine(state);
      },
    });
    if (ticker) clearInterval(ticker);
    paint(finalState);
    if (!live) out.write("\n" + renderFrame(finalState, { color, width }) + "\n");
    return finalState;
  } finally {
    if (ticker) clearInterval(ticker);
    restore();
    process.off("SIGINT", onSignal);
    process.off("SIGTERM", onSignal);
  }
}

export { cellStatus };
