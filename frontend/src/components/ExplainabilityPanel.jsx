import { motion } from "framer-motion";

function formatImpact(impact) {
  const pct = Math.abs(Number(impact || 0) * 100);
  return `${impact >= 0 ? "+" : "-"}${pct.toFixed(1)}%`;
}

export default function ExplainabilityPanel({ explanation = [], loading = false }) {
  const topFactors = [...(explanation || [])]
    .filter((item) => item?.feature)
    .sort((a, b) => Math.abs(Number(b.impact || 0)) - Math.abs(Number(a.impact || 0)))
    .slice(0, 6);

  const maxAbs = Math.max(0.01, ...topFactors.map((item) => Math.abs(Number(item.impact || 0))));

  return (
    <section className="rounded-2xl border border-[#D9D9DE] bg-white/80 p-5 shadow-[0_8px_22px_rgba(0,0,0,0.05)]">
      <h3 className="text-lg font-semibold text-[#1D1D1F]">Explainability</h3>
      <p className="mt-1 text-sm text-[#6E6E73]">Top contributing features ranked by impact magnitude.</p>

      {loading ? (
        <div className="mt-4 space-y-3">
          {[...Array(4)].map((_, idx) => (
            <div key={idx} className="animate-pulse">
              <div className="mb-2 h-3 w-36 rounded bg-[#ECECF1]" />
              <div className="h-2 w-full rounded-full bg-[#ECECF1]" />
            </div>
          ))}
        </div>
      ) : topFactors.length === 0 ? (
        <p className="mt-4 rounded-xl border border-[#E2E2E8] bg-[#FAFAFC] px-3 py-3 text-sm text-[#6E6E73]">
          SHAP explanation data is unavailable for this prediction.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {topFactors.map((item, index) => {
            const impact = Number(item.impact || 0);
            const widthPct = Math.max(4, (Math.abs(impact) / maxAbs) * 100);
            const positive = impact >= 0;

            return (
              <div key={`${item.feature}-${index}`} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-[#1D1D1F]">{item.feature}</span>
                  {item.estimated ? (
                    <span className="ml-2 rounded-full border border-[#F4D7A6] bg-[#FFF8EB] px-1.5 py-0.5 text-[10px] font-semibold text-[#8A5A05]">
                      Estimated
                    </span>
                  ) : null}
                  <span className={positive ? "text-[#C64545] font-semibold" : "text-[#2F6FB1] font-semibold"}>
                    {positive ? "↑" : "↓"} {formatImpact(impact)}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-[#ECECF1]">
                  <motion.div
                    className={`h-2 rounded-full ${positive ? "bg-[#D74A4A]" : "bg-[#4E8BC8]"}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${widthPct}%` }}
                    transition={{ duration: 0.55, delay: index * 0.07, ease: "easeOut" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
