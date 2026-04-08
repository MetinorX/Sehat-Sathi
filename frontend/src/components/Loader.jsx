import { motion } from "framer-motion";

export default function Loader({ message = "Processing request..." }) {
  return (
    <motion.section
      className="glass-panel rounded-2xl p-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="flex items-center gap-3 text-blue-700">
        <span className="inline-flex h-5 w-5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
        <p className="text-sm font-medium">{message}</p>
      </div>
    </motion.section>
  );
}