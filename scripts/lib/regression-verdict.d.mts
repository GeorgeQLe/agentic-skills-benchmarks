export const THRESHOLD: number;
export const STATUS_RANK: Record<string, number>;

export interface Grade {
  passRate?: number | null;
  wilsonLower?: number | null;
  averageScore?: number | null;
  status?: string;
  evaluatedRuns?: number;
}

export interface VerdictResult {
  verdict: "baseline" | "regression" | "improvement" | "stable" | "blocked";
  reasons: string[];
  infraBlocked?: boolean;
}

export function classifyVerdict(args: { prior: Grade | null | undefined; grade: Grade }): VerdictResult;
