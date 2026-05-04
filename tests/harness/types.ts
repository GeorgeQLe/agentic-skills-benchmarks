export interface SkillMeta {
  name: string;
  description: string;
  type: string;
  version: string;
  "argument-hint"?: string;
  [key: string]: unknown;
}

export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  workDir: string;
  files: string[];
}

export interface Assertion {
  description: string;
  pass: boolean;
  detail?: string;
}
