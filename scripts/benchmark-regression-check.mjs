#!/usr/bin/env node
//
// benchmark-regression-check.mjs — close the benchmark → triage loop.
//
// The benchmark harness grades every skill (passRate + Wilson lower bound +
// output-quality averageScore + a status badge), but nothing compares a fresh
// run to the prior grade, so a *regression* is never detected. This script is
// the comparator: it reads the newest run report for a skill, compares it to
// the prior grade stored in benchmark/grade-history.json, emits an
// improvement / stable / regression verdict, appends the new grade to the
// history, and on regression prints the human-approved `/session-triage`
// handoff line and exits non-zero so a human or wrapper notices.
//
// It only DETECTS and ROUTES. It never bumps versions or edits skills — every
// remediation step stays human-approved.
//
// Usage:
//   node scripts/benchmark-regression-check.mjs <skill> [agent]
//
//   <skill>  required — repository skill name (e.g. design-system)
//   [agent]  optional — claude | codex. When omitted, every agent found in
//            the newest reports for <skill> is compared.
//
// Inputs:
//   - Newest run report(s): tests/benchmarks/runs/<skill>-<agent>-<id>/report.json
//     (working tree — this is the documented .gitignore exception for run
//     evidence; see CLAUDE.md "Skillpacks Manifest Is Index-Generated").
//   - Prior grade: benchmark/grade-history.json, keyed "<skill>|<agent>".
//
// Side effect:
//   - Appends the new grade to grade-history.json (tracked; git add it with
//     your source edits per the index-generated build discipline).
//
// Regression thresholds (tunable — keep in sync with the SKILL.md contracts):
//   A verdict is `regression` when ANY of:
//     - passRate drops by >= 10 percentage points
//     - wilsonLower drops by >= 10 percentage points
//     - averageScore (output quality) drops by >= 10 percentage points
//     - the status badge is demoted (graded -> partially graded -> blocked)
//   A verdict is `improvement` when no regression fired AND any of the three
//   metrics rose by >= 10pp OR the status badge was promoted.
//   Otherwise the verdict is `stable`.
//
// Exit codes:
//   0 — stable or improvement for every compared agent (and on first-seen
//       baselines, which only seed history)
//   1 — regression detected for at least one compared agent
//   2 — usage / IO error (no reports found, unreadable history, etc.)

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const runsDir = path.join(repoRoot, "tests", "benchmarks", "runs");
const historyPath = path.join(repoRoot, "benchmark", "grade-history.json");

// Drop of this many percentage points (expressed as a 0..1 fraction) in any
// metric counts as a regression; the same magnitude rise counts as improvement.
const THRESHOLD = 0.10;

// Status badge ordering, worst -> best. Mirrors the showcase generator and
// benchmarks.tsx badges: a move toward a lower rank is a demotion (regression).
const STATUS_RANK = { blocked: 0, "partially graded": 1, graded: 2 };

function fail(msg) {
  console.error(`benchmark-regression-check: ${msg}`);
  process.exit(2);
}

const skill = process.argv[2];
const agentArg = process.argv[3];
if (!skill) {
  fail("usage: node scripts/benchmark-regression-check.mjs <skill> [agent]");
}
if (agentArg && agentArg !== "claude" && agentArg !== "codex") {
  fail(`unknown agent "${agentArg}" (expected claude or codex)`);
}

// ---- locate the newest report.json per agent for this skill --------------

function deriveStatus(report) {
  const evaluatedRuns = report.evaluatedRuns ?? 0;
  const quality = report.qualitySummary;
  if (quality && (quality.evaluatedRuns ?? 0) > 0) return "graded";
  if (evaluatedRuns > 0) return "partially graded";
  return "blocked";
}

function gradeFromReport(report, dirName) {
  return {
    passRate: report.passRate ?? 0,
    wilsonLower: report.wilsonLower ?? 0,
    averageScore: report.qualitySummary?.averageScore ?? null,
    status: deriveStatus(report),
    evaluatedRuns: report.evaluatedRuns ?? 0,
    generatedAt: report.generatedAt ?? null,
    sessionDir: dirName,
  };
}

if (!existsSync(runsDir)) {
  fail(`no run directory at ${path.relative(repoRoot, runsDir)} — run \`pnpm bench --skill ${skill}\` first`);
}

// Newest report per agent, chosen by report.generatedAt (fallback: mtime).
const newest = new Map(); // agent -> { report, dirName, ts }
for (const entry of readdirSync(runsDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  // Directory naming: <skill>-<agent>-<sessionId>
  const m = entry.name.match(/^(.+)-(claude|codex)-[^-]+$/);
  if (!m) continue;
  const [, dirSkill, dirAgent] = m;
  if (dirSkill !== skill) continue;
  if (agentArg && dirAgent !== agentArg) continue;
  const reportPath = path.join(runsDir, entry.name, "report.json");
  if (!existsSync(reportPath)) continue;
  let report;
  try {
    report = JSON.parse(readFileSync(reportPath, "utf8"));
  } catch (err) {
    console.error(`  warning: skipping unreadable ${path.relative(repoRoot, reportPath)} (${err.message})`);
    continue;
  }
  const ts = report.generatedAt ? Date.parse(report.generatedAt) : statSync(reportPath).mtimeMs;
  const prev = newest.get(dirAgent);
  if (!prev || ts > prev.ts) newest.set(dirAgent, { report, dirName: entry.name, ts });
}

if (newest.size === 0) {
  fail(`no report.json found for skill "${skill}"${agentArg ? ` agent "${agentArg}"` : ""} under ${path.relative(repoRoot, runsDir)}`);
}

// ---- load history ---------------------------------------------------------

let history = {};
if (existsSync(historyPath)) {
  try {
    history = JSON.parse(readFileSync(historyPath, "utf8")) || {};
  } catch (err) {
    fail(`could not parse ${path.relative(repoRoot, historyPath)}: ${err.message}`);
  }
}

// ---- compare, per agent ---------------------------------------------------

function pct(v) {
  return v === null || v === undefined ? "n/a" : `${(v * 100).toFixed(1)}%`;
}

function metricDeltaLine(label, prior, next) {
  if (prior === null || prior === undefined || next === null || next === undefined) {
    return `  ${label.padEnd(13)} ${pct(prior)} -> ${pct(next)}`;
  }
  const delta = next - prior;
  const sign = delta >= 0 ? "+" : "";
  return `  ${label.padEnd(13)} ${pct(prior)} -> ${pct(next)} (${sign}${(delta * 100).toFixed(1)}pp)`;
}

let anyRegression = false;

for (const agent of Array.from(newest.keys()).sort()) {
  const { report, dirName } = newest.get(agent);
  const grade = gradeFromReport(report, dirName);
  const key = `${skill}|${agent}`;
  const priorArr = Array.isArray(history[key]) ? history[key] : [];
  const prior = priorArr.length ? priorArr[priorArr.length - 1] : null;

  // Build the new history entry (record before printing verdict).
  const entry = {
    date: grade.generatedAt ? grade.generatedAt.slice(0, 10) : "unknown",
    version: report.version ?? null,
    passRate: grade.passRate,
    wilsonLower: grade.wilsonLower,
    averageScore: grade.averageScore,
    status: grade.status,
  };

  let verdict;
  const reasons = [];

  if (!prior) {
    verdict = "baseline";
  } else {
    const checks = [
      ["passRate", prior.passRate, grade.passRate],
      ["wilsonLower", prior.wilsonLower, grade.wilsonLower],
      ["averageScore", prior.averageScore, grade.averageScore],
    ];
    let regressed = false;
    let improved = false;
    for (const [name, p, n] of checks) {
      if (p === null || p === undefined || n === null || n === undefined) continue;
      if (p - n >= THRESHOLD) {
        regressed = true;
        reasons.push(`${name} dropped ${((p - n) * 100).toFixed(1)}pp (${pct(p)} -> ${pct(n)})`);
      } else if (n - p >= THRESHOLD) {
        improved = true;
      }
    }
    const priorRank = STATUS_RANK[prior.status] ?? 1;
    const nextRank = STATUS_RANK[grade.status] ?? 1;
    if (nextRank < priorRank) {
      regressed = true;
      reasons.push(`status demoted (${prior.status} -> ${grade.status})`);
    } else if (nextRank > priorRank) {
      improved = true;
    }
    verdict = regressed ? "regression" : improved ? "improvement" : "stable";
  }

  // Append + persist.
  history[key] = [...priorArr, entry];

  // ---- print verdict block ----
  console.log(`\n${"=".repeat(60)}`);
  console.log(`${skill} | ${agent}: ${verdict.toUpperCase()}`);
  console.log("=".repeat(60));
  if (prior) {
    console.log(metricDeltaLine("passRate", prior.passRate, grade.passRate));
    console.log(metricDeltaLine("wilsonLower", prior.wilsonLower, grade.wilsonLower));
    console.log(metricDeltaLine("averageScore", prior.averageScore, grade.averageScore));
    console.log(`  status        ${prior.status} -> ${grade.status}`);
    console.log(`  prior graded  ${prior.date}${prior.version ? ` (${prior.version})` : ""}`);
  } else {
    console.log("  no prior grade in history — seeding baseline.");
    console.log(`  passRate      ${pct(grade.passRate)}`);
    console.log(`  wilsonLower   ${pct(grade.wilsonLower)}`);
    console.log(`  averageScore  ${pct(grade.averageScore)}`);
    console.log(`  status        ${grade.status}`);
  }
  console.log(`  new grade     ${entry.date}${entry.version ? ` (${entry.version})` : ""}  [${dirName}]`);

  if (verdict === "regression") {
    anyRegression = true;
    console.log(`\n  Regression reasons: ${reasons.join("; ")}`);
    console.log(`\nRecommended next skill: /session-triage ${skill} benchmark regression`);
  }
}

writeFileSync(historyPath, JSON.stringify(history, null, 2) + "\n");
console.log(`\nAppended grade(s) to ${path.relative(repoRoot, historyPath)}.`);

process.exit(anyRegression ? 1 : 0);
