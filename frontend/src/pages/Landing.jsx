import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Hero from "../components/Hero";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <motion.div
      className="min-h-screen"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35 }}
    >
      <Hero
        onGetPredictionClick={() => navigate("/role")}
        onOpenRole={() => navigate("/role")}
        onOpenHub={() => navigate("/dashboard")}
        onOpenDiabetes={() => navigate("/dashboard/diabetes")}
        onOpenLung={() => navigate("/dashboard/lung")}
      />
    </motion.div>
  );
}
