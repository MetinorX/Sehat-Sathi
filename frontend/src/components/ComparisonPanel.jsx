import { motion } from "framer-motion";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

function trustLabel(score, status) {
  if (status === "blocked" || score < 60) return "🔴 Blocked";
  if (score >= 75) return "🟢 High Trust";
  return "🟡 Moderate Trust";
}

function confidenceStroke(confidence) {
  const clamped = Math.max(0, Math.min(1, Number(confidence || 0)));
  return 2 * Math.PI * 46 * (1 - clamped);
}

function renderExplainability(task, explainability, sourceImageUrl) {
  if (task === "diabetes") {
    const rows = (explainability?.features || []).slice(0, 6).map((item) => ({
      name: item.name,
      impact: Number(item.impact || 0),
      magnitude: Math.abs(Number(item.impact || 0)),
    }));
    if (!rows.length) {
      return <p className="text-sm text-[#6E6E73]">No SHAP factors available.</p>;
    }
    return (
      <div className="h-56 w-full" aria-label="SHAP feature contribution chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" width={95} tick={{ fontSize: 11, fill: "#4A4A53" }} />
            <Tooltip
              formatter={(value, _name, payload) => [`${Number(value).toFixed(3)}`, payload?.payload?.impact > 0 ? "Risk increase" : "Risk decrease"]}
              cursor={{ fill: "rgba(47,111,177,0.08)" }}
            />
            <Bar dataKey="magnitude" radius={[5, 5, 5, 5]} fill="#2F6FB1" isAnimationActive animationDuration={450} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (!explainability?.heatmap_url) {
    return <p className="text-sm text-[#6E6E73]">No Grad-CAM heatmap available.</p>;
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-[#D9D9DE] bg-white">
      {sourceImageUrl ? (
        <img src={sourceImageUrl} alt="Original scan" className="h-52 w-full object-cover" />
      ) : (
        <div className="flex h-52 w-full items-center justify-center bg-[#F3F5FA] text-xs text-[#6E6E73]">
          Source scan not available
        </div>
      )}
      <img
        src={explainability.heatmap_url}
        alt="AI heatmap overlay"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover mix-blend-multiply opacity-55"
      />
    </div>
  );
}

export default function ComparisonPanel({
  predictionData,
  llmExplanation,
  llmLoading = false,
  predictionLoading = false,
  sourceImageUrl = "",
}) {
  if (!predictionData) return null;

  const status = String(predictionData?.validation?.status || "");
  const score = Number(predictionData?.validation?.score ?? 0);
  const blocked = status === "blocked" || score < 60;
  const trust = trustLabel(score, status);
  const confidence = Math.max(0, Math.min(1, Number(predictionData?.prediction?.confidence ?? 0)));

  return (
    <section className="rounded-2xl border border-[#D9D9DE] bg-white/60 p-5 shadow-[0_12px_30px_rgba(0,0,0,0.05)] backdrop-blur-xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xl font-semibold text-[#1D1D1F]">Dynamic AI Comparison Panel</h3>
        <span className="rounded-full border border-[#DADAE0] bg-white px-3 py-1 text-xs font-semibold text-[#4A4A53]">
          {trust} • Score {score.toFixed(0)}/100
        </span>
      </div>

      {blocked ? (
        <div className="rounded-xl border border-[#F1C3C3] bg-[#FDF4F4] p-4">
          <p className="text-base font-semibold text-[#B13737]">🚫 Analysis Blocked</p>
          <p className="mt-1 text-sm text-[#7A2E2E]">Uploaded input did not pass clinical validation gating.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-xl border border-[#D9D9DE] bg-white/75 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6E6E73]">Our System</p>
            <div className="mt-3 flex items-center gap-4">
              <div className="relative h-28 w-28" aria-label={`Confidence ${(confidence * 100).toFixed(0)} percent`}>
                <svg className="h-28 w-28 -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
                  <circle cx="60" cy="60" r="46" stroke="#E6E6EC" strokeWidth="10" fill="none" />
                  <motion.circle
                    cx="60"
                    cy="60"
                    r="46"
                    stroke="#2F6FB1"
                    strokeWidth="10"
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={2 * Math.PI * 46}
                    animate={{ strokeDashoffset: confidenceStroke(confidence) }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-[#1D1D1F]">
                  {(confidence * 100).toFixed(0)}%
                </div>
              </div>
              <div>
                <p className="text-sm text-[#6E6E73]">Prediction</p>
                <p className="text-lg font-semibold text-[#1D1D1F]">{predictionData?.prediction?.label || "Unknown"}</p>
              </div>
            </div>
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#6E6E73]">Explainability</p>
              {predictionLoading ? (
                <div className="h-40 animate-pulse rounded-lg bg-[#ECECF1]" />
              ) : (
                renderExplainability(predictionData?.task, predictionData?.explainability, sourceImageUrl)
              )}
            </div>
          </article>

          <article className="rounded-xl border border-[#D9D9DE] bg-white/75 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6E6E73]">AI Explanation (Non-diagnostic)</p>
            {llmLoading ? (
              <div className="mt-3 space-y-2">
                <div className="h-4 animate-pulse rounded bg-[#ECECF1]" />
                <div className="h-4 animate-pulse rounded bg-[#ECECF1]" />
                <div className="h-16 animate-pulse rounded bg-[#ECECF1]" />
              </div>
            ) : (
              <div className="mt-3 space-y-3 text-sm text-[#4A4A53]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6E6E73]">Summary</p>
                  <p>{llmExplanation?.summary || "Summary unavailable."}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6E6E73]">Limitations</p>
                  <p>{llmExplanation?.limitations || "Limitations unavailable."}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6E6E73]">Advice</p>
                  <p>{llmExplanation?.advice || "Seek clinician review."}</p>
                </div>
              </div>
            )}
          </article>
        </div>
      )}

      <div className="mt-4 rounded-lg border border-[#D9D9DE] bg-white/70 px-3 py-2 text-xs text-[#4A4A53]">
        Clinical decision support only. Not a diagnosis.
      </div>
    </section>
  );
}

