import { motion } from "framer-motion";
import { ArrowRight, BrainCircuit, ImagePlus, ShieldCheck, Sparkles, Waves, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

const modules = [
  {
    id: "diabetes",
    title: "Metabolic Risk Engine",
    description: "AI-assisted metabolic risk stratification with explainable feature reasoning.",
    icon: BrainCircuit,
    route: "/dashboard/diabetes",
    metrics: [
      { label: "Confidence Avg", value: "91%" },
      { label: "Inputs processed", value: "124" },
      { label: "Status", value: "Active" },
    ],
    tint: "from-[#DFF1FF] via-[#F2F7FF] to-[#FFFFFF]",
  },
  {
    id: "lung",
    title: "Pulmonary Imaging AI",
    description: "Clinical-grade chest imaging triage with safety gating and visual explainability.",
    icon: ImagePlus,
    route: "/dashboard/lung",
    metrics: [
      { label: "Validation Score", value: "93/100" },
      { label: "Explainability", value: "Enabled" },
      { label: "Recent scans", value: "12" },
    ],
    tint: "from-[#E5EEFF] via-[#F4F5FF] to-[#FFFFFF]",
  },
];

const statusChips = [
  { label: "Model Connected", icon: Zap },
  { label: "Safety Validation Active", icon: ShieldCheck },
  { label: "Explainability Enabled", icon: Sparkles },
  { label: "Real-time Inference Running", icon: Waves },
];

export default function DashboardHub() {
  const navigate = useNavigate();
  const selectedRole = window.localStorage.getItem("madhumeha_role") || "unknown";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#F5F5F7] px-4 py-8 sm:px-6 lg:px-8">
      <motion.div
        className="pointer-events-none absolute -left-32 -top-28 h-96 w-96 rounded-full bg-[#D9E9FF]/70 blur-3xl"
        animate={{ x: [0, 30, -10, 0], y: [0, 18, -16, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute -right-16 top-20 h-[26rem] w-[26rem] rounded-full bg-[#E8DDFF]/60 blur-3xl"
        animate={{ x: [0, -24, 12, 0], y: [0, -10, 16, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />

      {[...Array(14)].map((_, idx) => (
        <motion.span
          key={idx}
          className="pointer-events-none absolute rounded-full bg-white/45"
          style={{
            width: `${6 + (idx % 4) * 3}px`,
            height: `${6 + (idx % 4) * 3}px`,
            left: `${8 + idx * 6.5}%`,
            top: `${10 + (idx % 5) * 14}%`,
          }}
          animate={{ y: [0, -14, 0], opacity: [0.2, 0.45, 0.2] }}
          transition={{ duration: 6 + (idx % 5), repeat: Infinity, ease: "easeInOut", delay: idx * 0.18 }}
        />
      ))}

      <div className="relative mx-auto w-full max-w-7xl space-y-6">
        <section className="glass-panel rounded-3xl border border-white/60 bg-white/60 p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6E6E73]">Clinical Command Layer</p>
            <span className="rounded-full border border-[#DCE5F5] bg-white/80 px-3 py-1 text-xs font-medium text-[#4E5D79]">
              Role: {selectedRole.replace("_", " ")}
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#1D1D1F] sm:text-4xl">
            Clinical Intelligence Command Center
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-[#5A5A64] sm:text-base">
            Real-time AI-assisted diagnostic workflows across imaging and metabolic systems
          </p>

          <div className="mt-5 flex flex-wrap gap-2.5">
            {statusChips.map(({ label, icon: Icon }, idx) => (
              <motion.span
                key={label}
                className="inline-flex items-center gap-2 rounded-full border border-[#DCE5F5] bg-white/80 px-3 py-1.5 text-xs font-medium text-[#3C4A63]"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * idx }}
              >
                <Icon className="h-3.5 w-3.5 text-[#4A6FA8]" />
                ✔ {label}
              </motion.span>
            ))}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          {modules.map((module, idx) => {
            const Icon = module.icon;
            return (
              <motion.article
                key={module.id}
                className={`group relative overflow-hidden rounded-3xl border border-white/70 bg-gradient-to-br ${module.tint} p-6 backdrop-blur-xl`}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                whileHover={{ y: -4, scale: 1.01, boxShadow: "0 26px 52px rgba(73, 105, 164, 0.18)" }}
                whileTap={{ scale: 0.992 }}
              >
                <div className="pointer-events-none absolute inset-0 rounded-3xl border border-white/40" />
                <div className="relative flex items-start gap-4">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#D5E2F7] bg-white/80">
                    <Icon className="h-5 w-5 text-[#41639A]" />
                  </span>
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-[#1D1D1F]">{module.title}</h2>
                    <p className="mt-2 text-sm text-[#5C6575]">{module.description}</p>
                  </div>
                </div>

                <div className="relative mt-5 grid grid-cols-3 gap-2">
                  {module.metrics.map((metric) => (
                    <div key={metric.label} className="rounded-xl border border-white/70 bg-white/75 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-[#7B8392]">{metric.label}</p>
                      <p className="mt-1 text-sm font-semibold text-[#1D1D1F]">{metric.value}</p>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => navigate(module.route)}
                  className="relative mt-6 inline-flex items-center gap-2 rounded-xl border border-[#CDDDF8] bg-white/85 px-4 py-2.5 text-sm font-semibold text-[#1F3356] transition hover:bg-white"
                >
                  Launch Diagnostic Pipeline
                  <ArrowRight className="h-4 w-4" />
                </button>
              </motion.article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
