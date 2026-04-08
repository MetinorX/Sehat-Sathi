import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function probabilityPercent(probability) {
  const value = Number(probability);
  if (Number.isNaN(value)) {
    return 0;
  }
  return value <= 1 ? value * 100 : value;
}

export default function Charts({ result }) {
  const probability = Math.max(
    0,
    Math.min(100, probabilityPercent(result?.risk_score ?? result?.probability))
  );
  const confidence = Math.max(
    0,
    Math.min(100, probabilityPercent(result?.confidence ?? 0))
  );

  const riskSeries = [
    { stage: "Input", score: Math.max(12, probability * 0.45) },
    { stage: "Model", score: Math.max(18, probability * 0.72) },
    { stage: "Final", score: probability },
  ];

  const confidenceSeries = [
    { name: "Prediction", value: probability },
    { name: "Confidence", value: confidence },
  ];

  return (
    <motion.article
      className="glass-panel rounded-2xl p-6"
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45 }}
    >
      <div className="mb-6">
        <h3 className="font-display text-xl font-semibold text-slate-900">Analytics</h3>
        <p className="text-sm text-slate-500">Risk probability and model confidence visualization</p>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white/85 p-4">
          <p className="mb-3 text-sm font-medium text-slate-700">Risk Probability Trend</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={riskSeries}>
                <defs>
                  <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="stage" tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis tick={{ fill: "#64748b", fontSize: 12 }} domain={[0, 100]} />
                <Tooltip />
                <Area type="monotone" dataKey="score" stroke="#2563eb" fill="url(#riskGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white/85 p-4">
          <p className="mb-3 text-sm font-medium text-slate-700">Model Confidence</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={confidenceSeries}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis tick={{ fill: "#64748b", fontSize: 12 }} domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {confidenceSeries.map((entry) => (
                    <Cell key={entry.name} fill={entry.name === "Prediction" ? "#8b5cf6" : "#10b981"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.article>
  );
}