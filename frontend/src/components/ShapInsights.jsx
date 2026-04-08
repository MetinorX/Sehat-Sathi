import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Brain, ArrowRight } from "lucide-react";

function getTopFeatures(explanation, count = 5) {
  return Object.entries(explanation || {})
    .map(([feature, value]) => ({
      feature,
      value: Number(value),
      abs: Math.abs(Number(value)),
    }))
    .filter((item) => Number.isFinite(item.value))
    .sort((a, b) => b.abs - a.abs)
    .slice(0, count);
}

const FeatureBar = ({ feature, value, abs, delay }) => {
  const isPositive = value >= 0;
  const percentage = (Math.min(abs, 1) * 100).toFixed(1);
  const impact = abs > 0.3 ? "High" : abs > 0.15 ? "Medium" : "Low";

  return (
    <motion.div
      className="space-y-1"
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.4 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900">{feature}</p>
          <p className="text-xs text-slate-500">
            Impact: <span className="font-medium text-slate-700">{impact}</span>
          </p>
        </div>
        <span
          className={`rounded-lg px-2 py-1 text-xs font-bold ${
            isPositive
              ? "bg-red-100 text-red-700"
              : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {isPositive ? "↑ Risk" : "↓ Safe"}
        </span>
      </div>

      {/* Animated progress bar */}
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
        <motion.div
          className={`h-full rounded-full ${
            isPositive
              ? "bg-gradient-to-r from-red-400 to-red-500"
              : "bg-gradient-to-r from-emerald-400 to-emerald-500"
          }`}
          initial={{ width: 0 }}
          whileInView={{ width: `${percentage}%` }}
          viewport={{ once: true }}
          transition={{ delay: delay + 0.2, duration: 0.8 }}
        />
      </div>
    </motion.div>
  );
};

export default function ShapInsights({ explanation }) {
  const topFeatures = getTopFeatures(explanation, 5);
  const hasData = topFeatures.length > 0;

  // Prepare data for horizontal bar chart
  const chartData = topFeatures.map((f) => ({
    feature: f.feature,
    value: f.value,
  }));

  return (
    <motion.section
      className="space-y-6"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-purple-100 p-2">
            <Brain className="h-5 w-5 text-purple-600" />
          </div>
          <h2 className="font-display text-3xl font-bold text-slate-900">
            Explainable AI Analysis
          </h2>
        </div>
        <p className="text-slate-600">
          SHAP values showing which features most influenced this prediction and their directionality
        </p>
      </div>

      {!hasData ? (
        <motion.div
          className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-12 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <p className="text-slate-600">
            SHAP explanation data is unavailable for this prediction.
          </p>
        </motion.div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left side: Feature list */}
          <motion.div
            className="lg:col-span-1 space-y-4 rounded-2xl border border-white/40 bg-gradient-to-br from-white/60 to-white/40 p-6 backdrop-blur-xl"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="font-display text-lg font-semibold text-slate-900">
              Top Contributing Factors
            </h3>

            <div className="space-y-5">
              {topFeatures.map((item, index) => (
                <FeatureBar
                  key={item.feature}
                  feature={item.feature}
                  value={item.value}
                  abs={item.abs}
                  delay={index * 0.08}
                />
              ))}
            </div>

            {/* Key insight */}
            <div className="mt-6 border-t border-slate-200 pt-4">
              <p className="text-xs uppercase tracking-widest text-slate-500">
                Interpretation
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                <span className="font-semibold text-red-600">
                  Positive values
                </span>
                {" "}increase diabetes risk,{" "}
                <span className="font-semibold text-emerald-600">
                  negative values
                </span>
                {" "}reduce risk.
              </p>
            </div>
          </motion.div>

          {/* Right side: Chart */}
          <motion.div
            className="lg:col-span-2 rounded-2xl border border-white/40 bg-gradient-to-br from-white/60 to-white/40 p-6 backdrop-blur-xl"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h3 className="font-display text-lg font-semibold text-slate-900 mb-4">
              Feature Importance Distribution
            </h3>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(148, 163, 184, 0.1)"
                    vertical={false}
                  />
                  <XAxis type="number" stroke="#94a3b8" style={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="feature"
                    width={140}
                    stroke="#94a3b8"
                    style={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value) => [Number(value).toFixed(4), "SHAP Value"]}
                    labelFormatter={(label) => `Feature: ${label}`}
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                    }}
                  />

                  <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.value >= 0
                            ? "#ef4444"
                            : "#10b981"
                        }
                        opacity={0.8}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>
      )}
    </motion.section>
  );
}
