import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, LoaderCircle } from "lucide-react";

const LABELS = {
  file_format: "File format",
  dicom_metadata: "DICOM metadata",
  modality: "X-ray detected",
  view: "Chest region/view confirmed",
  lung_detected: "Lung segmentation",
  quality: "Image quality acceptable",
  clinical_sanity: "Clinical sanity checks",
};

function statusTone(status) {
  if (status === "pass") return "text-[#2F7C5E]";
  if (status === "warn") return "text-[#B66E15]";
  if (status === "running") return "text-[#2F6FB1]";
  return "text-[#C64545]";
}

export default function LungValidationPanel({ validation, loading, rejected }) {
  const score = Number(validation?.score ?? 0);
  const checks = validation?.checks || {};
  const warnings = validation?.warnings || [];
  const status = String(validation?.status || "");
  const caution = status === "accepted_with_warning" && !rejected;
  const trustLabel =
    status === "blocked" || rejected
      ? "🔴 Low Trust / Blocked"
      : score >= 75
        ? "🟢 High Trust"
        : score >= 60
          ? "🟡 Moderate Trust"
          : "🔴 Low Trust / Blocked";

  const progress = loading
    ? 65
    : validation
      ? Math.max(6, Math.min(100, score))
      : 0;

  return (
    <section className="rounded-2xl border border-[#D8D8DD] bg-white/60 p-4 backdrop-blur-xl">
      <h3 className="text-sm font-semibold text-[#1D1D1F]">Validation Panel</h3>
      <p className="mt-1 text-xs text-[#6E6E73]">Hospital-grade pre-inference safety gate</p>

      <div className="mt-3">
        <div className="h-2 rounded-full bg-[#E8E8ED]">
          <motion.div
            className="h-2 rounded-full bg-[#2F6FB1]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-[#6E6E73]">
          <span>{loading ? "Validating..." : "Validation score"}</span>
          <span className="font-semibold text-[#1D1D1F]">{validation ? `${score.toFixed(0)}/100` : "--/100"}</span>
        </div>
      </div>

      {!loading && validation ? (
        <div className="mt-2 text-xs font-semibold text-[#4A4A53]">{trustLabel}</div>
      ) : null}

      <div className="mt-3 space-y-1.5">
        {Object.entries(LABELS).map(([key, label]) => {
          const status = loading ? "running" : checks[key] || "fail";
          return (
            <div key={key} className="flex items-center justify-between rounded-lg bg-white/70 px-2.5 py-2 text-xs">
              <span className="text-[#4A4A53]">{label}</span>
              <span className={`inline-flex items-center gap-1 font-semibold ${statusTone(status)}`}>
                {status === "running" ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : null}
                {status === "pass" ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                {status === "warn" ? <AlertTriangle className="h-3.5 w-3.5" /> : null}
                {status}
              </span>
            </div>
          );
        })}
      </div>

      {warnings.length ? (
        <div className="mt-3 rounded-lg border border-[#F4D7A6] bg-[#FFF8EB] p-2.5 text-xs text-[#8A5A05]">
          {warnings[0]}
        </div>
      ) : null}

      {caution ? (
        <div className="mt-3 rounded-lg border border-[#F4D7A6] bg-[#FFF8EB] p-2.5 text-xs font-semibold text-[#8A5A05]">
          Proceeding with caution
        </div>
      ) : null}

      {rejected ? (
        <div className="mt-3 rounded-lg border border-[#F1C3C3] bg-[#FDF4F4] p-2.5 text-xs text-[#B13737]">
          Scan rejected: Not a valid chest X-ray
        </div>
      ) : null}
    </section>
  );
}

