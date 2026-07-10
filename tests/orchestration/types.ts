export const WORKERS = ["sol", "terra", "luna", "opus-4.8"] as const;
export const TOPOLOGIES = ["single", "fanout", "pipeline"] as const;
export const AGENTS_TREATMENTS = ["absent", "neutral", "optimized", "adversarial"] as const;
export const SKILL_TREATMENTS = ["disabled", "implicit", "explicit", "decoy"] as const;
export const EFFORTS = ["low", "medium", "high", "xhigh"] as const;

export type Worker = (typeof WORKERS)[number];
export type Topology = (typeof TOPOLOGIES)[number];
export type AgentsTreatment = (typeof AGENTS_TREATMENTS)[number];
export type SkillTreatment = (typeof SKILL_TREATMENTS)[number];
export type Effort = (typeof EFFORTS)[number];

export interface DelegatedFactors {
  roster: Worker[];
  topology: Topology;
  agents: AgentsTreatment;
  skills: SkillTreatment;
  solEffort: Effort;
  workerEffort: Effort;
}

export interface Assignment extends DelegatedFactors {
  schemaVersion: 1;
  id: string;
  ordinal: number;
}

export interface PilotAssignment {
  schemaVersion: 1;
  id: string;
  ordinal: number;
  kind: "solo-control" | "reference" | "ofat";
  changedFactor: keyof DelegatedFactors | null;
  changedLevel: string | string[] | null;
  factors: DelegatedFactors | null;
}

export interface ChunkDefinition {
  schemaVersion: 1;
  id: string;
  ordinal: number;
  assignmentIds: string[];
}

export type TaskLanguage = "typescript" | "python" | "go";
export type TaskMode = "greenfield" | "brownfield";
export type ScenarioVariant = "clean" | "challenge";

export interface TaskScenario {
  schemaVersion: 1;
  id: string;
  familyId: string;
  language: TaskLanguage;
  mode: TaskMode;
  variant: ScenarioVariant;
  capability: "implementation" | "debugging" | "refactoring" | "ambiguous-intent" | "instruction-conflict" | "pushback";
  fixture: string;
  prompt: string;
  intervention: null | {
    id: string;
    text: string;
    expectedBehavior: string;
  };
}

export interface ModelPins {
  orchestrator: string;
  workers: Record<Worker, string>;
  judges: { gpt: string; claude: string };
}

export interface DesignLock {
  schemaVersion: 1;
  campaignVersion: "v1";
  generatedBy: string;
  seed: string;
  repetitions: 3;
  scenarios: 12;
  assignmentCount: 11520;
  chunkSize: 8;
  chunkCount: 1440;
  candidateExecutionCount: 414720;
  factors: {
    workers: typeof WORKERS;
    topologies: typeof TOPOLOGIES;
    agentsTreatments: typeof AGENTS_TREATMENTS;
    skillTreatments: typeof SKILL_TREATMENTS;
    solEfforts: typeof EFFORTS;
    workerEfforts: typeof EFFORTS;
  };
  hypotheses: string[];
  models: ModelPins;
  cliPins: { codex: string; claude: string; node: string };
  taskHashes: Record<string, string>;
  rubric: RubricDefinition;
  stoppingRules: Record<string, unknown>;
  environment: Record<string, string>;
  artifacts: Record<string, { sha256: string; bytes: number; records?: number }>;
}

export interface RubricDefinition {
  categories: {
    requirements: 30;
    codeQuality: 25;
    directionFollowing: 20;
    intentAndPushback: 25;
  };
  passScore: 80;
  minimumRequirements: 24;
  minimumDirectionFollowing: 16;
  criticalFailureFails: true;
  tieBreakScoreGap: 10;
}

export const RUBRIC: RubricDefinition = {
  categories: {
    requirements: 30,
    codeQuality: 25,
    directionFollowing: 20,
    intentAndPushback: 25,
  },
  passScore: 80,
  minimumRequirements: 24,
  minimumDirectionFollowing: 16,
  criticalFailureFails: true,
  tieBreakScoreGap: 10,
};

export interface RunIdentity {
  schemaVersion: 1;
  id: string;
  campaignVersion: "v1";
  assignmentId: string;
  scenarioId: string;
  repetition: 0 | 1 | 2;
  planFirst: boolean;
}

export interface UsageSnapshot {
  schemaVersion: 1;
  capturedAt: string;
  providers: {
    openai: ProviderAllowance;
    anthropic: ProviderAllowance;
  };
  notes?: string;
}

export interface ProviderAllowance {
  remainingUnits?: number;
  remainingPercent?: number;
  credits?: number;
  resetAt?: string;
  source: "manual-provider-dashboard";
}

export interface UsageEstimate {
  provider: "openai" | "anthropic";
  model: string;
  effort: Effort;
  role: "orchestrator" | "worker" | "judge";
  taskClass: string;
  upperUnits: number;
  meanUnits: number;
  sampleSize: number;
  confidence: number;
}

export interface ReservationRequest {
  runId: string;
  openaiUnits: number;
  anthropicUnits: number;
}

export interface Reservation extends ReservationRequest {
  epochId?: string;
  reservedAt: string;
  state: "reserved" | "settled" | "released";
  actualOpenaiUnits?: number;
  actualAnthropicUnits?: number;
}

export interface JudgeScore {
  judgeFamily: "gpt" | "claude";
  judgeModel: string;
  blindedCandidate: string;
  requirements: number;
  codeQuality: number;
  directionFollowing: number;
  intentAndPushback: number;
  criticalFailure: boolean;
  pass: boolean;
  evidence: string[];
}

export interface DeterministicChecks {
  hiddenTests: boolean;
  build: boolean;
  typecheck: boolean;
  lint: boolean;
  staticAnalysis: boolean;
  requiredChanges: boolean;
  forbiddenChanges: boolean;
  patchScope: boolean;
  repositoryIntegrity: boolean;
  requirementCompliance: boolean;
  topologyCompliance: boolean;
  criticalFailures: string[];
}

export type RunStatus = "pending" | "reserved" | "running" | "candidate-complete" | "judged" | "blocked";
export type ChunkArchiveState = "local" | "pushed" | "verified" | "cleaned";
