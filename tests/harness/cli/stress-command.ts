import { runBenchCommand } from "./bench-command.js";
import type { CommandIo } from "./bench-command.js";
import { runDashboardCommand } from "./dashboard-command.js";
import { listCommand } from "./list-command.js";
import { runLiveDashboardWithRuntime } from "../dashboard/live.js";
import { renderFrame } from "../dashboard/render.js";
import { cellKey, type BenchTargetSpec, type CellStatus, type DashboardState } from "../dashboard/state.js";
import type { ModelTarget } from "../dashboard/model-matrix.js";
import { UNKNOWN_BENCHMARK_CATALOG_METADATA } from "../skills-catalog.js";
import type { SingleRunResult, SkillBenchSetup } from "../bench-types.js";

interface StressCase {
  name: string;
  run: () => Promise<StressCaseResult> | StressCaseResult;
}

interface StressCaseResult {
  ok: boolean;
  detail: string;
  note?: string;
}

interface CapturedIo {
  io: CommandIo;
  stdout: () => string;
  stderr: () => string;
}

function captureIo(): CapturedIo {
  let stdout = "";
  let stderr = "";
  return {
    io: {
      stdout: {
        write: (chunk: string) => {
          stdout += chunk;
          return true;
        },
      },
      stderr: {
        write: (chunk: string) => {
          stderr += chunk;
          return true;
        },
      },
    },
    stdout: () => stdout,
    stderr: () => stderr,
  };
}

function fakeDashboardState(
  models: ModelTarget[],
  targets: BenchTargetSpec[],
  mock: boolean,
  budgetUsd: number,
): DashboardState {
  const now = Date.now();
  const aggregates = new Map();
  for (const [index, model] of models.entries()) {
    const total = targets.length;
    const blocked = index % 3 === 2 ? 1 : 0;
    const evaluated = total - blocked;
    const passed = index % 2 === 0 ? evaluated : Math.max(0, evaluated - 1);
    aggregates.set(model.id, {
      target: model,
      total,
      done: total,
      passed,
      evaluated,
      blocked,
      costUsd: Number((total * 0.05).toFixed(2)),
      durationsMs: [120, 900, 2400].slice(0, Math.max(1, total)),
    });
  }
  return {
    startedAt: now - 2500,
    now,
    models,
    targets,
    cells: new Map(),
    aggregates,
    activity: [],
    totalTasks: models.length * targets.length,
    completedTasks: models.length * targets.length,
    totalCostUsd: Number((models.length * targets.length * 0.05).toFixed(2)),
    budgetUsd,
    runsPerCell: 1,
    haltedByBudget: false,
    finished: true,
    mock,
    catalogMetadata: UNKNOWN_BENCHMARK_CATALOG_METADATA,
  };
}

function fakeResult(index: number, status: CellStatus): SingleRunResult {
  const blocked = status === "blocked";
  const passed = status === "pass";
  return {
    index,
    startedAt: new Date(0).toISOString(),
    completedAt: new Date(1000 + index).toISOString(),
    durationMs: 500 + index * 100,
    exitCode: blocked || status === "fail" ? 1 : 0,
    assertions: [{ description: "fake assertion", pass: passed }],
    passed,
    stdout: "",
    stderr: blocked ? "fake infrastructure block" : "",
    files: [],
    estimatedCostUsd: 0.05,
    infrastructureBlocked: blocked,
    infrastructureReason: blocked ? "fake rate limit" : undefined,
  };
}

function denseDashboardState(): DashboardState {
  const setup = {
    skill: "stress",
    prompt: "",
    perRunBudgetUsd: 0.05,
    timeoutMs: 1000,
    setupProject() {},
    assertResult() {
      return [];
    },
  } as unknown as SkillBenchSetup;
  const models: ModelTarget[] = [
    { id: "gpt-5", label: "GPT-5", cli: "codex", model: "gpt-5" },
    { id: "gpt-5-codex", label: "GPT-5 Codex With Long Label", cli: "codex", model: "gpt-5-codex" },
    { id: "claude-opus", label: "Claude Opus", cli: "claude", model: "opus" },
    { id: "claude-sonnet", label: "Claude Sonnet", cli: "claude", model: "sonnet" },
    { id: "claude-haiku", label: "Claude Haiku", cli: "claude", model: "haiku" },
  ];
  const targetNames = [
    "investigate",
    "investigation-variant-with-very-long-name",
    "ship",
    "ship-end",
    "session-triage",
    "scenario:alignment-yaml-routing",
    "design-system",
    "plan-phase",
    "roadmap",
    "blocked-skill",
    "pending-skill",
    "running-skill",
  ];
  const targets: BenchTargetSpec[] = targetNames.map((name, index) => ({
    name,
    kind: index === 5 ? "scenario" : "skill",
    setup,
  }));
  const statuses: CellStatus[] = ["pass", "fail", "blocked", "pending", "running"];
  const cells = new Map();
  const aggregates = new Map();
  let completedTasks = 0;
  let totalCostUsd = 0;

  for (const [modelIndex, model] of models.entries()) {
    let done = 0;
    let passed = 0;
    let evaluated = 0;
    let blocked = 0;
    const durationsMs: number[] = [];
    for (const [targetIndex, target] of targets.entries()) {
      const status = statuses[(modelIndex + targetIndex) % statuses.length];
      const results = status === "pending" || status === "running" ? [] : [fakeResult(targetIndex, status)];
      const running = status === "running" ? 1 : 0;
      cells.set(cellKey(model.id, target.name), {
        modelId: model.id,
        targetName: target.name,
        total: 1,
        running,
        results,
      });
      if (results.length > 0) {
        done++;
        completedTasks++;
        durationsMs.push(results[0].durationMs);
        totalCostUsd += results[0].estimatedCostUsd;
        if (results[0].infrastructureBlocked) blocked++;
        else {
          evaluated++;
          if (results[0].passed) passed++;
        }
      }
    }
    aggregates.set(model.id, {
      target: model,
      total: targets.length,
      done,
      passed,
      evaluated,
      blocked,
      costUsd: Number((done * 0.05).toFixed(2)),
      durationsMs,
      current: modelIndex === 0 ? "running-skill" : undefined,
    });
  }

  const now = Date.now();
  return {
    startedAt: now - 125_000,
    now,
    models,
    targets,
    cells,
    aggregates,
    activity: [
      { ts: now, modelLabel: "GPT-5 Codex With Long Label", targetName: "investigation-variant-with-very-long-name", runIndex: 0, status: "fail", durationMs: 2400 },
      { ts: now, modelLabel: "Claude Opus", targetName: "scenario:alignment-yaml-routing", runIndex: 0, status: "blocked", durationMs: 500 },
      { ts: now, modelLabel: "GPT-5", targetName: "ship", runIndex: 0, status: "pass", durationMs: 900 },
      { ts: now, modelLabel: "Claude Sonnet", targetName: "running-skill", runIndex: 0, status: "running", durationMs: 120 },
    ],
    totalTasks: models.length * targets.length,
    completedTasks,
    totalCostUsd: Number(totalCostUsd.toFixed(2)),
    budgetUsd: 5,
    runsPerCell: 1,
    haltedByBudget: true,
    finished: false,
    mock: true,
    catalogMetadata: UNKNOWN_BENCHMARK_CATALOG_METADATA,
  };
}

async function captureLiveDashboardSmoke(state: DashboardState): Promise<string> {
  let output = "";
  const intervals: (() => void)[] = [];
  await runLiveDashboardWithRuntime(
    {
      models: state.models,
      targets: state.targets,
      runsPerCell: state.runsPerCell,
      concurrency: 1,
      budgetUsd: state.budgetUsd,
      mock: state.mock,
      live: true,
      color: false,
    },
    {
      stdout: {
        isTTY: true,
        columns: 80,
        write: (chunk) => {
          output += chunk;
          return true;
        },
      },
      setInterval: (handler) => {
        intervals.push(handler);
        return handler;
      },
      clearInterval: () => {},
      onSignal: () => {},
      offSignal: () => {},
      exit: (code) => {
        throw new Error(`unexpected exit ${code}`);
      },
      runDashboard: async (opts) => {
        opts.onUpdate?.(state);
        intervals.forEach((handler) => handler());
        return { ...state, finished: true };
      },
    },
  );
  return output;
}

function expectCode(name: string, code: number, expected: number, output: string, note?: string): StressCaseResult {
  return {
    ok: code === expected,
    detail: code === expected ? `exit ${code}` : `expected exit ${expected}, got ${code}; output: ${output.slice(0, 240)}`,
    note,
  };
}

function hasText(name: string, haystack: string, needle: RegExp, note?: string): StressCaseResult {
  return {
    ok: needle.test(haystack),
    detail: needle.test(haystack) ? `matched ${needle}` : `${name} did not match ${needle}; output: ${haystack.slice(0, 240)}`,
    note,
  };
}

export async function stressCommand(rawArgs: string[] = [], io: CommandIo = { stdout: process.stdout, stderr: process.stderr }): Promise<number> {
  const json = rawArgs.includes("--json");
  const cases: StressCase[] = [
    {
      name: "help renders unified command surface",
      run: () => {
        const cap = captureIo();
        const code = runBenchCommand(["--help"], process.env, { io: cap.io });
        if (code !== 0) return expectCode("bench help", code, 0, cap.stderr());
        return hasText("bench help", cap.stdout(), /--budget <usd>/);
      },
    },
    {
      name: "list models includes GPT-5 and excludes Fable 5",
      run: () => {
        const cap = captureIo();
        const code = listCommand(["models"], cap.io);
        if (code !== 0) return expectCode("list models", code, 0, cap.stderr());
        const output = cap.stdout();
        return {
          ok: output.includes("gpt-5") && !output.includes("fable-5"),
          detail: output.includes("gpt-5") && !output.includes("fable-5")
            ? "model list is selectable-safe"
            : `unexpected model list: ${output}`,
        };
      },
    },
    {
      name: "fake benchmark run fans out without live agents",
      run: () => {
        const cap = captureIo();
        const invocations: string[] = [];
        const code = runBenchCommand(
          ["--skills", "investigate,ship", "--agent", "both", "--runs", "2", "--chunk-size", "1", "--budget", "10"],
          process.env,
          {
            io: cap.io,
            spawn: (_command, _args, env = {}) => {
              invocations.push(`${env.BENCH_SKILL}:${env.BENCH_AGENT}:${env.BENCH_RUNS}:${env.BENCH_CHUNK_SIZE}`);
              return 0;
            },
          },
        );
        return {
          ok: code === 0 && invocations.length === 4 && invocations.every((entry) => entry.endsWith(":2:1")),
          detail: `exit ${code}; invocations=${invocations.join(",")}`,
        };
      },
    },
    {
      name: "budget too low fails before spawning",
      run: () => {
        const cap = captureIo();
        let spawned = false;
        const code = runBenchCommand(["--skill", "investigate", "--agent", "codex", "--budget", "0"], process.env, {
          io: cap.io,
          spawn: () => {
            spawned = true;
            return 0;
          },
        });
        return {
          ok: code === 1 && !spawned && /cannot pay/.test(cap.stderr()),
          detail: `exit ${code}; spawned=${spawned}; stderr=${cap.stderr().trim()}`,
          note: "Expected failure: verifies the budget guard blocks spending before runner dispatch.",
        };
      },
    },
    {
      name: "invalid runs fail clearly",
      run: () => {
        const cap = captureIo();
        const code = runBenchCommand(["--skill", "investigate", "--runs", "0"], process.env, { io: cap.io });
        return {
          ok: code === 1 && /positive integer/.test(cap.stderr()),
          detail: `exit ${code}; stderr=${cap.stderr().trim()}`,
          note: "Expected failure: catches malformed numeric flags.",
        };
      },
    },
    {
      name: "unknown agent fails clearly",
      run: () => {
        const cap = captureIo();
        const code = runBenchCommand(["--skill", "investigate", "--agent", "bot"], process.env, { io: cap.io });
        return {
          ok: code === 1 && /unknown agent/.test(cap.stderr()),
          detail: `exit ${code}; stderr=${cap.stderr().trim()}`,
          note: "Expected failure: protects the runner contract.",
        };
      },
    },
    {
      name: "dashboard mock parses matrix flags without persistence",
      run: async () => {
        const cap = captureIo();
        const seen: string[] = [];
        const code = await runDashboardCommand(
          ["--mock", "--models", "gpt-5,claude-opus", "--skills", "investigate", "--runs", "1", "--budget", "1", "--no-live"],
          process.env,
          {
            io: cap.io,
            runDashboard: async (opts) => {
              seen.push(`${opts.models.map((model) => model.id).join("+")}:${opts.targets.length}:${opts.runsPerCell}:${opts.live}`);
              return fakeDashboardState(opts.models, opts.targets, opts.mock, opts.budgetUsd);
            },
            persistSummary: () => "stress-summary.json",
          },
        );
        return {
          ok: code === 0 && seen[0] === "gpt-5+claude-opus:1:1:false",
          detail: `exit ${code}; seen=${seen.join(",")}; stderr=${cap.stderr().trim()}`,
        };
      },
    },
    {
      name: "dashboard TUI renders dense fake state",
      run: () => {
        const state = denseDashboardState();
        const frame = renderFrame(state, { color: false, width: 100 });
        return {
          ok:
            frame.includes("SkillBench") &&
            frame.includes("GPT-5 Codex With Long Label") &&
            frame.includes("legend:") &&
            frame.includes("budget reached") &&
            frame.includes("running") &&
            frame.includes("infra-blocked"),
          detail: `lines=${frame.split("\n").length}; chars=${frame.length}`,
        };
      },
    },
    {
      name: "dashboard live TUI repaint capture passes",
      run: async () => {
        const output = await captureLiveDashboardSmoke(denseDashboardState());
        return {
          ok:
            output.includes("\x1b[?25l") &&
            output.includes("\x1b[2J\x1b[H") &&
            output.includes("\x1b[HSkillBench") &&
            output.includes("\x1b[K\x1b[0J") &&
            output.endsWith("\x1b[?25h") &&
            !output.includes("[  "),
          detail: `chars=${output.length}; ansi=${output.includes("\x1b[")}`,
        };
      },
    },
    {
      name: "dashboard TUI handles narrow and color frames",
      run: () => {
        const state = denseDashboardState();
        const narrow = renderFrame(state, { color: false, width: 48 });
        const color = renderFrame(state, { color: true, width: 80 });
        return {
          ok: narrow.length > 0 && color.includes("\x1b[") && !/\bundefined\b|\bNaN\b/.test(narrow + color),
          detail: `narrowLines=${narrow.split("\n").length}; colorAnsi=${color.includes("\x1b[")}`,
          note: "This is a render smoke test; it catches crashes and corrupt tokens, not visual overlap in a real terminal.",
        };
      },
    },
    {
      name: "dashboard live guard blocks accidental spend",
      run: async () => {
        const cap = captureIo();
        const code = await runDashboardCommand(["--models", "gpt-5", "--skills", "investigate", "--runs", "1"], {}, { io: cap.io });
        return {
          ok: code === 1 && /LIVE_AGENT_TESTS=1/.test(cap.stderr()),
          detail: `exit ${code}; stderr=${cap.stderr().trim()}`,
          note: "Expected failure: live dashboard still requires explicit opt-in.",
        };
      },
    },
    {
      name: "banned model selection fails",
      run: async () => {
        const cap = captureIo();
        const code = await runDashboardCommand(["--mock", "--models", "fable-5", "--skills", "investigate"], process.env, { io: cap.io });
        return {
          ok: code === 1 && /banned/.test(cap.stderr()),
          detail: `exit ${code}; stderr=${cap.stderr().trim()}`,
          note: "Expected failure: preserves the Fable 5 ban.",
        };
      },
    },
  ];

  const results = [];
  for (const testCase of cases) {
    const result = await testCase.run();
    results.push({ name: testCase.name, ...result });
  }

  const failed = results.filter((result) => !result.ok);
  if (json) {
    io.stdout.write(JSON.stringify({ ok: failed.length === 0, results }, null, 2) + "\n");
  } else {
    io.stdout.write("SkillBench stress\n\n");
    for (const result of results) {
      io.stdout.write(`${result.ok ? "PASS" : "FAIL"}  ${result.name}\n`);
      io.stdout.write(`      ${result.detail}\n`);
      if (result.note) io.stdout.write(`      note: ${result.note}\n`);
    }
    io.stdout.write(`\n${results.length - failed.length}/${results.length} stress checks passed.\n`);
    if (failed.length > 0) {
      io.stdout.write("Unexpected failures indicate CLI regressions. Expected-failure checks are marked as notes above.\n");
    }
  }

  return failed.length === 0 ? 0 : 1;
}
