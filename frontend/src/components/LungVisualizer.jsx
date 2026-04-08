import { motion } from "framer-motion";
import lungsImage from "../assets/lungs_clean.png";
import ScanAnimation from "./ScanAnimation";
import LungHeatmapOverlay from "./LungHeatmapOverlay";

function ringTone(state, hasResult) {
  if (state === "analyzing") return "shadow-[0_0_48px_rgba(80,145,255,0.45)]";
  if (hasResult) return "shadow-[0_0_42px_rgba(255,180,80,0.34)]";
  return "shadow-[0_0_34px_rgba(107,170,255,0.34)]";
}

export default function LungVisualizer({
  analysisState = "idle",
  hasResult = false,
  explainability = [],
  heatmapUrl = "",
  overlayMode = "overlay",
  intensity = 40,
  baseImageUrl = lungsImage,
  selectedRegion = null,
  onSelectRegion = () => {},
}) {
  return (
    <section className="relative rounded-[28px] border border-[#D8D8DD] bg-white/60 p-5 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#1D1D1F]">Pulmonary Visualizer</h2>
        <p className="text-xs text-[#6E6E73]">
          {analysisState === "analyzing" ? "Analyzing pulmonary regions..." : "AI imaging feed ready"}
        </p>
      </div>

      <div className="relative mt-4 overflow-hidden rounded-3xl border border-[#D6D6DC] bg-[radial-gradient(circle_at_50%_15%,#EAF2FF_0%,#EDF1F8_35%,#E3E8F0_100%)] p-8">
        <motion.div
          className={`relative mx-auto w-full max-w-[420px] ${ringTone(analysisState, hasResult)}`}
          animate={{ scale: [0.98, 1.02, 0.98] }}
          transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <LungHeatmapOverlay
            baseImageUrl={baseImageUrl}
            heatmapUrl={heatmapUrl}
            mode={overlayMode}
            intensity={intensity}
            regions={explainability}
            selectedRegion={selectedRegion}
            onSelectRegion={onSelectRegion}
          />
        </motion.div>

        <ScanAnimation active={analysisState === "analyzing"} />
      </div>
    </section>
  );
}

