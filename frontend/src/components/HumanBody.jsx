import { motion } from "framer-motion";
import BodyNode from "./BodyNode";
import ProgressRing from "./ProgressRing";
import humanBodyImage from "../assets/human-body.png";

const nodeMap = [
  { id: "HEAD", label: "Age", position: { x: "50%", y: "16%" }, field: "Age" },
  { id: "CHEST", label: "BloodPressure", position: { x: "50%", y: "34%" }, field: "BloodPressure" },
  { id: "ABDOMEN", label: "Glucose / Insulin / BMI", position: { x: "50%", y: "50%" }, field: "Glucose" },
  { id: "LOWER_BODY", label: "Pregnancies / SkinThickness", position: { x: "50%", y: "73%" }, field: "Pregnancies" },
];

export default function HumanBody({ activeRegion, onNodeClick, completion }) {
  return (
    <div className="relative rounded-xl border border-[rgba(0,0,0,0.05)] bg-[rgba(255,255,255,0.6)] p-4 backdrop-blur-[20px]">
      <div className="relative flex h-[78vh] items-center justify-center overflow-hidden rounded-lg bg-white">
        <ProgressRing percentage={completion} />

        <motion.img
          src={humanBodyImage}
          alt="Human anatomy"
          className="h-[75vh] object-contain mx-auto drop-shadow-[0_20px_60px_rgba(0,0,0,0.08)]"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        />

        {activeRegion ? (
          <motion.div
            className="pointer-events-none absolute rounded-full bg-[#3A86FF]/10"
            style={{
              left: activeRegion === "HEAD" ? "50%" : activeRegion === "CHEST" ? "50%" : activeRegion === "ABDOMEN" ? "50%" : "50%",
              top: activeRegion === "HEAD" ? "16%" : activeRegion === "CHEST" ? "34%" : activeRegion === "ABDOMEN" ? "50%" : "73%",
              width: activeRegion === "ABDOMEN" ? 120 : 90,
              height: activeRegion === "ABDOMEN" ? 120 : 90,
              transform: "translate(-50%, -50%)",
            }}
            animate={{ opacity: [0.22, 0.4, 0.22], scale: [0.95, 1.06, 0.95] }}
            transition={{ duration: activeRegion === "ABDOMEN" ? 1.8 : 2.4, repeat: Infinity }}
          />
        ) : null}

        {nodeMap.map((node) => (
          <BodyNode
            key={node.id}
            label={node.label}
            active={activeRegion === node.id}
            position={node.position}
            onClick={() => onNodeClick(node.id, node.field)}
          />
        ))}
      </div>
    </div>
  );
}
