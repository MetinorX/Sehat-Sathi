import { motion } from "framer-motion";

function categoryColor(category) {
  if (category === "High") return "text-[#EF4444]";
  if (category === "Medium") return "text-[#F59E0B]";
  return "text-[#10B981]";
}

function clinicalMessage(category) {
  if (category === "High") return "Consult physician";
  if (category === "Medium") return "Monitor lifestyle";
  return "Within normal range";
}

function SkeletonGauge() {
  return (
    <div className="flex items-center gap-4">
      <div className="h-28 w-28 animate-pulse rounded-full border border-[rgba(0,0,0,0.08)] bg-gray-100" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-32 animate-pulse rounded bg-gray-100" />
        <div className="h-3.5 w-28 animate-pulse rounded bg-gray-100" />
        <div className="h-3.5 w-40 animate-pulse rounded bg-gray-100" />
      </div>
    </div>
  );
}

export default function PredictionResult({ loading, result, requestError }) {
  const hasResult = Boolean(result && result.risk_score !== undefined);
  const riskScore = Number(result?.risk_score ?? 0);
  const category = String(result?.category || "Low");
  const pct = Math.max(0, Math.min(100, riskScore * 100));

  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-[rgba(255,255,255,0.6)] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.05)] backdrop-blur-xl">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Result</p>
      <h3 className="mt-1 text-lg font-semibold text-gray-900">Clinical Risk Output</h3>

      <div className="mt-4 min-h-[160px]">
        {loading ? (
          <SkeletonGauge />
        ) : !hasResult ? (
          <div className="flex h-[160px] items-center justify-center rounded-xl border border-[rgba(0,0,0,0.08)] bg-white/70 px-4 text-sm text-gray-500">
            Run prediction to see real model output.
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="relative">
              <svg className="h-28 w-28 -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
                <circle cx="60" cy="60" r={radius} className="fill-none stroke-[rgba(0,0,0,0.1)]" strokeWidth="10" />
                <motion.circle
                  cx="60"
                  cy="60"
                  r={radius}
                  className="fill-none stroke-[#2563EB]"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  animate={{ strokeDashoffset: offset }}
                  transition={{ duration: 0.45 }}
                />
              </svg>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-lg font-semibold text-gray-900">
                {pct.toFixed(1)}%
              </div>
            </div>

            <div className="space-y-1.5 text-sm text-gray-600">
              <p>
                Risk Score: <span className="font-semibold text-gray-900">{pct.toFixed(1)}%</span>
              </p>
              <p>
                Category: <span className={`font-semibold ${categoryColor(category)}`}>{category}</span>
              </p>
              <p>
                Confidence: <span className="font-semibold text-gray-900">{Math.round((Number(result?.confidence ?? 0) || 0) * 100)}%</span>
              </p>
              <p className="pt-1 text-xs text-gray-500">{clinicalMessage(category)}</p>
              <p className="text-[11px] text-gray-400">Source: {String(result?.source || "unknown")}</p>
            </div>
          </div>
        )}
      </div>

      {requestError ? (
        <p className="mt-3 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-sm text-[#B91C1C]">{requestError}</p>
      ) : null}
    </div>
  );
}
