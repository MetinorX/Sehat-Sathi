import { motion } from "framer-motion";
import { Leaf, Zap } from "lucide-react";

export default function AyurvedaCard({ result }) {
  const prakritiColors = {
    Vata: { bg: "bg-blue-50", border: "border-blue-200", icon: "text-blue-600", badge: "bg-blue-100 text-blue-700" },
    Pitta: { bg: "bg-amber-50", border: "border-amber-200", icon: "text-amber-600", badge: "bg-amber-100 text-amber-700" },
    Kapha: { bg: "bg-emerald-50", border: "border-emerald-200", icon: "text-emerald-600", badge: "bg-emerald-100 text-emerald-700" },
  };

  const prakriti = result.prakriti || "Not available";
  const colors = prakritiColors[prakriti] || prakritiColors.Pitta;

  return (
    <motion.article
      className={`relative overflow-hidden rounded-2xl border border-white/40 bg-gradient-to-br from-white/70 to-white/50 backdrop-blur-xl transition-all`}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.05 }}
      whileHover={{ scale: 1.02, boxShadow: "0 20px 60px rgba(16, 185, 129, 0.15)" }}
    >
      {/* Animated gradient background */}
      <motion.div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${colors.bg} from-opacity-20`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      />

      <div className="relative space-y-6 p-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-widest text-slate-500 font-medium">
              Wellness Profile
            </p>
            <h3 className="mt-2 font-display text-2xl font-bold text-slate-900">
              Ayurveda Analysis
            </h3>
          </div>

          <motion.div
            className={`rounded-lg p-2.5 ${colors.bg}`}
            whileHover={{ scale: 1.1 }}
          >
            <Leaf className={`h-6 w-6 ${colors.icon}`} />
          </motion.div>
        </div>

        {/* Prakriti section */}
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <p className="text-xs uppercase tracking-widest text-slate-600 font-medium">
            Constitution Type
          </p>
          <motion.div
            className={`inline-block rounded-xl ${colors.badge} px-4 py-2.5 font-semibold text-lg`}
            whileHover={{ scale: 1.05 }}
          >
            {prakriti}
          </motion.div>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Your unique constitutional type according to Ayurvedic principles, which influences dietary and lifestyle recommendations.
          </p>
        </motion.div>

        {/* Recommendation section */}
        <motion.div
          className={`rounded-xl border ${colors.border} ${colors.bg} p-4`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-start gap-3">
            <Zap className={`h-5 w-5 flex-shrink-0 ${colors.icon} mt-0.5`} />
            <div className="flex-1">
              <p className="text-xs uppercase tracking-widest text-slate-700 font-medium mb-2">
                Wellness Recommendation
              </p>
              <p className="text-sm leading-relaxed text-slate-700">
                {result.recommendation || "No recommendation available. Please consult with an Ayurvedic practitioner."}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Integration note */}
        <div className="border-t border-slate-200 pt-4">
          <p className="text-xs text-slate-600 text-center">
            Ayurvedic insights integrated with modern AI for holistic health assessment
          </p>
        </div>
      </div>
    </motion.article>
  );
}