import { motion } from "framer-motion";
import { Activity, ArrowRight, BrainCircuit, Lock, ShieldCheck, Sparkles } from "lucide-react";
import neuralBackground from "../assets/hero.png";

const ambientTransition = {
  duration: 10,
  repeat: Infinity,
  repeatType: "mirror",
  ease: "easeInOut",
};

const featureCards = [
  { icon: BrainCircuit, label: "AI Prediction Engine", desc: "Clinical-grade metabolic inference" },
  { icon: Activity, label: "Clinical Monitoring", desc: "Live workflow and pipeline telemetry" },
  { icon: Lock, label: "Blockchain Integrity", desc: "Immutable audit anchoring" },
  { icon: Sparkles, label: "Explainability Layer", desc: "Transparent model reasoning" },
];

const trustBadges = [
  "✔ Clinically aligned",
  "✔ Explainability enabled",
  "✔ Safety validation active",
  "✔ Real-time inference",
];

const statusItems = [
  { label: "AI Accuracy", value: "96.8%", width: "96.8%", color: "from-[#60A5FA] to-[#3B82F6]" },
  { label: "Pipeline Status", value: "Running", width: "90%", color: "from-[#A78BFA] to-[#7C3AED]" },
  { label: "Validation Engine", value: "Active", width: "94%", color: "from-[#67E8F9] to-[#38BDF8]" },
  { label: "Blockchain Status", value: "Synced", width: "88%", color: "from-[#93C5FD] to-[#818CF8]" },
];

export default function Hero({
  onGetPredictionClick,
  onOpenRole,
  onOpenHub,
  onOpenDiabetes,
  onOpenLung,
}) {
  const handlePrimary = onGetPredictionClick || onOpenRole;
  const flowActions = [
    { label: "User Input", onClick: onOpenRole || onGetPredictionClick },
    { label: "Validation", onClick: onOpenLung || onGetPredictionClick },
    { label: "AI Model", onClick: onOpenDiabetes || onGetPredictionClick },
    { label: "Explainability", onClick: onOpenDiabetes || onGetPredictionClick },
    { label: "Report", onClick: onOpenHub || onGetPredictionClick },
  ];

  return (
    <header className="relative isolate min-h-screen overflow-hidden bg-[linear-gradient(145deg,#FFFFFF_0%,#F8FAFF_45%,#F2F0FF_100%)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.14] blur-[1.6px]"
        style={{ backgroundImage: `url(${neuralBackground})` }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_20%,rgba(255,255,255,0.9),rgba(255,255,255,0.45)_42%,rgba(255,255,255,0.12)_68%,transparent_100%)]"
      />
      <motion.div
        className="pointer-events-none absolute -left-24 top-10 h-96 w-96 rounded-full bg-[#DCE9FF]/75 blur-3xl"
        animate={{ x: [0, 25, -8, 0], y: [0, -16, 14, 0] }}
        transition={ambientTransition}
      />
      <motion.div
        className="pointer-events-none absolute right-0 top-6 h-[30rem] w-[30rem] rounded-full bg-[#E5DCFF]/65 blur-3xl"
        animate={{ x: [0, -22, 12, 0], y: [0, 18, -12, 0] }}
        transition={{ ...ambientTransition, duration: 12 }}
      />
      <motion.div
        className="pointer-events-none absolute bottom-10 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#DBEAFE]/50 blur-3xl"
        animate={{ scale: [1, 1.08, 1], opacity: [0.35, 0.55, 0.35] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />

      {[...Array(18)].map((_, idx) => (
        <motion.span
          key={idx}
          className="pointer-events-none absolute rounded-full bg-white/60"
          style={{
            width: `${5 + (idx % 3) * 3}px`,
            height: `${5 + (idx % 3) * 3}px`,
            left: `${6 + idx * 5.2}%`,
            top: `${12 + (idx % 6) * 12}%`,
          }}
          animate={{ y: [0, -14, 0], opacity: [0.2, 0.45, 0.2] }}
          transition={{ duration: 5.5 + (idx % 6), repeat: Infinity, ease: "easeInOut", delay: idx * 0.12 }}
        />
      ))}

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8">
        <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#DCE6F7] bg-white/75 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#4B628A] backdrop-blur-xl">
            <Sparkles className="h-3.5 w-3.5" />
            Clinical AI Platform
          </div>

          <h1 className="mt-6 text-5xl font-semibold leading-[1.02] tracking-tight text-[#121214] sm:text-6xl lg:text-7xl">
            AI That Understands Metabolic Health
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#4E596D] sm:text-lg">
            Clinical-grade diabetes prediction powered by explainable AI, real-time validation, and secure medical pipelines.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {featureCards.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.label}
                  className="rounded-2xl border border-white/75 bg-white/52 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-xl"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18 + idx * 0.08 }}
                  whileHover={{ y: -3, boxShadow: "0 16px 32px rgba(76, 105, 173, 0.2)" }}
                >
                  <Icon className="h-4.5 w-4.5 text-[#4A6FA8]" />
                  <p className="mt-2 text-sm font-semibold text-[#1D1D1F]">{feature.label}</p>
                  <p className="mt-1 text-xs text-[#647083]">{feature.desc}</p>
                </motion.div>
              );
            })}
          </div>

          <motion.button
            type="button"
            onClick={handlePrimary}
            whileHover={{ scale: 1.02, boxShadow: "0 20px 34px rgba(89, 112, 204, 0.28)" }}
            whileTap={{ scale: 0.985 }}
            className="group mt-8 inline-flex h-14 items-center gap-2 rounded-2xl bg-gradient-to-r from-[#4F89FF] via-[#6F7FFF] to-[#8A72FF] px-7 text-base font-semibold text-white shadow-[0_14px_28px_rgba(91,112,219,0.34)]"
          >
            Start AI Diagnosis
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </motion.button>

          <div className="mt-6 flex flex-wrap gap-2.5">
            {trustBadges.map((badge, idx) => (
              <motion.span
                key={badge}
                className="rounded-full border border-[#DDE6F7] bg-white/80 px-3 py-1.5 text-xs font-medium text-[#425B84]"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + idx * 0.06 }}
              >
                {badge}
              </motion.span>
            ))}
          </div>

          <section className="relative mt-8 rounded-2xl border border-white/70 bg-white/60 p-4 backdrop-blur-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6E7890]">Workflow Intelligence Flow</p>
            <div className="relative mt-3 flex flex-wrap items-center gap-2">
              <motion.div
                className="pointer-events-none absolute left-0 top-1/2 h-[2px] w-full -translate-y-1/2 rounded-full bg-gradient-to-r from-[#7BA5FF]/0 via-[#7BA5FF]/50 to-[#9A8DFF]/0"
                animate={{ opacity: [0.2, 0.75, 0.2] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
              {flowActions.map((node, idx) => (
                <div key={node.label} className="inline-flex items-center gap-2">
                  <motion.span
                    className="relative rounded-lg border border-[#DAE5F8] bg-white/86 px-3 py-1.5 text-xs font-medium text-[#314767] shadow-[0_4px_14px_rgba(107,132,188,0.12)]"
                    animate={{ y: [0, -2, 0] }}
                    transition={{ duration: 3.6, repeat: Infinity, delay: idx * 0.15 }}
                  >
                    <button type="button" onClick={node.onClick} className="focus:outline-none">
                      {node.label}
                    </button>
                  </motion.span>
                  {idx < flowActions.length - 1 ? <span className="text-[#8A95AA]">→</span> : null}
                </div>
              ))}
            </div>
          </section>
        </motion.div>

        <motion.aside
          className="relative rounded-3xl border border-white/80 bg-white/62 p-6 backdrop-blur-xl"
          initial={{ opacity: 0, x: 24, scale: 0.98 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <motion.div
            className="pointer-events-none absolute -top-10 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-[#8CAEFF]/35 blur-3xl"
            animate={{ opacity: [0.25, 0.6, 0.25], scale: [0.95, 1.08, 0.95] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="pointer-events-none absolute -top-2 right-6 h-24 w-24 rounded-full bg-[#A996FF]/35 blur-2xl"
            animate={{ opacity: [0.2, 0.5, 0.2], scale: [0.9, 1.1, 0.9] }}
            transition={{ duration: 4.4, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="relative mx-auto mb-4 h-44 w-44"
            animate={{ scale: [0.985, 1.03, 0.985] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="absolute inset-0 rounded-full border border-[#D3DFFE] bg-gradient-to-br from-white/90 via-[#EEF4FF]/85 to-[#ECE7FF]/85 shadow-[inset_0_0_30px_rgba(115,149,227,0.25),0_22px_46px_rgba(86,118,188,0.26)]" />
            <motion.img
              src={neuralBackground}
              alt="Neural network brain visualization"
              className="absolute inset-[12%] h-[76%] w-[76%] rounded-full object-cover opacity-80 mix-blend-multiply"
              animate={{ rotate: [0, 4, -3, 0] }}
              transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
            />
            {[...Array(10)].map((_, idx) => (
              <motion.span
                key={`orb-${idx}`}
                className="absolute rounded-full bg-gradient-to-br from-[#7AA2FF] to-[#8B79FF]"
                style={{
                  width: `${10 + (idx % 3) * 4}px`,
                  height: `${10 + (idx % 3) * 4}px`,
                  left: `${15 + (idx % 5) * 16}%`,
                  top: `${12 + (idx % 4) * 18}%`,
                }}
                animate={{ y: [0, -4, 0], opacity: [0.45, 0.95, 0.45] }}
                transition={{ duration: 2.2 + (idx % 3) * 0.8, repeat: Infinity, ease: "easeInOut", delay: idx * 0.12 }}
              />
            ))}
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 176 176" aria-hidden="true">
              {[...Array(10)].map((_, idx) => (
                <line
                  key={`ln-${idx}`}
                  x1={28 + (idx % 5) * 28}
                  y1={34 + (idx % 4) * 26}
                  x2={42 + ((idx + 2) % 5) * 24}
                  y2={48 + ((idx + 1) % 4) * 24}
                  stroke="rgba(98,132,213,0.32)"
                  strokeWidth="1.5"
                />
              ))}
            </svg>
          </motion.div>

          <h3 className="text-lg font-semibold text-[#1D1D1F]">Live Clinical System Status</h3>
          <p className="mt-1 text-sm text-[#647083]">Operational telemetry for model and pipeline reliability.</p>

          <div className="mt-5 space-y-4">
            {statusItems.map((item, idx) => (
              <motion.div key={item.label} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.22 + idx * 0.08 }}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-2 font-medium text-[#44516A]">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-[#4F7BD8]" />
                    {item.label}
                  </span>
                  <span className="font-semibold text-[#1D1D1F]">{item.value}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-[#E7ECF6]">
                  <motion.div
                    className={`h-full rounded-full bg-gradient-to-r ${item.color}`}
                    initial={{ width: 0 }}
                    animate={{ width: item.width }}
                    transition={{ duration: 1.15, delay: 0.26 + idx * 0.1, ease: "easeOut" }}
                  />
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-[#DCE6F7] bg-white/75 px-3 py-2 text-xs text-[#4D5C76]">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-[#4A6FA8]" />
              Safety checks and validation are active across all decision paths.
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onOpenHub || onGetPredictionClick}
              className="rounded-lg border border-[#DCE6F7] bg-white/80 px-3 py-2 text-xs font-semibold text-[#334A72] transition hover:bg-white"
            >
              Open Control Hub
            </button>
            <button
              type="button"
              onClick={onOpenRole || onGetPredictionClick}
              className="rounded-lg border border-[#DCE6F7] bg-white/80 px-3 py-2 text-xs font-semibold text-[#334A72] transition hover:bg-white"
            >
              Select Role
            </button>
            <button
              type="button"
              onClick={onOpenDiabetes || onGetPredictionClick}
              className="rounded-lg border border-[#DCE6F7] bg-white/80 px-3 py-2 text-xs font-semibold text-[#334A72] transition hover:bg-white"
            >
              Diabetes Workspace
            </button>
            <button
              type="button"
              onClick={onOpenLung || onGetPredictionClick}
              className="rounded-lg border border-[#DCE6F7] bg-white/80 px-3 py-2 text-xs font-semibold text-[#334A72] transition hover:bg-white"
            >
              Lung Workspace
            </button>
          </div>
        </motion.aside>
      </div>
    </header>
  );
}

