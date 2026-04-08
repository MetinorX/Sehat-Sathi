import { motion } from "framer-motion";
import BodyNode from "./BodyNode";
import humanBodyImage from "../assets/human-body.png";

const NODES = [
  { id: "HEAD", label: "Age", x: "50%", y: "15%", section: "history" },
  { id: "CHEST", label: "Vitals", x: "50%", y: "34%", section: "vitals" },
  { id: "ABDOMEN", label: "Metabolic Core", x: "50%", y: "50%", section: "metabolic" },
  { id: "LEGS", label: "Lifestyle / Symptoms", x: "50%", y: "74%", section: "symptoms" },
];

export default function HumanBody3D({ activeNode, completion, onNodeClick }) {
  const radius = 150;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, completion));
  const dashOffset = circumference - (clamped / 100) * circumference;

  const active = NODES.find((node) => node.id === activeNode) || NODES[2];

  return (
    <div className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-[rgba(255,255,255,0.6)] p-4 shadow-[0_20px_44px_rgba(0,0,0,0.06)] backdrop-blur-xl">
      <div className="relative flex h-[78vh] min-h-[560px] items-center justify-center overflow-hidden rounded-xl bg-white/90">
        <svg className="pointer-events-none absolute h-[360px] w-[360px] -rotate-90" viewBox="0 0 360 360" aria-hidden="true">
          <circle cx="180" cy="180" r={radius} className="fill-none stroke-[rgba(0,0,0,0.08)]" strokeWidth="12" />
          <motion.circle
            cx="180"
            cy="180"
            r={radius}
            className="fill-none stroke-[#2563EB]"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 0.45 }}
          />
        </svg>

        <div className="pointer-events-none absolute top-6 rounded-full border border-[rgba(0,0,0,0.08)] bg-white/95 px-4 py-1 text-sm font-semibold text-gray-700">
          Completion {clamped}%
        </div>

        <motion.img
          src={humanBodyImage}
          alt="Full human anatomy"
          className="relative z-10 h-[76vh] max-h-[690px] object-contain drop-shadow-[0_24px_40px_rgba(37,99,235,0.12)]"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.div
          className="pointer-events-none absolute rounded-full bg-[#2563EB]/10"
          style={{ left: active.x, top: active.y, width: 120, height: 120, transform: "translate(-50%, -50%)" }}
          animate={{ opacity: [0.22, 0.42, 0.22], scale: [0.95, 1.06, 0.95] }}
          transition={{ duration: 2, repeat: Infinity }}
        />

        {NODES.map((node) => (
          <BodyNode
            key={node.id}
            label={node.label}
            active={activeNode === node.id}
            position={{ x: node.x, y: node.y }}
            onClick={() => onNodeClick(node.id, node.section)}
          />
        ))}
      </div>
    </div>
  );
}
