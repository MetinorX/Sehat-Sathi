import { motion } from "framer-motion";

function gaugeColor(category) {
  if (category === "High") return "#D74A4A";
  if (category === "Medium") return "#D68B2D";
  return "#3A8D6B";
}

export default function RiskGauge({ riskScore = 0, category = "Low", size = 140 }) {
  const safe = Math.max(0, Math.min(1, Number(riskScore) || 0));
  const pct = safe * 100;
  const radius = size / 2 - 12;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const stroke = gaugeColor(category);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="fill-none"
          stroke="#DFDFE4"
          strokeWidth="10"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="fill-none"
          stroke={stroke}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        />
      </svg>
      <motion.div
        key={pct.toFixed(1)}
        initial={{ opacity: 0.45, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="pointer-events-none absolute inset-0 flex items-center justify-center text-[22px] font-semibold text-[#1D1D1F]"
      >
        {pct.toFixed(1)}%
      </motion.div>
    </div>
  );
}
