import type {
  QualityCriterion,
  QualityCriterionResult,
  QualityEvaluationResult,
  QualityRubric,
} from "./bench-types.js";

export type { QualityRubric } from "./bench-types.js";

export function evaluateQuality(rubric: QualityRubric, output: string): QualityEvaluationResult {
  const criteria = rubric.criteria.map((criterion) => evaluateCriterion(criterion, output));
  const totalWeight = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
  // An empty rubric or one whose criteria all have zero weight cannot yield a
  // meaningful score. Treat it as invalid (never a pass) rather than letting a
  // degenerate 0 score slip past a minimumScore of 0.
  const invalidRubric = criteria.length === 0 || totalWeight === 0;
  const weightedScore = invalidRubric
    ? 0
    : criteria.reduce((sum, criterion) => sum + criterion.score * criterion.weight, 0) / totalWeight;
  const criticalFailures = criteria
    .filter((criterion) => criterion.critical && !criterion.passed)
    .map((criterion) => criterion.id);
  const thresholdPassed = !invalidRubric && weightedScore >= rubric.minimumScore;
  const notes = [
    invalidRubric
      ? "invalid rubric: no criteria or zero total weight"
      : thresholdPassed
        ? `quality threshold passed (${formatScore(weightedScore)} >= ${formatScore(rubric.minimumScore)})`
        : `quality threshold failed (${formatScore(weightedScore)} < ${formatScore(rubric.minimumScore)})`,
    ...criteria.flatMap((criterion) => criterion.notes),
  ];

  return {
    score: weightedScore,
    passed: !invalidRubric && thresholdPassed && criticalFailures.length === 0,
    thresholdPassed,
    criticalFailures,
    criteria,
    notes,
  };
}

export function createQualityEvaluator(rubric: QualityRubric) {
  return {
    rubric,
    evaluate(output: string): QualityEvaluationResult {
      return evaluateQuality(rubric, output);
    },
  };
}

function evaluateCriterion(criterion: QualityCriterion, output: string): QualityCriterionResult {
  const result = criterion.evaluate(output);
  const score = clamp(result.score);

  return {
    id: criterion.id,
    description: criterion.description,
    weight: criterion.weight,
    critical: criterion.critical,
    score,
    passed: score >= 1,
    notes: result.notes ?? [],
  };
}

export const qualityAssertions = {
  requiredFacts(facts: FactRequirement[]) {
    return (output: string) => {
      const missing = facts.filter((fact) => !factCovered(output, fact));
      return {
        score: missing.length === 0 ? 1 : 0,
        notes: missing.map((fact) => `missing required fact: ${describeFact(fact)}`),
      };
    };
  },

  specificity(opts: { requiredAny: string[]; forbiddenPhrases: string[]; strict?: boolean }) {
    return (output: string) => {
      const hasRequired = opts.requiredAny.some((item) => includesFolded(output, item));
      const forbidden = opts.forbiddenPhrases.filter((phrase) => forbiddenTermIsViolation(output, phrase, opts.strict));
      return {
        score: hasRequired && forbidden.length === 0 ? 1 : 0,
        notes: [
          ...(hasRequired ? [] : ["missing specific required scope marker"]),
          ...forbidden.map((phrase) => `forbidden phrase: ${phrase}`),
        ],
      };
    };
  },

  forbiddenFabrications(forbiddenFacts: string[], opts?: { strict?: boolean }) {
    return (output: string) => {
      const found = forbiddenFacts.filter((fact) => forbiddenTermIsViolation(output, fact, opts?.strict));
      return {
        score: found.length === 0 ? 1 : 0,
        notes: found.map((fact) => `fabricated or forbidden fact: ${fact}`),
      };
    };
  },

  requiredPatterns(patterns: RegExp[]) {
    return (output: string) => {
      const missing = patterns.filter((pattern) => !pattern.test(output));
      return {
        score: missing.length === 0 ? 1 : 0,
        notes: missing.map((pattern) => `missing required pattern: ${pattern}`),
      };
    };
  },

  referenceTraits(opts: { traits: string[] }) {
    return (output: string) => {
      const missing = opts.traits.filter((trait) => !includesFolded(output, trait));
      return {
        score: opts.traits.length === 0 ? 1 : (opts.traits.length - missing.length) / opts.traits.length,
        notes: missing.map((trait) => `missing reference trait: ${trait}`),
      };
    };
  },
};

/**
 * A required fact is either an exact substring (strict — keep this for file paths,
 * step ids, and route tokens) or an alias group that is satisfied when any listed
 * wording variant appears. Alias groups exist to absorb equivalent-wording drift
 * (e.g. "benchmark coverage reporting" vs "Benchmark Coverage Model") without
 * loosening the strict identifiers that must match verbatim.
 */
export type FactRequirement = string | { anyOf: string[] };

function factCovered(output: string, fact: FactRequirement): boolean {
  if (typeof fact === "string") return includesFolded(output, fact);
  return fact.anyOf.some((variant) => includesFolded(output, variant));
}

function describeFact(fact: FactRequirement): string {
  return typeof fact === "string" ? fact : `any of [${fact.anyOf.join(" | ")}]`;
}

function includesFolded(output: string, needle: string): boolean {
  return output.toLowerCase().includes(needle.toLowerCase());
}

// A forbidden term is a genuine violation only when it appears in a line that
// is NOT a negation context. Compliant output routinely NAMES a forbidden
// concept in order to reject it (a "Non-Goals: no GitHub Actions" line, a Don'ts
// bullet), and a plain substring check false-fails on exactly that. Pass
// `strict` for token/asset guards (design palette values) that must stay
// presence-based and are never excused by adjacent negation words.
function forbiddenTermIsViolation(output: string, term: string, strict?: boolean): boolean {
  if (!includesFolded(output, term)) return false;
  if (strict) return true;
  return !mentionIsNegated(output, term);
}

// Inline negation vocabulary — a superset of the pnpm-latest per-line cue at
// tier23-base-workflows.setup.ts. A cue anywhere on a term's line marks that
// mention as "named only to reject it".
const INLINE_NEGATION_CUE =
  /(?:do\s+not|don't|\bnot\b|\bno\b|\bnever\b|\bavoid\b|\breject\b|\bwithout\b|\bexclude(?:d|ing)?\b|must\s+not|cannot|can't|won't|rather\s+than|instead\s+of|out\s+of\s+scope|not\s+approved)/i;

// Negation-section headings/labels. A bare bullet under one of these (e.g.
// "- GitHub Actions" beneath "## Non-Goals") is excused until the next heading.
const NEGATION_SECTION_HEADING =
  /(?:non[-\s]?goals|out\s+of\s+scope|won't\s+do|will\s+not|excluded|not\s+doing|anti[-\s]?goals)/i;

/**
 * True when every line that mentions `term` sits in a negation context — either
 * an inline cue on the same line near the term, or a preceding Non-Goals-style
 * section heading whose scope the term's bare bullet falls under. If any mention
 * is un-negated, the term is a live claim (returns false). Generalizes the
 * per-line `lineOnlyWarnsAgainstPnpmLatest` idea into a shared primitive.
 */
export function mentionIsNegated(text: string, term: string): boolean {
  const termLower = term.toLowerCase();
  let underNegationHeading = false;
  let sawMention = false;

  for (const line of text.split(/\r?\n/)) {
    const heading = extractHeadingLabel(line);
    if (heading !== null) {
      underNegationHeading = NEGATION_SECTION_HEADING.test(heading);
    }
    if (!line.toLowerCase().includes(termLower)) continue;
    sawMention = true;
    if (underNegationHeading) continue;
    if (lineHasInlineNegationCue(line)) continue;
    return false; // a live, un-negated mention
  }

  return sawMention;
}

function lineHasInlineNegationCue(line: string): boolean {
  const normalized = line.replace(/[`*_]/g, " ").replace(/\s+/g, " ").trim();
  return INLINE_NEGATION_CUE.test(normalized);
}

// Returns the label text of a markdown heading or a standalone label line
// (e.g. "**Non-Goals**", "Non-Goals:"), or null if the line is body content.
// A heading resets the running negation-section scope; a bullet does not.
function extractHeadingLabel(line: string): string | null {
  const trimmed = line.trim();
  const atx = /^#{1,6}\s+(.*)$/.exec(trimmed);
  if (atx) return atx[1];
  const bold = /^\*\*(.+?)\*\*:?\s*$/.exec(trimmed);
  if (bold) return bold[1];
  // A leading label with no sentence body, e.g. "Non-Goals:" (but NOT
  // "Non-Goals: no GitHub Actions", which is body handled by the inline cue).
  const label = /^([A-Za-z][A-Za-z0-9 '/&-]{0,40}):\s*$/.exec(trimmed);
  if (label) return label[1];
  return null;
}

function clamp(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function formatScore(score: number): string {
  return `${(score * 100).toFixed(1)}%`;
}
