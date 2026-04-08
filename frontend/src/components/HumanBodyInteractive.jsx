import { motion } from "framer-motion";
import humanBodyImage from "../assets/human-body.png";

const REGIONS = [
  { id: "HEAD", label: "Age", x: "50%", y: "15%", section: "history" },
  { id: "CHEST", label: "Blood Pressure", x: "50%", y: "34%", section: "vitals" },
  { id: "ABDOMEN", label: "Glucose / Insulin / BMI", x: "50%", y: "50%", section: "metabolic" },
  { id: "LEGS", label: "Pregnancies", x: "50%", y: "74%", section: "history" },
];

function abdomenFeedbackClass(riskCategory) {
  if (riskCategory === "High") return "bg-[#D74A4A]/24";
  if (riskCategory === "Medium") return "bg-[#D68B2D]/24";
  return "bg-[#4A82D7]/20";
}

export default function HumanBodyInteractive({
  activeRegion,
  completionPercent,
  riskCategory,
  onRegionClick,
}) {
  const radius = 154;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, completionPercent));
  const dashOffset = circumference - (clamped / 100) * circumference;

  return (
    <section className="rounded-[30px] border border-[#D8D8DD] bg-white/60 p-4 shadow-[0_18px_42px_rgba(0,0,0,0.07)] backdrop-blur-xl">
      <div className="relative flex h-[78vh] min-h-[620px] items-center justify-center overflow-hidden rounded-[26px] border border-[#E0E0E5] bg-[#FBFBFD]">
        <svg className="pointer-events-none absolute h-[390px] w-[390px] -rotate-90" viewBox="0 0 390 390" aria-hidden="true">
          <circle cx="195" cy="195" r={radius} className="fill-none" stroke="#E2E2E8" strokeWidth="10" />
          <motion.circle
            cx="195"
            cy="195"
            r={radius}
            className="fill-none"
            stroke="#70707A"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </svg>

        <div className="pointer-events-none absolute top-6 rounded-full border border-[#D5D5DB] bg-white/90 px-4 py-1 text-xs font-semibold tracking-[0.08em] text-[#4A4A53]">
          Completion {Math.round(clamped)}%
        </div>

        <motion.img
          src={humanBodyImage}
          alt="Anatomical human map"
          className="relative z-10 h-[75vh] max-h-[710px] object-contain"
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.div
          className={`pointer-events-none absolute z-20 h-[124px] w-[124px] -translate-x-1/2 -translate-y-1/2 rounded-full ${abdomenFeedbackClass(
            riskCategory
          )}`}
          style={{ left: "50%", top: "50%" }}
          animate={{ opacity: [0.22, 0.44, 0.22], scale: [0.92, 1.06, 0.92] }}
          transition={{ duration: 1.9, repeat: Infinity, ease: "easeInOut" }}
        />

        {REGIONS.map((region) => {
          const active = activeRegion === region.id;
          return (
            <motion.button
              key={region.id}
              type="button"
              aria-label={region.label}
              title={region.label}
              onClick={() => onRegionClick(region.id, region.section)}
              whileHover={{ scale: 1.08 }}
              className={`absolute z-30 -translate-x-1/2 -translate-y-1/2 rounded-full border p-2 backdrop-blur-xl transition ${
                active
                  ? "border-[#7A7A84] bg-white shadow-[0_0_0_4px_rgba(110,110,115,0.25)]"
                  : "border-[#D3D3D9] bg-white/85"
              }`}
              style={{ left: region.x, top: region.y }}
            >
              <motion.span
                className={`block h-3.5 w-3.5 rounded-full ${active ? "bg-[#52525B]" : "bg-[#A1A1AA]"}`}
                animate={{ opacity: [0.7, 1, 0.7], scale: [0.95, 1.08, 0.95] }}
                transition={{ duration: 1.7, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
