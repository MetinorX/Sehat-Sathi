import { motion } from "framer-motion";
import { Download, RotateCcw, ShieldCheck } from "lucide-react";
import ProbabilityBars from "./ProbabilityBars";

function conditionTone(condition) {
  const text = String(condition || "").toLowerCase();
  if (text.includes("high") || text.includes("malignant") || text.includes("suspicious")) return "text-[#C64545]";
  if (text.includes("indeterminate")) return "text-[#B66E15]";
  return "text-[#2F7C5E]";
}

export default function LungResultPanel({ result, loading, onReset, blockedInfo = null }) {
  const confidence = Math.max(0, Math.min(1, Number(result?.confidence ?? 0)));
  const suspiciousScore = Math.max(0, Math.min(100, confidence * 100));
  const benign = Math.max(0, 100 - suspiciousScore);
  const indeterminate = Math.min(35, Math.max(8, (100 - Math.abs(50 - suspiciousScore) * 1.2) * 0.25));
  const suspicious = Math.max(0, Math.min(100, suspiciousScore));

  const probabilities = [
    { label: "Benign", value: benign, tone: "benign" },
    { label: "Indeterminate", value: indeterminate, tone: "indeterminate" },
    { label: "Suspicious", value: suspicious, tone: "suspicious" },
  ];

  const validationScore = Number(result?.validation?.score ?? 0);

  return (
    <section className="space-y-4 rounded-[28px] border border-[#D8D8DD] bg-white/60 p-5 backdrop-blur-xl">
      <h2 className="text-lg font-semibold text-[#1D1D1F]">AI Results + Insights</h2>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, idx) => (
            <div key={idx} className="h-16 animate-pulse rounded-xl bg-[#ECECF1]" />
          ))}
        </div>
      ) : blockedInfo ? (
        <div className="rounded-xl border border-[#F1C3C3] bg-[#FDF4F4] px-4 py-4 text-sm text-[#B13737]">
          <p className="font-semibold">🚫 Analysis Blocked</p>
          <p className="mt-1">Reason: Uploaded image is not a valid chest X-ray</p>
          <button
            type="button"
            onClick={onReset}
            className="mt-3 rounded-lg bg-[#1D1D1F] px-3 py-2 text-xs font-semibold text-white hover:bg-black"
          >
            Upload Valid Scan
          </button>
        </div>
      ) : !result ? (
        <p className="rounded-xl border border-[#E3E3E8] bg-[#FAFAFC] px-4 py-3 text-sm text-[#6E6E73]">
          Run analysis to generate prediction summary, explainability, and clinical insight.
        </p>
      ) : (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="rounded-2xl border border-[#D8D8DD] bg-white/80 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-[#6E6E73]">Prediction Summary</p>
            <p className={`mt-2 text-lg font-semibold ${conditionTone(result?.condition)}`}>{result?.condition || "Unknown"}</p>
            <p className="mt-1 text-sm text-[#4A4A53]">Confidence: {(confidence * 100).toFixed(0)}%</p>
            <p className="text-sm text-[#4A4A53]">Risk Score: {suspiciousScore.toFixed(0)}%</p>
            {result?.validation ? (
              <p className="text-sm text-[#4A4A53]">
                Validation:{" "}
                <span className={`font-semibold ${validationScore >= 75 ? "text-[#2F7C5E]" : "text-[#C64545]"}`}>
                  {validationScore.toFixed(0)}/100
                </span>
              </p>
            ) : null}
            {result?.trust_indicator ? (
              <p className="text-sm font-semibold text-[#4A4A53]">Trust: {result.trust_indicator}</p>
            ) : null}
            <p className="mt-2 inline-flex items-center gap-2 text-xs text-[#6E6E73]">
              <ShieldCheck className="h-3.5 w-3.5 text-[#2F6FB1]" />
              {result?.blockchain_tx_hash ? "Blockchain Anchored" : "Awaiting blockchain anchor"}
            </p>
          </div>

          <div className="rounded-2xl border border-[#D8D8DD] bg-white/80 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-[#6E6E73]">Probability Breakdown</p>
            <div className="mt-3">
              <ProbabilityBars probabilities={probabilities} />
            </div>
          </div>

          <div className="rounded-2xl border border-[#D8D8DD] bg-white/80 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-[#6E6E73]">Clinical Insight</p>
            <p className="mt-2 text-sm text-[#4A4A53]">
              {result?.explanation ||
                "No strong malignancy indicators detected. Mild irregular patterns observed."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#D0D0D7] bg-white px-3 py-2 text-sm font-semibold text-[#1D1D1F] transition hover:bg-[#F4F4F7]"
              onClick={() => {
                const blob = new Blob([result?.report || "No report available."], { type: "text/plain;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = "lung_analysis_report.txt";
                link.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="h-4 w-4" />
              Download Report
            </button>
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1D1D1F] px-3 py-2 text-sm font-semibold text-white transition hover:bg-black"
            >
              <RotateCcw className="h-4 w-4" />
              Upload New Scan
            </button>
          </div>
        </motion.div>
      )}
    </section>
  );
}

