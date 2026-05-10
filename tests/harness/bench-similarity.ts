import matter from "gray-matter";
import type { SingleRunResult, OutlierRun } from "./bench-types.js";

function bigrams(text: string): Set<string> {
  const s = new Set<string>();
  for (let i = 0; i < text.length - 1; i++) {
    s.add(text.slice(i, i + 2));
  }
  return s;
}

function jaccardSets<T>(a: Set<T>, b: Set<T>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const v of a) if (b.has(v)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 1 : intersection / union;
}

function flattenObject(
  obj: Record<string, unknown>,
  prefix = "",
): Map<string, string> {
  const result = new Map<string, string>();
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const [k, v] of flattenObject(
        value as Record<string, unknown>,
        path,
      )) {
        result.set(k, v);
      }
    } else {
      result.set(path, JSON.stringify(value));
    }
  }
  return result;
}

function structuralSimilarity(a: string, b: string): number {
  let mA: ReturnType<typeof matter>;
  let mB: ReturnType<typeof matter>;
  try {
    mA = matter(a);
    mB = matter(b);
  } catch {
    return 0;
  }

  const flatA = flattenObject(mA.data);
  const flatB = flattenObject(mB.data);
  const keysA = new Set(flatA.keys());
  const keysB = new Set(flatB.keys());

  const keyJaccard = jaccardSets(keysA, keysB);

  const commonKeys = [...keysA].filter((k) => keysB.has(k));
  const valueMatches = commonKeys.filter(
    (k) => flatA.get(k) === flatB.get(k),
  ).length;
  const valueRatio = commonKeys.length === 0 ? 1 : valueMatches / commonKeys.length;

  return (keyJaccard + valueRatio) / 2;
}

function textualSimilarity(a: string, b: string): number {
  function extractProse(text: string): string {
    const parsed = matter(text);
    return parsed.content.trim();
  }
  try {
    const proseA = extractProse(a);
    const proseB = extractProse(b);
    return jaccardSets(bigrams(proseA), bigrams(proseB));
  } catch {
    return jaccardSets(bigrams(a), bigrams(b));
  }
}

export function pairwiseSimilarity(a: string, b: string): number {
  return 0.6 * structuralSimilarity(a, b) + 0.4 * textualSimilarity(a, b);
}

export function computeConsistency(runs: SingleRunResult[]): {
  meanPairwiseSimilarity: number;
  medoidIndex: number;
  medoidAvgSimilarity: number;
  outliers: OutlierRun[];
} {
  const n = runs.length;
  if (n <= 1) {
    return {
      meanPairwiseSimilarity: 1,
      medoidIndex: 0,
      medoidAvgSimilarity: 1,
      outliers: [],
    };
  }

  const sim = Array.from({ length: n }, () => new Float64Array(n));
  let totalPairwise = 0;
  let pairCount = 0;

  for (let i = 0; i < n; i++) {
    sim[i][i] = 1;
    for (let j = i + 1; j < n; j++) {
      const s = pairwiseSimilarity(runs[i].stdout, runs[j].stdout);
      sim[i][j] = s;
      sim[j][i] = s;
      totalPairwise += s;
      pairCount++;
    }
  }

  const avgPerRun = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < n; j++) if (j !== i) sum += sim[i][j];
    avgPerRun[i] = sum / (n - 1);
  }

  let medoidIndex = 0;
  for (let i = 1; i < n; i++) {
    if (avgPerRun[i] > avgPerRun[medoidIndex]) medoidIndex = i;
  }

  const simToMedoid = new Float64Array(n);
  for (let i = 0; i < n; i++) simToMedoid[i] = sim[i][medoidIndex];

  let mean = 0;
  for (let i = 0; i < n; i++) mean += simToMedoid[i];
  mean /= n;

  let variance = 0;
  for (let i = 0; i < n; i++) variance += (simToMedoid[i] - mean) ** 2;
  const stddev = Math.sqrt(variance / n);
  const threshold = mean - 2 * stddev;

  const outliers: OutlierRun[] = [];
  for (let i = 0; i < n; i++) {
    if (i !== medoidIndex && simToMedoid[i] < threshold) {
      outliers.push({ index: runs[i].index, similarityToMedoid: simToMedoid[i] });
    }
  }

  return {
    meanPairwiseSimilarity: pairCount > 0 ? totalPairwise / pairCount : 1,
    medoidIndex: runs[medoidIndex].index,
    medoidAvgSimilarity: avgPerRun[medoidIndex],
    outliers,
  };
}
