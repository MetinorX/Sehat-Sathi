import { motion } from "framer-motion";

export default function ProgressRing({ percentage = 0 }) {
  const radius = 126;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percentage));
  const strokeOffset = circumference - (clamped / 100) * circumference;

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <svg className="h-[330px] w-[330px] -rotate-90" viewBox="0 0 320 320">
        <circle cx="160" cy="160" r={radius} className="fill-none stroke-[rgba(11,19,43,0.08)]" strokeWidth="10" />
        <motion.circle
          cx="160"
          cy="160"
          r={radius}
          className="fill-none stroke-[#3A86FF]"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: strokeOffset }}
          transition={{ duration: 0.4 }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-[11px] uppercase tracking-[0.16em] text-gray-500">Completion</p>
        <p className="text-lg font-semibold text-[#0B132B]">{clamped}%</p>
      </div>
    </div>
  );
}
