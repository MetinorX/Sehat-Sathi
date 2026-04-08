import { motion } from "framer-motion";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function toTopThree(explanation) {
  return Object.entries(explanation || {})
    .map(([feature, value]) => ({
      feature,
      value: Number(value),
      abs: Math.abs(Number(value)),
    }))
    .filter((item) => Number.isFinite(item.value))
    .sort((a, b) => b.abs - a.abs)
    .slice(0, 3)
    .reverse();
}

export default function ShapChart({ explanation }) {
  const data = toTopThree(explanation);

  return (
    <motion.article
      className="glass-panel rounded-2xl p-6"
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45 }}
    >
      <h3 className="font-display text-xl font-semibold text-slate-900">Top Risk Factors Influencing Prediction</h3>
      <p className="mt-1 text-sm text-slate-500">Positive values increase risk, negative values reduce risk.</p>

      {data.length === 0 ? (
        <div className="mt-5 rounded-xl border border-slate-200 bg-white/70 px-4 py-6 text-sm text-slate-500">
          SHAP explanation data is unavailable for this prediction.
        </div>
      ) : (
        <div className="mt-5 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 20, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis type="category" dataKey="feature" width={150} tick={{ fill: "#64748b", fontSize: 12 }} />
              <Tooltip
                formatter={(value) => [Number(value).toFixed(4), "Contribution"]}
                labelFormatter={(label) => `Feature: ${label}`}
              />
              <Bar dataKey="value" radius={[8, 8, 8, 8]}>
                {data.map((entry) => (
                  <Cell
                    key={entry.feature}
                    fill={entry.value >= 0 ? "#ef4444" : "#10b981"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.article>
  );
}