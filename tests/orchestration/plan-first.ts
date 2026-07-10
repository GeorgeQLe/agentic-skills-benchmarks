import { writeFileSync } from "node:fs";
import { contentId, jsonLines } from "./canonical.js";
import type { Assignment } from "./types.js";

export interface PairedPlanObservation {
  scenarioId: string;
  repetition: number;
  plain: { score: number; tokens: number; latencyMs: number };
  planFirst: { score: number; tokens: number; latencyMs: number };
}

export interface PlanFirstDecision {
  promote: boolean;
  reason: string;
  pairs: number;
  meanQualityDelta: number;
  qualityLower95: number;
  tokenImprovement: number;
  latencyImprovement: number;
  path: "quality-superiority" | "noninferiority-efficiency" | "reject";
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function evaluatePlanFirst(observations: PairedPlanObservation[]): PlanFirstDecision {
  if (observations.length !== 36) throw new Error(`plan-first decision requires all 36 paired task/repetition observations, got ${observations.length}`);
  const keys = new Set(observations.map((observation) => `${observation.scenarioId}:${observation.repetition}`));
  if (keys.size !== 36) throw new Error("plan-first observations contain duplicate task/repetition pairs");
  const deltas = observations.map((observation) => observation.planFirst.score - observation.plain.score);
  const qualityDelta = mean(deltas);
  const variance = deltas.reduce((sum, delta) => sum + (delta - qualityDelta) ** 2, 0) / (deltas.length - 1);
  const lower95 = qualityDelta - 1.96 * Math.sqrt(variance / deltas.length);
  const plainTokens = observations.reduce((sum, observation) => sum + observation.plain.tokens, 0);
  const planTokens = observations.reduce((sum, observation) => sum + observation.planFirst.tokens, 0);
  const plainLatency = observations.reduce((sum, observation) => sum + observation.plain.latencyMs, 0);
  const planLatency = observations.reduce((sum, observation) => sum + observation.planFirst.latencyMs, 0);
  const tokenImprovement = plainTokens === 0 ? 0 : (plainTokens - planTokens) / plainTokens;
  const latencyImprovement = plainLatency === 0 ? 0 : (plainLatency - planLatency) / plainLatency;
  const superiority = lower95 > 0;
  const noninferior = lower95 >= -2;
  const efficient = tokenImprovement >= 0.1 || latencyImprovement >= 0.1;
  const path: PlanFirstDecision["path"] = superiority ? "quality-superiority" : noninferior && efficient ? "noninferiority-efficiency" : "reject";
  return {
    promote: path !== "reject",
    reason: superiority
      ? "paired quality improvement has a positive 95% lower bound"
      : noninferior && efficient
        ? "quality is non-inferior within two points with at least 10% token or latency improvement"
        : "promotion threshold was not met",
    pairs: observations.length,
    meanQualityDelta: Number(qualityDelta.toFixed(6)),
    qualityLower95: Number(lower95.toFixed(6)),
    tokenImprovement: Number(tokenImprovement.toFixed(6)),
    latencyImprovement: Number(latencyImprovement.toFixed(6)),
    path,
  };
}

export interface V2Assignment extends Assignment {
  campaignVersion: "v2";
  planFirst: boolean;
  v1AssignmentId: string;
}

export function generateV2Assignments(v1: Assignment[], decision: PlanFirstDecision): V2Assignment[] {
  if (!decision.promote) throw new Error("plan-first was not promoted; v2 manifest generation is denied");
  const rows: V2Assignment[] = [];
  for (const assignment of v1) {
    for (const planFirst of [false, true]) {
      const identity = { v1AssignmentId: assignment.id, planFirst };
      rows.push({
        ...assignment,
        campaignVersion: "v2",
        planFirst,
        v1AssignmentId: assignment.id,
        id: contentId("cfg-v2", identity),
        ordinal: rows.length,
      });
    }
  }
  if (rows.length !== 23_040) throw new Error(`expected 23040 v2 rows, got ${rows.length}`);
  return rows;
}

export function writeV2Manifest(path: string, assignments: Assignment[], decision: PlanFirstDecision): void {
  writeFileSync(path, jsonLines(generateV2Assignments(assignments, decision)), { flag: "wx" });
}
