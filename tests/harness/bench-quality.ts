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
  const weightedScore = totalWeight === 0
    ? 0
    : criteria.reduce((sum, criterion) => sum + criterion.score * criterion.weight, 0) / totalWeight;
  const criticalFailures = criteria
    .filter((criterion) => criterion.critical && !criterion.passed)
    .map((criterion) => criterion.id);
  const thresholdPassed = weightedScore >= rubric.minimumScore;
  const notes = [
    thresholdPassed
      ? `quality threshold passed (${formatScore(weightedScore)} >= ${formatScore(rubric.minimumScore)})`
      : `quality threshold failed (${formatScore(weightedScore)} < ${formatScore(rubric.minimumScore)})`,
    ...criteria.flatMap((criterion) => criterion.notes),
  ];

  return {
    score: weightedScore,
    passed: thresholdPassed && criticalFailures.length === 0,
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

  specificity(opts: { requiredAny: string[]; forbiddenPhrases: string[] }) {
    return (output: string) => {
      const hasRequired = opts.requiredAny.some((item) => includesFolded(output, item));
      const forbidden = opts.forbiddenPhrases.filter((phrase) => includesFolded(output, phrase));
      return {
        score: hasRequired && forbidden.length === 0 ? 1 : 0,
        notes: [
          ...(hasRequired ? [] : ["missing specific required scope marker"]),
          ...forbidden.map((phrase) => `forbidden phrase: ${phrase}`),
        ],
      };
    };
  },

  forbiddenFabrications(forbiddenFacts: string[]) {
    return (output: string) => {
      const found = forbiddenFacts.filter((fact) => includesFolded(output, fact));
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

function clamp(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function formatScore(score: number): string {
  return `${(score * 100).toFixed(1)}%`;
}
