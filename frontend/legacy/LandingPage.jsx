import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const sectionFade = {
  hidden: { opacity: 0, y: 36 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
  },
};

const cardFloat = {
  hidden: { opacity: 0, y: 18, scale: 0.96 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.08,
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
};

const steps = [
  {
    id: "01",
    title: "Input Data",
    text: "Securely upload patient biomarkers or chest imaging data through a guided intake flow.",
  },
  {
    id: "02",
    title: "AI Analysis",
    text: "Specialized models process metabolic patterns and imaging signals with robust quality checks.",
  },
  {
    id: "03",
    title: "Explainable Results",
    text: "Visual explanations highlight key features and regions that influenced each prediction.",
  },
  {
    id: "04",
    title: "Clinical Support Output",
    text: "Action-ready summaries, recommendations, and safety markers support clinician decisions.",
  },
];

const trustItems = [
  {
    title: "Unbiased AI",
    text: "Fairness-aware monitoring reduces demographic disparity in model outcomes.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3v18M3 12h18" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    ),
  },
  {
    title: "Explainable Predictions",
    text: "Transparent feature and heatmap insights reveal why every result is produced.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 19h16M7 15l3-3 3 2 4-5" />
        <circle cx="7" cy="15" r="1.5" />
        <circle cx="10" cy="12" r="1.5" />
        <circle cx="13" cy="14" r="1.5" />
        <circle cx="17" cy="9" r="1.5" />
      </svg>
    ),
  },
  {
    title: "Privacy First",
    text: "Consent-aware workflows and PII-safe handling protect sensitive patient information.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3 4 7v6c0 5 3.5 7.9 8 9 4.5-1.1 8-4 8-9V7l-8-4Z" />
        <path d="M9.5 12.5 11 14l3.5-3.5" />
      </svg>
    ),
  },
  {
    title: "Clinician Support",
    text: "Outputs are decision-support tools designed to assist, not replace, medical experts.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 21s7-4.2 7-10V5l-7-2-7 2v6c0 5.8 7 10 7 10Z" />
        <path d="M12 8v6M9 11h6" />
      </svg>
    ),
  },
];

function GlassOrb({ className, delay = 0 }) {
  return (
    <motion.div
      className={className}
      animate={{ y: [0, -14, 0], scale: [1, 1.03, 1] }}
      transition={{ duration: 8, repeat: Infinity, delay, ease: "easeInOut" }}
    />
  );
}

export default function LandingPage() {
  const [loading, setLoading] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % steps.length);
    }, 2400);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const move = (e) => setCursor({ x: e.clientX, y: e.clientY });
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);

  const particles = useMemo(
    () =>
      Array.from({ length: 26 }).map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        duration: 9 + Math.random() * 10,
        delay: Math.random() * 4,
        size: 2 + Math.random() * 4,
      })),
    []
  );

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-50 text-slate-800 selection:bg-sky-200/70">
      <motion.div
        className="pointer-events-none fixed z-50 hidden h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-300/30 blur-3xl md:block"
        animate={{ x: cursor.x, y: cursor.y }}
        transition={{ type: "spring", stiffness: 70, damping: 16, mass: 0.8 }}
      />

      <AnimatePresence>
        {loading && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-white"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.4 } }}
          >
            <div className="flex flex-col items-center gap-4">
              <motion.div
                className="h-14 w-14 rounded-2xl border border-sky-300/70 bg-white/70 backdrop-blur-xl"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
              />
              <p className="text-sm font-medium tracking-[0.2em] text-slate-500">MEDINTEL AI</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <GlassOrb className="absolute left-[-120px] top-[-90px] h-96 w-96 rounded-full bg-sky-200/55 blur-3xl" delay={0.2} />
        <GlassOrb className="absolute right-[-130px] top-16 h-[28rem] w-[28rem] rounded-full bg-cyan-200/45 blur-3xl" delay={0.9} />
        <GlassOrb className="absolute bottom-[-180px] left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-blue-100/80 blur-3xl" delay={0.6} />
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full bg-white/70"
            style={{ left: p.left, top: p.top, width: p.size, height: p.size }}
            animate={{ y: [0, -18, 0], opacity: [0.35, 0.85, 0.35] }}
            transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
          />
        ))}
      </div>

      <main className="relative z-10">
        <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center px-5 pb-20 pt-28 sm:px-8 lg:px-12">
          <motion.div
            className="rounded-3xl border border-white/50 bg-white/35 p-6 shadow-[0_20px_80px_-30px_rgba(14,116,144,0.45)] backdrop-blur-2xl sm:p-10"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={sectionFade}
          >
            <motion.p
              className="mb-4 inline-flex items-center rounded-full border border-sky-200/80 bg-white/60 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              MedIntel AI
            </motion.p>
            <h1 className="max-w-4xl text-4xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              AI-Powered Health Intelligence Platform
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-slate-600 sm:text-xl">
              Predict. Detect. Explain. Empower.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <motion.button
                whileHover={{ y: -3, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-800"
              >
                Start Diagnosis
              </motion.button>
              <motion.button
                whileHover={{ y: -3, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="rounded-2xl border border-slate-300/80 bg-white/60 px-6 py-3 text-sm font-semibold text-slate-700 backdrop-blur-md transition hover:bg-white"
              >
                Explore System
              </motion.button>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {[
                {
                  title: "Diabetes Risk Prediction",
                  desc: "Preventive AI model with calibrated risk scoring and fairness-aware reasoning.",
                },
                {
                  title: "Lungs Scan",
                  desc: "Diagnostic imaging pipeline with nodule sensitivity and explainability overlays.",
                },
              ].map((card, i) => (
                <motion.div
                  key={card.title}
                  custom={i}
                  variants={cardFloat}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.4 }}
                  whileHover={{ y: -6, scale: 1.01 }}
                  className="rounded-2xl border border-white/65 bg-white/45 p-5 shadow-[0_15px_50px_-30px_rgba(2,132,199,0.7)] backdrop-blur-xl"
                >
                  <h3 className="text-lg font-semibold text-slate-900">{card.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{card.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>
      </main>
    </div>
  );
}
