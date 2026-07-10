import { readFileSync, writeFileSync } from "node:fs";
import { enforceCalibrationAllowanceCap, readUsageSnapshot, type CalibrationProfile } from "./budget.js";
import type { Effort, UsageEstimate } from "./types.js";

export interface CalibrationSample {
  provider: "openai" | "anthropic";
  model: string;
  effort: Effort;
  role: "orchestrator" | "worker" | "judge";
  taskClass: string;
  allowanceUnits: number;
}

export interface CalibrationObservations {
  schemaVersion: 1;
  candidateExecutions: number;
  judgeCalls: number;
  samples: CalibrationSample[];
}

export function buildCalibrationProfile(input: {
  beforePath: string;
  afterPath: string;
  observationsPath: string;
}): CalibrationProfile {
  const before = readUsageSnapshot(input.beforePath);
  const after = readUsageSnapshot(input.afterPath);
  if (Date.parse(after.capturedAt) <= Date.parse(before.capturedAt)) throw new Error("post-calibration snapshot must be newer than the pre-calibration snapshot");
  const observations = JSON.parse(readFileSync(input.observationsPath, "utf8")) as CalibrationObservations;
  if (observations.candidateExecutions > 24) throw new Error("calibration exceeds the 24-candidate cap");
  if (observations.judgeCalls > 60) throw new Error("calibration exceeds the 60-judge-call cap");
  const beforeOpenai = before.providers.openai.remainingUnits ?? before.providers.openai.credits ?? before.providers.openai.remainingPercent ?? 0;
  const afterOpenai = after.providers.openai.remainingUnits ?? after.providers.openai.credits ?? after.providers.openai.remainingPercent ?? 0;
  const beforeAnthropic = before.providers.anthropic.remainingUnits ?? before.providers.anthropic.credits ?? before.providers.anthropic.remainingPercent ?? 0;
  const afterAnthropic = after.providers.anthropic.remainingUnits ?? after.providers.anthropic.credits ?? after.providers.anthropic.remainingPercent ?? 0;
  enforceCalibrationAllowanceCap(before, Math.max(0, beforeOpenai - afterOpenai), Math.max(0, beforeAnthropic - afterAnthropic));

  const groups = new Map<string, CalibrationSample[]>();
  for (const sample of observations.samples) {
    if (!Number.isFinite(sample.allowanceUnits) || sample.allowanceUnits <= 0) throw new Error("calibration sample units must be positive");
    const key = [sample.provider, sample.model, sample.effort, sample.role, sample.taskClass].join("\0");
    const group = groups.get(key) ?? [];
    group.push(sample);
    groups.set(key, group);
  }
  const estimates: UsageEstimate[] = [...groups.values()].map((samples) => {
    const first = samples[0];
    const units = samples.map((sample) => sample.allowanceUnits).sort((a, b) => a - b);
    const meanUnits = units.reduce((sum, value) => sum + value, 0) / units.length;
    const maximum = units.at(-1)!;
    return {
      provider: first.provider,
      model: first.model,
      effort: first.effort,
      role: first.role,
      taskClass: first.taskClass,
      meanUnits: Number(meanUnits.toFixed(6)),
      upperUnits: Number((maximum * 1.2).toFixed(6)),
      sampleSize: units.length,
      confidence: units.length >= 3 ? 0.95 : 0.7,
    };
  });
  return {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    beforeSnapshot: input.beforePath,
    afterSnapshot: input.afterPath,
    candidateExecutions: observations.candidateExecutions,
    judgeCalls: observations.judgeCalls,
    estimates,
  };
}

export function writeSnapshotTemplate(path: string): void {
  const template = {
    schemaVersion: 1,
    capturedAt: new Date().toISOString(),
    providers: {
      openai: { remainingUnits: 0, remainingPercent: 0, resetAt: "", source: "manual-provider-dashboard" },
      anthropic: { remainingUnits: 0, remainingPercent: 0, resetAt: "", source: "manual-provider-dashboard" },
    },
    notes: "Enter values observed manually in provider subscription Usage dashboards. Units are estimates, not API spend or exact USD cost.",
  };
  writeFileSync(path, `${JSON.stringify(template, null, 2)}\n`, { flag: "wx" });
}
