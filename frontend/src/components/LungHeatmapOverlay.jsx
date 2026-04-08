import { motion } from "framer-motion";
import LungRegionMarkers from "./LungRegionMarkers";

export default function LungHeatmapOverlay({
  baseImageUrl,
  heatmapUrl,
  mode = "overlay",
  intensity = 40,
  regions = [],
  selectedRegion,
  onSelectRegion,
}) {
  const safeIntensity = Math.max(0, Math.min(100, Number(intensity) || 0)) / 100;
  const hasHeatmap = Boolean(heatmapUrl);

  return (
    <div className="relative mx-auto w-full max-w-[420px] overflow-hidden rounded-2xl border border-[#D8D8DD] bg-black/5">
      <img
        src={baseImageUrl}
        alt="Original lung scan"
        className={`w-full object-contain transition ${mode === "heatmap" ? "opacity-30" : "opacity-100"}`}
        draggable={false}
      />

      {hasHeatmap && mode !== "original" ? (
        <motion.img
          src={heatmapUrl}
          alt="AI focus heatmap"
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            opacity: safeIntensity,
            mixBlendMode: "multiply",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: safeIntensity }}
          transition={{ duration: 0.3 }}
        />
      ) : null}

      {(mode === "overlay" || mode === "original") && regions.length ? (
        <LungRegionMarkers regions={regions} onSelectRegion={onSelectRegion} selectedRegion={selectedRegion} />
      ) : null}
    </div>
  );
}

