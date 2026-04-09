"use client";

type Props = {
  experimentLabel?: string;
  variantA?: string;
  variantB?: string;
  /** Display-only demo percentages when no live data is wired */
  pctA?: number;
  pctB?: number;
};

/**
 * Visual A/B split bar for MDX — placeholder-friendly for dashboards without live experiments.
 */
export function AbTestStats({
  experimentLabel = "Experiment",
  variantA = "A",
  variantB = "B",
  pctA = 52,
  pctB = 48,
}: Props) {
  const total = Math.max(1, pctA + pctB);
  const wA = Math.round((pctA / total) * 100);
  const wB = 100 - wA;

  return (
    <div className="not-prose my-8 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{experimentLabel}</p>
      <div className="mt-3 flex h-10 overflow-hidden rounded-lg text-xs font-medium text-white">
        <div
          className="flex items-center justify-center bg-slate-800 transition-[width] duration-500"
          style={{ width: `${wA}%` }}
          title={`${variantA}: ${wA}%`}
        >
          {variantA} {wA}%
        </div>
        <div
          className="flex items-center justify-center bg-slate-500 transition-[width] duration-500"
          style={{ width: `${wB}%` }}
          title={`${variantB}: ${wB}%`}
        >
          {variantB} {wB}%
        </div>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">Illustrative split — connect live data in the CMS when available.</p>
    </div>
  );
}
