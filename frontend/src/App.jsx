import { Suspense, lazy } from "react";
import { AnimatePresence } from "framer-motion";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

const Landing = lazy(() => import("./pages/Landing"));
const RoleSelection = lazy(() => import("./pages/RoleSelection"));
const DashboardHub = lazy(() => import("./pages/DashboardHub"));
const DiabetesWorkspace = lazy(() => import("./pages/DiabetesDashboard"));
const LungWorkspace = lazy(() => import("./pages/LungWorkspace"));

function RequireRole({ children }) {
  const selectedRole = window.localStorage.getItem("madhumeha_role");
  if (!selectedRole) {
    return <Navigate to="/role" replace />;
  }
  return children;
}

function App() {
  const location = useLocation();

  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Landing />} />
          <Route path="/role" element={<RoleSelection />} />
          <Route
            path="/dashboard"
            element={
              <RequireRole>
                <DashboardHub />
              </RequireRole>
            }
          />
          <Route
            path="/dashboard/diabetes"
            element={
              <RequireRole>
                <DiabetesWorkspace />
              </RequireRole>
            }
          />
          <Route
            path="/dashboard/lung"
            element={
              <RequireRole>
                <LungWorkspace />
              </RequireRole>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </Suspense>
  );
}

export default App;