import { motion } from "framer-motion";

export default function LungRegionMarkers({ regions = [], onSelectRegion, selectedRegion }) {
  if (!regions.length) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {regions.map((region, index) => {
        const selected = selectedRegion?.label === region.label;
        return (
          <button
            key={`${region.label}-${index}`}
            type="button"
            className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${region.x * 100}%`, top: `${region.y * 100}%` }}
            onClick={() => onSelectRegion(region)}
            title={region.label}
          >
            <motion.span
              className={`absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                selected ? "bg-[#EF4444]/45" : "bg-[#F59E0B]/35"
              }`}
              animate={{ scale: [0.9, 1.35, 0.9], opacity: [0.4, 0.85, 0.4] }}
              transition={{ duration: 1.8, repeat: Infinity, delay: index * 0.2 }}
            />
            <span className="relative block h-3.5 w-3.5 rounded-full border border-white bg-[#FFFFFF] shadow-[0_0_0_3px_rgba(245,158,11,0.5)]" />
          </button>
        );
      })}
    </div>
  );
}

