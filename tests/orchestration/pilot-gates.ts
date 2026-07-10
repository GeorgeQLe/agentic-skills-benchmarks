import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { hashFile } from "./canonical.js";
import type { CampaignState } from "./campaign.js";
import { EXPERIMENT_ROOT } from "./paths.js";
import type { CampaignReport } from "./report.js";
import type { ExecutionResult } from "./runner.js";

export interface PilotGate {
  schemaVersion: 1;
  campaignId: string;
  designSha256: string;
  evaluatedAt: string;
  passed: boolean;
  gates: {
    fixtureQualification: boolean;
    modelAndEffortCapabilities: boolean;
    judgeCalibration: boolean;
    contextIsolation: boolean;
    budgetCalibration: boolean;
    harnessIntegrity: boolean;
  };
  reasons: string[];
}

export function evaluatePilotGate(input: {
  state: CampaignState;
  report: CampaignReport;
  results: ExecutionResult[];
  fixtureQualification: boolean;
}): PilotGate {
  if (input.state.kind !== "pilot") throw new Error("pilot gates require a pilot campaign");
  const completed = input.results.length === 1_116;
  const allModelsAndEffortsObserved = completed
    && input.results.some((result) => result.workerCalls === 0)
    && input.results.some((result) => result.workerCalls === 1)
    && input.results.some((result) => result.workerCalls === 4);
  const judgeCalibration = input.report.judges.comparedRuns === input.results.length
    && input.report.judges.observedAgreement >= 0.7
    && input.report.judges.kappa >= 0.4;
  const uniqueRuns = new Set(input.results.map((result) => result.run.id)).size === input.results.length;
  const uniqueAttempts = new Set(input.results.map((result) => result.attemptRoot)).size === input.results.length;
  const budgetCalibration = input.results.every((result) => result.usage.openaiUnits >= 0 && result.usage.anthropicUnits >= 0);
  const harnessIntegrity = completed
    && input.results.every((result) => result.candidateCalls === 1 && result.judgeCalls >= 2 && result.judgeCalls <= 3)
    && !input.state.haltedReason;
  const gates = {
    fixtureQualification: input.fixtureQualification,
    modelAndEffortCapabilities: allModelsAndEffortsObserved,
    judgeCalibration,
    contextIsolation: uniqueRuns && uniqueAttempts,
    budgetCalibration,
    harnessIntegrity,
  };
  const reasons = Object.entries(gates).filter(([, passed]) => !passed).map(([name]) => `${name} gate failed`);
  return {
    schemaVersion: 1,
    campaignId: input.state.id,
    designSha256: hashFile(resolve(EXPERIMENT_ROOT, "design.lock.json")),
    evaluatedAt: new Date().toISOString(),
    passed: reasons.length === 0,
    gates,
    reasons,
  };
}

export function readPassingPilotGate(path: string): PilotGate {
  const gate = JSON.parse(readFileSync(path, "utf8")) as PilotGate;
  if (!gate.passed || Object.values(gate.gates).some((passed) => !passed)) throw new Error("full campaign requires a passing pilot gate");
  const design = hashFile(resolve(EXPERIMENT_ROOT, "design.lock.json"));
  if (gate.designSha256 !== design) throw new Error("pilot gate was produced against a different design lock");
  return gate;
}
