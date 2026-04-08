import { motion } from "framer-motion";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function FeatureImportanceChart({ explanation = [], loading = false }) {
  const data = [...(explanation || [])]
    .filter((item) => item?.feature)
    .map((item) => ({
      feature: item.feature,
      magnitude: Math.abs(Number(item.impact || 0)),
      impact: Number(item.impact || 0),
      estimated: Boolean(item.estimated),
    }))
    .sort((a, b) => b.magnitude - a.magnitude)
    .slice(0, 8);

  return (
    <section className="rounded-2xl border border-[#D9D9DE] bg-white/80 p-5 shadow-[0_8px_22px_rgba(0,0,0,0.05)]">
      <h3 className="text-lg font-semibold text-[#1D1D1F]">Feature Importance</h3>
      <p className="mt-1 text-sm text-[#6E6E73]">Contribution magnitude by feature.</p>

      {loading ? (
        <div className="mt-4 h-56 animate-pulse rounded-xl bg-[#ECECF1]" />
      ) : data.length === 0 ? (
        <p className="mt-4 rounded-xl border border-[#E2E2E8] bg-[#FAFAFC] px-3 py-3 text-sm text-[#6E6E73]">
          Feature importance is unavailable for this prediction.
        </p>
      ) : (
        <motion.div className="mt-4 h-64" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 10, left: 6, bottom: 36 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#ECECF1" vertical={false} />
              <XAxis dataKey="feature" angle={-25} textAnchor="end" interval={0} tick={{ fill: "#6E6E73", fontSize: 11 }} />
              <YAxis tick={{ fill: "#6E6E73", fontSize: 11 }} />
              <Tooltip
                formatter={(value, _name, entry) => {
                  const impact = Number(entry?.payload?.impact || 0);
                  return [`${Number(value).toFixed(4)}`, `|impact| (${impact >= 0 ? "+" : ""}${impact.toFixed(4)})`];
                }}
                contentStyle={{ borderRadius: 10, border: "1px solid #D9D9DE", background: "#FFF" }}
              />
              <Bar dataKey="magnitude" radius={[8, 8, 0, 0]} animationDuration={700}>
                {data.map((entry) => (
                  <Cell
                    key={entry.feature}
                    fill={entry.estimated ? "#B66E15" : entry.impact >= 0 ? "#D74A4A" : "#4E8BC8"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}
    </section>
  );
}
