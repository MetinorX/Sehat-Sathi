import { motion } from "framer-motion";

export default function ScanAnimation({ active = false }) {
  if (!active) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
      <div
        className="absolute inset-0 opacity-45"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <motion.div
        className="absolute top-0 h-full w-20"
        style={{
          background:
            "linear-gradient(90deg, rgba(59,130,246,0), rgba(59,130,246,0.4), rgba(59,130,246,0))",
          filter: "blur(2px)",
        }}
        initial={{ x: "-20%" }}
        animate={{ x: ["-20%", "120%"] }}
        transition={{ duration: 1.9, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute top-0 h-full w-[2px] bg-[#7DB7FF]"
        initial={{ x: "0%" }}
        animate={{ x: ["0%", "100%"] }}
        transition={{ duration: 1.9, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute inset-0 bg-white/10"
        animate={{ opacity: [0.12, 0.22, 0.12] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

