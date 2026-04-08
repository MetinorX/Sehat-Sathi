import { motion } from "framer-motion";
import RiskGauge from "./RiskGauge";

function categoryClass(category) {
  if (category === "High") return "text-[#C64545]";
  if (category === "Medium") return "text-[#B66E15]";
  return "text-[#2F7C5E]";
}

function deriveInsight(values, category) {
  const glucose = Number(values?.glucose ?? 0);
  const bmi = Number(values?.bmi ?? 0);

  if (glucose >= 140) return "Elevated glucose is the primary risk driver.";
  if (bmi >= 30) return "BMI above 30 is increasing predicted risk.";
  if (category === "Low") return "Current metabolic markers indicate lower short-term risk.";
  return "Combined metabolic and history factors are shaping this estimate.";
}

export default function PredictionPanel({
  loading,
  result,
  connected,
  values,
  requestError,
  estimatedInputs = [],
  confidenceAdjustmentFactor = 1,
}) {
  const riskScore = Math.max(0, Math.min(1, Number(result?.risk_score ?? 0)));
  const category = String(result?.category || "Low");
  const confidence = Math.max(0, Math.min(1, Number(result?.confidence ?? 0)));
  const riskPercent = riskScore * 100;
  const confidencePercent = confidence * 100;
  const insight = deriveInsight(values, category);
  const hasEstimatedInputs = Array.isArray(estimatedInputs) && estimatedInputs.length > 0;

  return (
    <section className="rounded-[28px] border border-[#D8D8DD] bg-white/60 p-4 shadow-[0_14px_34px_rgba(0,0,0,0.06)] backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6E6E73]">Result Panel</p>
          <h3 className="mt-1 text-xl font-semibold text-[#1D1D1F]">Real-Time Clinical Risk</h3>
        </div>
        <span className={`text-xs font-semibold ${connected ? "text-[#2F7C5E]" : "text-[#C64545]"}`}>
          {connected ? "Model Connected" : "Model Offline"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-[150px_1fr] items-center gap-4">
        <RiskGauge riskScore={riskScore} category={category} size={140} />

        <motion.div
          key={`${riskPercent.toFixed(1)}-${category}`}
          initial={{ opacity: 0.45, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-1.5 text-sm text-[#4A4A53]"
        >
          <p>
            Risk Score: <span className="font-semibold text-[#1D1D1F]">{riskPercent.toFixed(1)}%</span>
          </p>
          <p>
            Category: <span className={`font-semibold ${categoryClass(category)}`}>{category}</span>
          </p>
          <p>
            Confidence: <span className="font-semibold text-[#1D1D1F]">{confidencePercent.toFixed(0)}%</span>
          </p>
          {hasEstimatedInputs ? (
            <p className="rounded-lg border border-[#F4D7A6] bg-[#FFF8EB] px-2 py-1 text-xs text-[#8A5A05]">
              Some inputs were estimated. Prediction confidence adjusted ({Math.round(confidenceAdjustmentFactor * 100)}% factor).
            </p>
          ) : null}
          <p className="pt-1 text-xs text-[#6E6E73]">Clinical Insight: {insight}</p>
          {loading ? <p className="text-xs text-[#7A7A84]">Updating prediction...</p> : null}
        </motion.div>
      </div>

      {requestError ? (
        <p className="mt-3 rounded-xl border border-[#F1C3C3] bg-[#FDF4F4] px-3 py-2 text-xs text-[#B13737]">{requestError}</p>
      ) : null}
    </section>
  );
}
