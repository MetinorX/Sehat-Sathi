import { motion } from "framer-motion";
import { AlertCircle, Shield } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

function normalizeProbability(probability) {
  const value = Number(probability);
  if (Number.isNaN(value)) {
    return 0;
  }
  return value <= 1 ? value * 100 : value;
}

export default function PredictionCard({ result }) {
  const probability = Math.max(0, Math.min(100, normalizeProbability(result.probabilityPercent ?? result.probability)));
  const highRisk = Number(result.prediction) === 1;
  const label = highRisk ? "High Risk" : "Low Risk";

  const chartData = [
    { name: "Risk", value: probability },
    { name: "Remaining", value: 100 - probability },
  ];

  return (
    <motion.article
      className="glass-card rounded-2xl p-6"
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45 }}
      whileHover={{ scale: 1.03 }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-xl font-semibold text-slate-900">Prediction Card</h3>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
            highRisk ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {highRisk ? <AlertCircle className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
          {label}
        </span>
      </div>

      <div className="mb-5 grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Prediction</p>
          <p className="mt-2 font-display text-3xl font-bold text-slate-900">{label}</p>
          <p className="mt-1 text-sm text-slate-500">Probability: {probability.toFixed(2)}%</p>
        </div>

        <div className="h-36 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} dataKey="value" innerRadius={36} outerRadius={54} startAngle={90} endAngle={-270}>
                <Cell fill={highRisk ? "#ef4444" : "#10b981"} />
                <Cell fill="#e2e8f0" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <div className="mb-2 flex justify-between text-sm text-slate-600">
          <span>Risk Probability</span>
          <span className="font-semibold text-slate-800">{probability.toFixed(1)}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-200">
          <motion.div
            className={`h-full rounded-full ${highRisk ? "bg-rose-500" : "bg-emerald-500"}`}
            initial={{ width: 0 }}
            animate={{ width: `${probability}%` }}
            transition={{ duration: 0.85, ease: "easeOut" }}
          />
        </div>
      </div>
    </motion.article>
  );
}