import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { seededNumber } from "./canonical.js";
import { EXPERIMENT_ROOT } from "./paths.js";
import { MODEL_PINS } from "./design.js";
import { RUBRIC, type DeterministicChecks, type JudgeScore } from "./types.js";

export interface JudgeResolution {
  pass: boolean;
  majority: { pass: number; fail: number };
  totalScore: number;
  tieBreakUsed: boolean;
  thirdFamily: "gpt" | "claude" | null;
  scores: JudgeScore[];
}

export function scoreTotal(score: JudgeScore): number {
  return score.requirements + score.codeQuality + score.directionFollowing + score.intentAndPushback;
}

export function rubricPass(score: Pick<JudgeScore, "requirements" | "codeQuality" | "directionFollowing" | "intentAndPushback" | "criticalFailure">): boolean {
  return scoreTotal(score as JudgeScore) >= RUBRIC.passScore
    && !score.criticalFailure
    && score.requirements >= RUBRIC.minimumRequirements
    && score.directionFollowing >= RUBRIC.minimumDirectionFollowing;
}

export function validateJudgeScore(score: JudgeScore): void {
  const ranges: Array<[keyof JudgeScore, number]> = [
    ["requirements", 30],
    ["codeQuality", 25],
    ["directionFollowing", 20],
    ["intentAndPushback", 25],
  ];
  for (const [key, maximum] of ranges) {
    const value = score[key];
    if (!Number.isInteger(value) || (value as number) < 0 || (value as number) > maximum) {
      throw new Error(`judge score ${key} is outside 0-${maximum}`);
    }
  }
  if (score.pass !== rubricPass(score)) throw new Error("judge pass verdict does not match the locked rubric thresholds");
  if (score.evidence.length === 0) throw new Error("judge score contains no evidence");
}

export function needsTieBreak(first: JudgeScore, second: JudgeScore): boolean {
  validateJudgeScore(first);
  validateJudgeScore(second);
  return first.pass !== second.pass || Math.abs(scoreTotal(first) - scoreTotal(second)) >= RUBRIC.tieBreakScoreGap;
}

export function thirdJudgeFamily(runId: string): "gpt" | "claude" {
  return seededNumber(`third-judge:${runId}`) % 2 === 0 ? "gpt" : "claude";
}

export function resolveJudges(runId: string, mandatory: [JudgeScore, JudgeScore], third?: JudgeScore): JudgeResolution {
  mandatory.forEach(validateJudgeScore);
  const required = needsTieBreak(...mandatory);
  if (required && !third) throw new Error("a third independent judge is required");
  if (!required && third) throw new Error("third judge supplied without a verdict disagreement or 10-point gap");
  const expectedFamily = required ? thirdJudgeFamily(runId) : null;
  if (third) {
    validateJudgeScore(third);
    if (third.judgeFamily !== expectedFamily) throw new Error(`third judge family must be ${expectedFamily}`);
  }
  const scores = third ? [...mandatory, third] : [...mandatory];
  const pass = scores.filter((score) => score.pass).length;
  const fail = scores.length - pass;
  return {
    pass: pass > fail,
    majority: { pass, fail },
    totalScore: Number((scores.reduce((total, score) => total + scoreTotal(score), 0) / scores.length).toFixed(3)),
    tieBreakUsed: required,
    thirdFamily: expectedFamily,
    scores,
  };
}

export function blindedCandidateLabel(runId: string, judgeOrdinal: number): string {
  return `candidate-${seededNumber(`blind:${runId}:${judgeOrdinal}`).toString(36).padStart(10, "0").slice(0, 10)}`;
}

export function buildBlindedJudgePrompt(input: {
  family: "gpt" | "claude";
  runId: string;
  judgeOrdinal: number;
  taskPrompt: string;
  checks: DeterministicChecks;
  patch: string;
  testOutput: string;
  finalAnswer: string;
}): { label: string; prompt: string } {
  const label = blindedCandidateLabel(input.runId, input.judgeOrdinal);
  const contract = readFileSync(resolve(EXPERIMENT_ROOT, `prompts/judge-${input.family}.md`), "utf8").trim();
  const prompt = [
    contract,
    `# Candidate\n${label}`,
    `# Task\n${input.taskPrompt}`,
    `# Deterministic checks\n${JSON.stringify(input.checks, null, 2)}`,
    `# Patch\n${input.patch}`,
    `# Test evidence\n${input.testOutput}`,
    `# Candidate final answer\n${input.finalAnswer}`,
  ].join("\n\n");
  return { label, prompt };
}

export function materializeJudgeScore(
  family: "gpt" | "claude",
  label: string,
  parsed: Omit<JudgeScore, "judgeFamily" | "judgeModel" | "blindedCandidate">,
): JudgeScore {
  const score: JudgeScore = {
    ...parsed,
    judgeFamily: family,
    judgeModel: MODEL_PINS.judges[family],
    blindedCandidate: label,
  };
  validateJudgeScore(score);
  return score;
}

export function agreement(first: boolean[], second: boolean[]): { observed: number; kappa: number } {
  if (first.length !== second.length || first.length === 0) throw new Error("agreement inputs must have equal nonzero length");
  let same = 0;
  let firstPass = 0;
  let secondPass = 0;
  for (let index = 0; index < first.length; index++) {
    if (first[index] === second[index]) same++;
    if (first[index]) firstPass++;
    if (second[index]) secondPass++;
  }
  const observed = same / first.length;
  const p1 = firstPass / first.length;
  const p2 = secondPass / second.length;
  const expected = p1 * p2 + (1 - p1) * (1 - p2);
  const kappa = expected === 1 ? 1 : (observed - expected) / (1 - expected);
  return { observed: Number(observed.toFixed(6)), kappa: Number(kappa.toFixed(6)) };
}
