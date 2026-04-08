import { motion } from "framer-motion";
import { BrainCircuit } from "lucide-react";

export default function LungExplainability({ findings = [], loading = false }) {
  const topFactors = (findings || []).slice(0, 3).map((item, index) => ({
    label: item?.description || `Pulmonary texture signal ${index + 1}`,
    region: item?.location || (index === 0 ? "Upper lobe anomaly" : "Texture irregularity"),
    confidence: Math.max(0, Math.min(1, Number(item?.confidence ?? 0.4))),
  }));

  return (
    <section className="rounded-2xl border border-[#D8D8DD] bg-white/80 p-4">
      <div className="flex items-center gap-2">
        <span className="rounded-lg bg-[#EEF2FF] p-1.5 text-[#4F46E5]">
          <BrainCircuit className="h-4 w-4" />
        </span>
        <h4 className="text-sm font-semibold text-[#1D1D1F]">Explainability</h4>
      </div>

      {loading ? (
        <div className="mt-3 space-y-2">
          {[...Array(2)].map((_, idx) => (
            <div key={idx} className="animate-pulse rounded-lg bg-[#ECECF1] p-3" />
          ))}
        </div>
      ) : topFactors.length === 0 ? (
        <p className="mt-3 text-sm text-[#6E6E73]">No contributing regions available yet.</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {topFactors.map((item) => (
            <li key={item.label} className="rounded-lg border border-[#E3E3E8] bg-[#FAFAFC] p-3">
              <p className="text-sm font-medium text-[#1D1D1F]">{item.region}</p>
              <p className="mt-1 text-xs text-[#6E6E73]">{item.label}</p>
              <div className="mt-2 h-1.5 rounded-full bg-[#E8E8ED]">
                <motion.div
                  className="h-1.5 rounded-full bg-[#F59E0B]"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(3, item.confidence * 100)}%` }}
                  transition={{ duration: 0.45 }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

