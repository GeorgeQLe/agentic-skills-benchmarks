export const BENCH_BUDGETS_USD = {
  smoke: 0.25,
  standard: 1.0,
  expanded: 1.5,
} as const;

export const BENCH_TIMEOUTS_MS = {
  smoke: 180_000,
  standard: 300_000,
  focused: 240_000,
} as const;
