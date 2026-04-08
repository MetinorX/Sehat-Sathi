import { motion } from "framer-motion";

const tones = {
  benign: "bg-[#3B82F6]",
  indeterminate: "bg-[#F59E0B]",
  suspicious: "bg-[#EF4444]",
};

export default function ProbabilityBars({ probabilities = [] }) {
  return (
    <div className="space-y-3">
      {probabilities.map((item, index) => (
        <div key={item.label} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#4A4A53]">{item.label}</span>
            <span className="font-semibold text-[#1D1D1F]">{item.value.toFixed(0)}%</span>
          </div>
          <div className="h-2 rounded-full bg-[#E8E8ED]">
            <motion.div
              className={`h-2 rounded-full ${tones[item.tone] || "bg-[#7A7A84]"}`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(2, item.value)}%` }}
              transition={{ duration: 0.55, delay: index * 0.06 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

