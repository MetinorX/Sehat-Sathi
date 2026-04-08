import { motion } from "framer-motion";

export default function BodyNode({ label, active, position, onClick }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
      className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-full border p-2.5 backdrop-blur-xl transition ${
        active
          ? "border-[#2563EB]/40 bg-white/90 shadow-[0_0_0_4px_rgba(37,99,235,0.18)]"
          : "border-[rgba(0,0,0,0.08)] bg-white/75 shadow-[0_8px_24px_rgba(37,99,235,0.14)]"
      }`}
      style={{ left: position.x, top: position.y }}
      aria-label={label}
      title={label}
    >
      <motion.span
        className={`block h-3.5 w-3.5 rounded-full ${active ? "bg-[#2563EB]" : "bg-[#93C5FD]"}`}
        animate={{ opacity: [0.7, 1, 0.7], scale: [0.95, 1.05, 0.95] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.button>
  );
}
