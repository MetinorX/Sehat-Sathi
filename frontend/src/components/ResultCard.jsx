import { motion } from "framer-motion";
import { AlertCircle, Shield, Zap } from "lucide-react";

const normalizeProbability = (probability) => {
  const parsed = Number(probability);
  if (Number.isNaN(parsed)) {
    return 0;
  }
  return parsed <= 1 ? parsed * 100 : parsed;
};

// Circular progress component
const CircularProgress = ({ percentage, color }) => {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const progress = (percentage / 100) * circumference;

  return (
    <svg width="120" height="120" className="drop-shadow-lg">
      <defs>
        <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="1" />
        </linearGradient>
      </defs>

      {/* Background circle */}
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        stroke="#f1f5f9"
        strokeWidth="6"
      />

      {/* Progress circle */}
      <motion.circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        stroke={`url(#gradient-${color})`}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: circumference - progress }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        style={{ transform: "rotate(-90deg)", transformOrigin: "60px 60px" }}
      />

      {/* Center text */}
      <text
        x="60"
        y="65"
        textAnchor="middle"
        fontSize="20"
        fontWeight="bold"
        fill="currentColor"
        className="text-slate-900"
      >
        {percentage.toFixed(0)}%
      </text>
    </svg>
  );
};

export default function ResultCard({ result }) {
  const probability = Math.max(
    0,
    Math.min(100, normalizeProbability(result.probabilityPercent ?? result.probability)),
  );
  const isDiabetic = Number(result.prediction) === 1;

  const riskTone = probability >= 70 ? "high" : probability >= 40 ? "borderline" : "low";
  const toneConfig = {
    high: {
      badge: "bg-gradient-to-r from-red-100 to-rose-100 text-red-700 border-red-200",
      circle: "#ef4444",
      diagnosis: "High Risk",
      diagnDesc: "Diabetes Risk Detected",
      icon: <AlertCircle className="h-5 w-5" />,
      glow: "from-red-500/20 to-transparent",
      subtext: "Immediate medical consultation recommended",
    },
    borderline: {
      badge: "bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 border-amber-200",
      circle: "#f59e0b",
      diagnosis: "Borderline Risk",
      diagnDesc: "Elevated Diabetes Risk",
      icon: <AlertCircle className="h-5 w-5" />,
      glow: "from-amber-500/20 to-transparent",
      subtext: "Lifestyle changes strongly recommended",
    },
    low: {
      badge: "bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 border-emerald-200",
      circle: "#10b981",
      diagnosis: "Low Risk",
      diagnDesc: "Healthy Diabetes Profile",
      icon: <Shield className="h-5 w-5" />,
      glow: "from-emerald-500/20 to-transparent",
      subtext: "Continue healthy lifestyle habits",
    },
  }[riskTone];

  return (
    <motion.article
      className="relative overflow-hidden rounded-2xl border border-white/40 bg-gradient-to-br from-white/70 to-white/50 backdrop-blur-xl"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.02, boxShadow: "0 20px 60px rgba(59, 130, 246, 0.15)" }}
    >
      {/* Animated gradient background */}
      <motion.div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${toneConfig.glow}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      />

      <div className="relative space-y-6 p-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-widest text-slate-500 font-medium">
              Prediction Result
            </p>
            <h3 className="mt-2 font-display text-2xl font-bold text-slate-900">
              {toneConfig.diagnosis}
            </h3>
            <p className="mt-1 text-sm text-slate-600">{toneConfig.diagnDesc}</p>
          </div>

          <motion.span
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold border ${toneConfig.badge}`}
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {toneConfig.icon}
            {riskTone.charAt(0).toUpperCase() + riskTone.slice(1)} Risk
          </motion.span>
        </div>

        {/* Content grid */}
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Circular progress */}
          <div className="flex flex-col items-center justify-center space-y-4">
            <CircularProgress percentage={probability} color={toneConfig.circle} />
            <div className="text-center">
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Confidence Score
              </p>
              <p className="mt-1 font-display text-lg font-semibold text-slate-900">
                {probability.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-4">
            {/* Status indicator */}
            <motion.div
              className={`rounded-xl border-l-4 p-4 ${
                probability >= 70
                  ? "border-red-400 bg-red-50"
                  : probability >= 40
                  ? "border-amber-400 bg-amber-50"
                  : "border-emerald-400 bg-emerald-50"
              }`}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <p className="text-xs uppercase tracking-widest text-slate-600 font-medium">
                Status
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {isDiabetic ? "Diabetes Likely" : "Non-Diabetic"}
              </p>
            </motion.div>

            {/* Recommendation */}
            <motion.div
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-start gap-2">
                <Zap className="h-4 w-4 flex-shrink-0 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-widest text-slate-600 font-medium">
                    Recommendation
                  </p>
                  <p className="mt-2 text-sm text-slate-700">
                    {toneConfig.subtext}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Footer stats */}
        <div className="border-t border-slate-200 pt-4 grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-xs text-slate-500">Prediction</p>
            <p className="mt-1 font-semibold text-slate-900">
              {Number(result.prediction) === 1 ? "Positive" : "Negative"}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500">Probability</p>
            <p className="mt-1 font-semibold text-slate-900">{probability.toFixed(1)}%</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500">Risk Level</p>
            <p className="mt-1 font-semibold text-slate-900">{riskTone}</p>
          </div>
        </div>
      </div>
    </motion.article>
  );
}