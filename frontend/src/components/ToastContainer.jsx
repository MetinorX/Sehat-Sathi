import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

const iconMap = {
  error: AlertTriangle,
  success: CheckCircle2,
  info: Info,
};

const toneMap = {
  error: "border-rose-200 bg-rose-50 text-rose-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
};

export default function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(92vw,24rem)] flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = iconMap[toast.type] || Info;
          const tone = toneMap[toast.type] || toneMap.info;

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto rounded-xl border px-4 py-3 shadow-lg ${tone}`}
            >
              <div className="flex items-start gap-2">
                <Icon className="mt-0.5 h-4 w-4" />
                <p className="flex-1 text-sm leading-relaxed">{toast.message}</p>
                <button
                  type="button"
                  onClick={() => onDismiss(toast.id)}
                  className="rounded px-1 text-xs opacity-70 transition hover:opacity-100"
                >
                  x
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}