import { motion } from "framer-motion";
import { AlertTriangle, RefreshCcw } from "lucide-react";

export default function ErrorState({ message, onRetry }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-2xl border border-rose-200 bg-rose-50/80 p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-rose-600" />
          <div>
            <p className="text-sm font-semibold text-rose-700">Request failed</p>
            <p className="mt-1 text-sm text-rose-600">{message}</p>
          </div>
        </div>

        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Retry
          </button>
        )}
      </div>
    </motion.section>
  );
}