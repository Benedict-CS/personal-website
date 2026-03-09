export type VariantStats = {
  views: number;
  conversions: number;
};

export type ExperimentEvaluation = {
  conversionRateA: number;
  conversionRateB: number;
  zScore: number;
  pValueApprox: number;
  winner: "A" | "B" | "none";
  significant: boolean;
};

function safeRate(conversions: number, views: number): number {
  if (views <= 0) return 0;
  return Math.max(0, conversions) / views;
}

// Approximate normal CDF-based p-value for two-proportion z-test.
function approxPValueFromZ(z: number): number {
  const x = Math.abs(z);
  // Abramowitz and Stegun approximation
  const t = 1 / (1 + 0.2316419 * x);
  const d = Math.exp((-x * x) / 2) / Math.sqrt(2 * Math.PI);
  const prob =
    d *
    (((((1.330274429 * t - 1.821255978) * t + 1.781477937) * t - 0.356563782) * t + 0.319381530) * t);
  const cdf = 1 - prob;
  const tail = 1 - cdf;
  return Math.max(0, Math.min(1, tail * 2));
}

export function evaluateABExperiment(a: VariantStats, b: VariantStats, alpha = 0.05): ExperimentEvaluation {
  const p1 = safeRate(a.conversions, a.views);
  const p2 = safeRate(b.conversions, b.views);
  const pooledDen = a.views + b.views;
  const pooled = pooledDen > 0 ? (a.conversions + b.conversions) / pooledDen : 0;
  const standardError = Math.sqrt(
    Math.max(0, pooled * (1 - pooled) * ((a.views > 0 ? 1 / a.views : 0) + (b.views > 0 ? 1 / b.views : 0)))
  );
  const zScore = standardError > 0 ? (p2 - p1) / standardError : 0;
  const pValueApprox = approxPValueFromZ(zScore);
  const significant = pValueApprox < alpha;
  const winner = !significant ? "none" : p2 > p1 ? "B" : "A";

  return {
    conversionRateA: p1,
    conversionRateB: p2,
    zScore,
    pValueApprox,
    winner,
    significant,
  };
}

