import {
  createQualityEvaluator,
  qualityAssertions,
  type QualityRubric,
} from "../../harness/bench-quality.js";
import type { QualityCriterion, QualityEvaluator } from "../../harness/bench-types.js";

type CriterionOptions = {
  id: string;
  description: string;
  weight: number;
  critical?: boolean;
};

type RequiredFactsOptions = CriterionOptions & {
  facts: string[];
};

type ForbiddenFabricationOptions = CriterionOptions & {
  forbidden: string[];
};

type SpecificityOptions = CriterionOptions & {
  requiredAny: string[];
  forbiddenPhrases?: string[];
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
    evaluate: qualityAssertions.requiredFacts(options.facts),
  };
}

export function forbiddenFabricationCriterion(options: ForbiddenFabricationOptions): QualityCriterion {
  return {
    ...criterionOptions(options),
    evaluate: qualityAssertions.forbiddenFabrications(options.forbidden),
  };
}

export function specificityCriterion(options: SpecificityOptions): QualityCriterion {
  return {
    ...criterionOptions(options),
    evaluate: qualityAssertions.specificity({
      requiredAny: options.requiredAny,
      forbiddenPhrases: options.forbiddenPhrases ?? [],
    }),
  };
}

export function requiredPatternCriterion(options: RequiredPatternsOptions): QualityCriterion {
  return {
    ...criterionOptions(options),
    evaluate: qualityAssertions.requiredPatterns(options.patterns),
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

export function nextRouteCriterion(options: CriterionOptions & { route?: string }): QualityCriterion {
  return requiredPatternCriterion({
    ...options,
    patterns: options.route
      ? [/next\s+command/i, new RegExp(escapeRegExp(options.route), "i")]
      : [/next\s+command/i],
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
