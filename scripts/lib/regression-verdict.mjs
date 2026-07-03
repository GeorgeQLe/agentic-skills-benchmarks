// regression-verdict.mjs — the pure verdict classifier for the benchmark
// regression comparator.
//
// Extracted from benchmark-regression-check.mjs so the per-agent verdict logic
// is unit-testable offline (no process exit, no fs). Given a prior grade and a
// fresh grade, it returns { verdict, reasons } with no side effects.
//
// Verdicts:
//   baseline    — no prior grade in history (seed only)
//   regression  — a metric dropped >= THRESHOLD, or the status badge demoted,
//                 on a lane that actually evaluated runs
//   improvement — no regression and a metric rose >= THRESHOLD, or status promoted
//   stable      — neither
//   blocked     — the lane is fully infra-blocked (0 evaluated runs). The skill
//                 was never exercised, so this is inconclusive, NOT a skill
//                 regression. passRate/wilsonLower drops are not reported for
//                 such a lane (they would be spurious "passRate dropped Npp").

// Drop of this many percentage points (as a 0..1 fraction) in any metric counts
// as a regression; the same magnitude rise counts as improvement.
export const THRESHOLD = 0.10;

// Status badge ordering, worst -> best. A move toward a lower rank is a demotion.
export const STATUS_RANK = { blocked: 0, "partially graded": 1, graded: 2 };

function pct(v) {
  return v === null || v === undefined ? "n/a" : `${(v * 100).toFixed(1)}%`;
}

/**
 * @param {object} args
 * @param {object|null} args.prior  prior history entry (or null/undefined for first-seen)
 * @param {object} args.grade       fresh grade { passRate, wilsonLower, averageScore, status, evaluatedRuns }
 * @returns {{ verdict: string, reasons: string[], infraBlocked?: boolean }}
 */
export function classifyVerdict({ prior, grade }) {
  if (!prior) {
    return { verdict: "baseline", reasons: [] };
  }

  // A fully infra-blocked lane evaluated zero runs — the skill itself was never
  // exercised. Treat passRate and wilsonLower as null (skip them exactly the way
  // a null averageScore is already skipped) so no spurious drop is reported, and
  // route the lane to `blocked` (inconclusive) rather than a skill regression.
  const infraBlocked = (grade.evaluatedRuns ?? 0) === 0;

  const checks = [
    ["passRate", prior.passRate, infraBlocked ? null : grade.passRate],
    ["wilsonLower", prior.wilsonLower, infraBlocked ? null : grade.wilsonLower],
    ["averageScore", prior.averageScore, grade.averageScore],
  ];

  let regressed = false;
  let improved = false;
  const reasons = [];
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
  const statusDemoted = nextRank < priorRank;
  const statusPromoted = nextRank > priorRank;

  if (infraBlocked) {
    // Keep the demotion visible in the caller's printed block, but as an infra
    // note — never as a skill regression that routes to /session-triage.
    const noteReasons = statusDemoted
      ? [`status demoted to blocked (${prior.status} -> ${grade.status})`]
      : [];
    return { verdict: "blocked", reasons: noteReasons, infraBlocked: true };
  }

  if (statusDemoted) {
    regressed = true;
    reasons.push(`status demoted (${prior.status} -> ${grade.status})`);
  } else if (statusPromoted) {
    improved = true;
  }

  const verdict = regressed ? "regression" : improved ? "improvement" : "stable";
  return { verdict, reasons };
}
