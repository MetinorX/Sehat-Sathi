import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";

const MetricCard = ({ label, value, description, delay, unit = "%" }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const start = 0;
    const end = value;
    const duration = 1.2;
    const increment = (end - start) / (duration * 60);
    let current = start;
    let frame = 0;

    const timer = setInterval(() => {
      current += increment;
      frame++;
      if (current >= end) {
        setDisplayValue(end);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.round(current * 100) / 100);
      }
    }, 1000 / 60);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.02, y: -4 }}
      className="group rounded-2xl border border-white/40 bg-gradient-to-br from-white/60 to-white/30 p-6 backdrop-blur-xl transition-all hover:border-blue-200/60 hover:from-white/80 hover:to-white/50 hover:shadow-xl"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            {label}
          </p>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="font-display text-4xl font-bold text-slate-900">
              {displayValue.toFixed(1)}
            </span>
            <span className="text-sm font-medium text-slate-600">{unit}</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">
            {description}
          </p>
        </div>
        <div className="flex-shrink-0 rounded-lg bg-gradient-to-br from-blue-100 to-blue-50 p-3 text-blue-600 opacity-0 transition-all group-hover:opacity-100">
          <TrendingUp className="h-5 w-5" />
        </div>
      </div>

      {/* Animated accent line */}
      <motion.div
        className="mt-4 h-1 w-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600"
        initial={{ width: 0 }}
        whileInView={{ width: "100%" }}
        viewport={{ once: true }}
        transition={{ duration: 1, delay: delay + 0.2 }}
      />
    </motion.div>
  );
};

export default function ModelMetrics() {
  const metrics = [
    {
      label: "Accuracy",
      value: 96.8,
      description: "Overall prediction correctness across all test cases",
    },
    {
      label: "Precision",
      value: 94.2,
      description: "True positives vs. all predicted positives",
    },
    {
      label: "Recall",
      value: 91.5,
      description: "True positives vs. all actual positives",
    },
    {
      label: "F1 Score",
      value: 92.8,
      description: "Harmonic balance of precision and recall",
    },
  ];

  return (
    <motion.section
      className="space-y-6"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className="space-y-2">
        <h2 className="font-display text-3xl font-bold text-slate-900">
          Model Performance Metrics
        </h2>
          <p className="text-slate-600">
            Real-time evaluation dashboard showing clinical model quality across multiple datasets
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric, index) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            description={metric.description}
            delay={index * 0.1}
          />
        ))}
      </div>
    </motion.section>
  );
}
