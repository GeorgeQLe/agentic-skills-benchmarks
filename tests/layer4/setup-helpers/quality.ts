import {
  createQualityEvaluator,
  qualityAssertions,
  type FactRequirement,
  type QualityRubric,
} from "../../harness/bench-quality.js";
import type { QualityCriterion, QualityEvaluator } from "../../harness/bench-types.js";
import { nextCommandHandoffPattern, recommendedExactNextRoutePattern, recommendedNextRoutePattern } from "./routing.js";

type CriterionOptions = {
  id: string;
  description: string;
  weight: number;
  critical?: boolean;
};

type RequiredFactsOptions = CriterionOptions & {
  facts: FactRequirement[];
};

type ForbiddenFabricationOptions = CriterionOptions & {
  forbidden: string[];
  // When true, any presence of a forbidden term fails — never excused by an
  // adjacent negation word. Default (unset) is negation-aware. Use for design
  // token/asset guards that must stay presence-based.
  strict?: boolean;
};

type SpecificityOptions = CriterionOptions & {
  requiredAny: string[];
  forbiddenPhrases?: string[];
  strict?: boolean;
};

type RequiredPatternsOptions = CriterionOptions & {
  patterns: RegExp[];
};

type ReferenceTraitsOptions = CriterionOptions & {
  traits: string[];
};

export function createSetupQualityEvaluator(rubric: QualityRubric): QualityEvaluator {
  return createQualityEvaluator(rubric);
}

export function requiredFactCoverageCriterion(options: RequiredFactsOptions): QualityCriterion {
  return {
    ...criterionOptions(options),
    requiredLiterals: factLiterals(options.facts),
    evaluate: qualityAssertions.requiredFacts(options.facts),
  };
}

// Flattens fact requirements into the literal strings a compliant output must
// contain (an anyOf group contributes every variant — any one is satisfiable by
// echoing). Consumed by the no-prompt-echo lint.
function factLiterals(facts: FactRequirement[]): string[] {
  return facts.flatMap((fact) => (typeof fact === "string" ? [fact] : fact.anyOf));
}

export function forbiddenFabricationCriterion(options: ForbiddenFabricationOptions): QualityCriterion {
  return {
    ...criterionOptions(options),
    evaluate: qualityAssertions.forbiddenFabrications(options.forbidden, { strict: options.strict }),
  };
}

export function specificityCriterion(options: SpecificityOptions): QualityCriterion {
  return {
    ...criterionOptions(options),
    evaluate: qualityAssertions.specificity({
      requiredAny: options.requiredAny,
      forbiddenPhrases: options.forbiddenPhrases ?? [],
      strict: options.strict,
    }),
  };
}

export function requiredPatternCriterion(options: RequiredPatternsOptions): QualityCriterion {
  return {
    ...criterionOptions(options),
    evaluate: qualityAssertions.requiredPatterns(options.patterns),
  };
}

// Fails (score 0) when any of the given patterns appears in the output. The
// inverse of requiredPatternCriterion — use it to forbid a *phrasing* (e.g. a
// proposing phrase) rather than a bare substring, so a term that legitimately
// appears in a negation/"avoid X" context is not treated as a violation.
export function forbiddenPatternCriterion(options: RequiredPatternsOptions): QualityCriterion {
  return {
    ...criterionOptions(options),
    evaluate(output: string) {
      const found = options.patterns.filter((pattern) => pattern.test(output));
      return {
        score: found.length === 0 ? 1 : 0,
        notes: found.map((pattern) => `forbidden pattern present: ${pattern}`),
      };
    },
  };
}

export function referenceTraitCriterion(options: ReferenceTraitsOptions): QualityCriterion {
  return {
    ...criterionOptions(options),
    evaluate: qualityAssertions.referenceTraits({ traits: options.traits }),
  };
}

export function concreteFileReferenceCriterion(options: CriterionOptions & { files: string[] }): QualityCriterion {
  return requiredFactCoverageCriterion({
    ...options,
    facts: options.files,
  });
}

export function concreteCommandReferenceCriterion(options: CriterionOptions & { commands: string[] }): QualityCriterion {
  return requiredPatternCriterion({
    ...options,
    patterns: options.commands.map((command) => new RegExp(escapeRegExp(command), "i")),
  });
}

export function nextRouteCriterion(options: CriterionOptions & { route?: string | string[] }): QualityCriterion {
  const routes = Array.isArray(options.route) ? options.route : options.route ? [options.route] : [];
  return requiredPatternCriterion({
    ...options,
    patterns: routes.length > 0
      ? [nextCommandHandoffPattern, new RegExp(routes.map(escapeRegExp).join("|"), "i")]
      : [nextCommandHandoffPattern],
  });
}

export function finalNextRouteCriterion(options: CriterionOptions & { route?: string | string[] }): QualityCriterion {
  const routes = Array.isArray(options.route) ? options.route : options.route ? [options.route] : [];
  return requiredPatternCriterion({
    ...options,
    patterns: routes.length > 0
      ? [nextCommandHandoffPattern, new RegExp(routes.map((route) => recommendedNextRoutePattern(route).source).join("|"), "i")]
      : [nextCommandHandoffPattern],
  });
}

export function exactFinalNextRouteCriterion(options: CriterionOptions & { route?: string | string[] }): QualityCriterion {
  const routes = Array.isArray(options.route) ? options.route : options.route ? [options.route] : [];
  return requiredPatternCriterion({
    ...options,
    patterns: routes.length > 0
      ? [nextCommandHandoffPattern, new RegExp(routes.map((route) => recommendedExactNextRoutePattern(route).source).join("|"), "i")]
      : [nextCommandHandoffPattern],
  });
}

function criterionOptions(options: CriterionOptions): CriterionOptions {
  return {
    id: options.id,
    description: options.description,
    weight: options.weight,
    critical: options.critical,
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
