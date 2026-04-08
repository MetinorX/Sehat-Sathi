import { motion } from "framer-motion";
import { Building2, Stethoscope, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";

const roles = [
  {
    id: "patient",
    title: "Patient",
    description: "Run your personal risk assessment and get wellness recommendations.",
    icon: UserRound,
    accent: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    id: "doctor",
    title: "Doctor",
    description: "Review AI predictions with explainability and confidence indicators.",
    icon: Stethoscope,
    accent: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    id: "hospital_admin",
    title: "Hospital Admin",
    description: "Monitor validated outputs and blockchain-backed clinical integrity.",
    icon: Building2,
    accent: "text-violet-600",
    bg: "bg-violet-50",
  },
];

export default function RoleSelection() {
  const navigate = useNavigate();

  const handleSelectRole = (role) => {
    window.localStorage.setItem("madhumeha_role", role);
    navigate("/dashboard");
  };

  return (
    <motion.main
      className="hero-gradient min-h-screen px-4 py-20 sm:px-6 lg:px-8"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35 }}
    >
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">User Flow</p>
          <h1 className="font-display mt-3 text-4xl font-bold text-slate-900 sm:text-5xl">Select Your Role</h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-600">
            Choose a role to tailor how Madhumeha AI System presents prediction insights and verification details.
          </p>
        </div>

        <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {roles.map((role, index) => {
            const Icon = role.icon;
            return (
              <motion.button
                key={role.id}
                type="button"
                onClick={() => handleSelectRole(role.id)}
                className="glass-card rounded-2xl p-6 text-left"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className={`inline-flex rounded-xl ${role.bg} p-3`}>
                  <Icon className={`h-6 w-6 ${role.accent}`} />
                </div>
                <h2 className="font-display mt-4 text-2xl font-semibold text-slate-900">{role.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{role.description}</p>
              </motion.button>
            );
          })}
        </section>
      </div>
    </motion.main>
  );
}