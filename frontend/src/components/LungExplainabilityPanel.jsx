import { motion } from "framer-motion";

export default function LungExplainabilityPanel({ regions = [], selectedRegion, method = "saliency" }) {
  const top = (regions || []).slice(0, 3);
  const selected = selectedRegion || top[0] || null;

  return (
    <section className="rounded-2xl border border-[#D8D8DD] bg-white/70 p-4 backdrop-blur-xl">
      <h4 className="text-sm font-semibold text-[#1D1D1F]">Lung Explainability</h4>
      <p className="mt-1 text-xs text-[#6E6E73]">Method: {String(method).toUpperCase()}</p>

      {!top.length ? (
        <p className="mt-3 text-sm text-[#6E6E73]">No explainability regions available yet.</p>
      ) : (
        <>
          <div className="mt-3 space-y-2">
            {top.map((region) => (
              <div
                key={`${region.label}-${region.x}-${region.y}`}
                className={`rounded-lg border p-2.5 ${
                  selected?.label === region.label ? "border-[#F59E0B] bg-[#FFF7E8]" : "border-[#E4E4EA] bg-white/70"
                }`}
              >
                <p className="text-sm font-medium text-[#1D1D1F]">{region.label}</p>
                <p className="text-xs text-[#6E6E73]">Contribution: {(Math.max(0, Number(region.confidence || 0)) * 100).toFixed(1)}%</p>
              </div>
            ))}
          </div>

          {selected ? (
            <motion.div
              key={`${selected.label}-${selected.x}-${selected.y}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 rounded-lg border border-[#DCE7FF] bg-[#F4F8FF] p-3"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#2F6FB1]">Clinical Explanation</p>
              <p className="mt-1 text-sm text-[#334155]">
                {selected.explanation ||
                  "Model detected irregular tissue density in upper lung region, commonly associated with early-stage abnormalities."}
              </p>
            </motion.div>
          ) : null}
        </>
      )}
    </section>
  );
}

