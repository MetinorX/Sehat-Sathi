import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, AlertCircle, Server } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import DiabetesForm, { FIELD_SCHEMA, SAMPLE_PATIENT, HEALTHY_BASELINE, DEFAULT_CLINICAL_VALUES } from "../components/DiabetesForm";
import HumanBodyInteractive from "../components/HumanBodyInteractive";
import PredictionPanel from "../components/PredictionPanel";
import ModelMetrics from "../components/ModelMetrics";
import Charts from "../components/Charts";
import ExplainabilityPanel from "../components/ExplainabilityPanel";
import FeatureImportanceChart from "../components/FeatureImportanceChart";
import ReportDownloadButton from "../components/ReportDownloadButton";
import ComparisonPanel from "../components/ComparisonPanel";
import useLLMExplanation from "../hooks/useLLMExplanation";
import { healthCheck, predictDiabetesUnified } from "../services/api";

const roleTitleMap = {
  patient: "Patient",
  doctor: "Doctor",
  hospital_admin: "Hospital Admin",
};

const FIELD_TO_NODE = FIELD_SCHEMA.reduce((acc, field) => {
  acc[field.key] = field.node;
  return acc;
}, {});

function validateValues(values) {
  const errors = {};

  FIELD_SCHEMA.forEach((field) => {
    const raw = values[field.key];

    if (field.type === "select") {
      if (raw === undefined || raw === null || raw === "") {
        errors[field.key] = "Required";
      }
      return;
    }

    const value = Number(raw);
    if (field.key === "skinThickness" && (raw === "" || raw === null || raw === undefined)) {
      return;
    }

    if (raw === "" || Number.isNaN(value)) {
      errors[field.key] = "Required";
      return;
    }

    if (value < field.min || value > field.max) {
      errors[field.key] = `Enter ${field.min} - ${field.max}`;
    }
  });

  return errors;
}

function deriveLiveRisk(values, result) {
  if (result?.category) {
    return {
      label: String(result.category),
      score: Math.max(0, Math.min(1, Number(result.risk_score) || 0)),
    };
  }

  const glucose = Number(values.glucose);
  const bmi = Number(values.bmi);
  const age = Number(values.age);
  const pedigree = Number(values.diabetesPedigreeFunction);
  const glucosePart = Number.isFinite(glucose) ? Math.min(1, glucose / 200) * 0.55 : 0;
  const bmiPart = Number.isFinite(bmi) ? Math.min(1, bmi / 60) * 0.2 : 0;
  const agePart = Number.isFinite(age) ? Math.min(1, age / 100) * 0.15 : 0;
  const pedigreePart = Number.isFinite(pedigree) ? Math.min(1, pedigree / 2.5) * 0.1 : 0;
  const score = glucosePart + bmiPart + agePart + pedigreePart;

  if (score >= 0.7) return { label: "High", score };
  if (score >= 0.4) return { label: "Medium", score };
  return { label: "Low", score };
}

function hintEngine(values, liveRiskLabel) {
  const hints = [];
  const glucose = Number(values.glucose);
  const bmi = Number(values.bmi);
  const age = Number(values.age);
  const bloodPressure = Number(values.bloodPressure);

  if (Number.isFinite(glucose) && glucose >= 140) hints.push("High glucose increases risk.");
  if (Number.isFinite(bmi) && bmi >= 30) hints.push("BMI above 30 detected.");
  if (Number.isFinite(bloodPressure) && bloodPressure >= 90) hints.push("Elevated blood pressure should be reviewed.");
  if (Number.isFinite(age) && age >= 50) hints.push("Age profile suggests stronger metabolic screening.");
  if (hints.length === 0) hints.push(`Current profile trends ${liveRiskLabel.toLowerCase()} risk.`);

  return hints.slice(0, 3);
}

function extractEstimatedFeatures(result, comparisonPrediction) {
  const unified = comparisonPrediction?.estimated?.features || [];
  if (unified.length) return unified;
  return Array.isArray(result?.estimated_features) ? result.estimated_features : [];
}

function riskTone(category) {
  if (category === "High") return "text-[#C64545]";
  if (category === "Medium") return "text-[#B66E15]";
  return "text-[#2F7C5E]";
}

export default function DiabetesDashboard() {
  const selectedRole = window.localStorage.getItem("madhumeha_role");
  const navigate = useNavigate();

  const [values, setValues] = useState({ ...DEFAULT_CLINICAL_VALUES });
  const [errors, setErrors] = useState({});
  const [activeNode, setActiveNode] = useState("ABDOMEN");
  const [result, setResult] = useState(null);

  const [isPredicting, setIsPredicting] = useState(false);
  const [healthLoading, setHealthLoading] = useState(true);
  const [health, setHealth] = useState({ api: "offline", diabetes_model: "disconnected" });
  const [apiLatency, setApiLatency] = useState(null);
  const [requestError, setRequestError] = useState("");
  const requestIdRef = useRef(0);
  const [comparisonPrediction, setComparisonPrediction] = useState(null);
  const { explanation: llmExplanation, loading: llmLoading, requestExplanation, reset: resetLLM } = useLLMExplanation();

  useEffect(() => {
    let mounted = true;

    async function checkHealth() {
      setHealthLoading(true);
      const start = performance.now();
      try {
        const data = await healthCheck();
        if (mounted) {
          setHealth(data || { api: "online", diabetes_model: "connected" });
          setApiLatency(Math.round(performance.now() - start));
        }
      } catch (_) {
        if (mounted) {
          setHealth({ api: "offline", diabetes_model: "disconnected" });
          setApiLatency(null);
        }
      } finally {
        if (mounted) {
          setHealthLoading(false);
        }
      }
    }

    checkHealth();
    return () => {
      mounted = false;
    };
  }, []);

  const completionCount = useMemo(() => {
    const validCount = FIELD_SCHEMA.filter((field) => {
      if (field.key === "skinThickness") {
        const raw = values[field.key];
        if (raw === "" || raw === null || raw === undefined) return true;
      }
      const value = Number(values[field.key]);
      return Number.isFinite(value) && value >= field.min && value <= field.max;
    }).length;
    return validCount;
  }, [values]);

  const completion = useMemo(
    () => Math.round((completionCount / FIELD_SCHEMA.length) * 100),
    [completionCount]
  );

  const isFormValid = useMemo(() => Object.keys(validateValues(values)).length === 0, [values]);
  const liveRisk = useMemo(() => deriveLiveRisk(values, result), [values, result]);
  const hints = useMemo(() => hintEngine(values, liveRisk.label), [values, liveRisk.label]);
  const estimatedFeatures = useMemo(
    () => extractEstimatedFeatures(result, comparisonPrediction),
    [result, comparisonPrediction]
  );

  useEffect(() => {
    if (!isFormValid) {
      return;
    }

    const timeout = setTimeout(async () => {
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      setIsPredicting(true);
      setRequestError("");
      const start = performance.now();

      try {
        const response = await predictDiabetesUnified(values);
        if (requestId !== requestIdRef.current) return;
        const diabetesProbability = Number(response?.prediction?.probabilities?.positive ?? 0);
        const normalizedResult = {
          risk_score: diabetesProbability,
          category: String(response?.prediction?.label || "Low Risk").replace(" Risk", ""),
          confidence: Number(response?.prediction?.confidence ?? 0),
          base_confidence: Number(response?.prediction?.confidence ?? 0) / Math.max(0.01, Number(response?.estimated?.confidence_adjustment_factor ?? 1)),
          confidence_adjustment_factor: Number(response?.estimated?.confidence_adjustment_factor ?? 1),
          estimated_inputs: response?.estimated?.inputs || [],
          estimated_features: response?.estimated?.features || [],
          explanation: response?.explainability?.features?.map((item) => ({
            feature: item.name,
            impact: Number(item.impact),
            estimated: Boolean(item.estimated),
          })) || [],
          insights: response?.insights || [],
          clinical_interpretation: response?.clinical_interpretation || "",
          explanation_method: response?.explainability?.type || "shap",
          timestamp: new Date().toISOString(),
        };
        setResult(normalizedResult);
        setComparisonPrediction(response);
        if (response?.validation?.status !== "blocked") {
          requestExplanation({
            task: "diabetes",
            prediction: response?.prediction || {},
            explainability: response?.explainability || {},
          }).catch(() => null);
        }
        setApiLatency(Math.round(performance.now() - start));
        setHealth((prev) => ({ ...prev, diabetes_model: "connected", api: "online" }));
      } catch (error) {
        if (requestId !== requestIdRef.current) return;
        setRequestError(error?.response?.data?.detail || "Model unavailable. Please retry.");
        setHealth((prev) => ({ ...prev, diabetes_model: "disconnected" }));
      } finally {
        if (requestId === requestIdRef.current) {
          setIsPredicting(false);
        }
      }
    }, 520);

    return () => clearTimeout(timeout);
  }, [values, isFormValid]);

  if (!selectedRole || !(selectedRole in roleTitleMap)) {
    return <Navigate to="/role" replace />;
  }

  function onFieldChange(key, value) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setActiveNode(FIELD_TO_NODE[key] || "ABDOMEN");
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function scrollToFirstMissing(nextErrors) {
    const firstMissing = FIELD_SCHEMA.find((field) => nextErrors[field.key]);
    if (!firstMissing) return;

    setActiveNode(firstMissing.node);
    const fieldEl = document.getElementById(`diabetes-field-${firstMissing.key}`);
    if (fieldEl) {
      fieldEl.scrollIntoView({ behavior: "smooth", block: "center" });
      fieldEl.classList.add("ring-2", "ring-[#E25858]/50");
      setTimeout(() => fieldEl.classList.remove("ring-2", "ring-[#E25858]/50"), 850);
    }
  }

  function onNodeClick(node, section) {
    setActiveNode(node);
    const sectionEl = document.getElementById(`diabetes-section-${section}`);
    if (sectionEl) {
      sectionEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  async function onGenerateReport() {
    const nextErrors = validateValues(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      scrollToFirstMissing(nextErrors);
      return;
    }

    const start = performance.now();
    setIsPredicting(true);
    try {
      const response = await predictDiabetesUnified(values);
      const diabetesProbability = Number(response?.prediction?.probabilities?.positive ?? 0);
      const normalizedResult = {
        risk_score: diabetesProbability,
        category: String(response?.prediction?.label || "Low Risk").replace(" Risk", ""),
        confidence: Number(response?.prediction?.confidence ?? 0),
        base_confidence: Number(response?.prediction?.confidence ?? 0) / Math.max(0.01, Number(response?.estimated?.confidence_adjustment_factor ?? 1)),
        confidence_adjustment_factor: Number(response?.estimated?.confidence_adjustment_factor ?? 1),
        estimated_inputs: response?.estimated?.inputs || [],
        estimated_features: response?.estimated?.features || [],
        explanation: response?.explainability?.features?.map((item) => ({
          feature: item.name,
          impact: Number(item.impact),
          estimated: Boolean(item.estimated),
        })) || [],
        insights: response?.insights || [],
        clinical_interpretation: response?.clinical_interpretation || "",
        explanation_method: response?.explainability?.type || "shap",
        timestamp: new Date().toISOString(),
      };
      setResult(normalizedResult);
      setComparisonPrediction(response);
      if (response?.validation?.status !== "blocked") {
        requestExplanation({
          task: "diabetes",
          prediction: response?.prediction || {},
          explainability: response?.explainability || {},
        }).catch(() => null);
      }
      setApiLatency(Math.round(performance.now() - start));
      setHealth((prev) => ({ ...prev, diabetes_model: "connected" }));
    } catch (error) {
      setResult(null);
      setRequestError(
        error?.response?.data?.detail ||
          "Model unavailable. Please retry."
      );
      setHealth((prev) => ({ ...prev, diabetes_model: "disconnected" }));
    } finally {
      setIsPredicting(false);
    }
  }

  function onResetForm() {
    setValues({ ...DEFAULT_CLINICAL_VALUES });
    setErrors({});
    setResult(null);
    setComparisonPrediction(null);
    resetLLM();
    setRequestError("");
  }

  function onUseHealthyBaseline() {
    setValues({ ...HEALTHY_BASELINE });
    setErrors({});
  }

  const modelConnected = health.diabetes_model === "connected";
  const statusRadius = 52;
  const statusCircumference = 2 * Math.PI * statusRadius;
  const statusOffset = statusCircumference - (completion / 100) * statusCircumference;

  return (
    <main className="min-h-screen bg-[#F5F5F7] px-4 py-7 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1650px]">
        <header className="mb-5 rounded-2xl border border-[#D9D9DE] bg-white/60 px-5 py-4 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6E6E73]">Clinical Workspace</p>
              <h1 className="mt-1 text-2xl font-semibold text-[#1D1D1F]">Diabetes Prediction Dashboard</h1>
              <p className="mt-1 text-sm text-[#6E6E73]">Production-grade structured intake with real-time model feedback.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="inline-flex items-center gap-2 rounded-lg border border-[#D0D0D7] bg-white px-3 py-2 text-sm font-medium text-[#4A4A53] hover:bg-[#F2F2F4]"
              >
                <ArrowLeft className="h-4 w-4" />
                Hub
              </button>
              <div className="rounded-lg border border-[#D0D0D7] bg-white px-3 py-2 text-sm text-[#6E6E73]">
                Role: <span className="font-semibold text-[#1D1D1F]">{roleTitleMap[selectedRole]}</span>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-5 xl:grid-cols-[320px_1fr_480px]">
          <aside className="space-y-3">
            <div className="rounded-2xl border border-[#D8D8DD] bg-white/60 p-4 backdrop-blur-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6E6E73]">Model Status</p>
              <p className={`mt-2 text-sm font-semibold ${modelConnected ? "text-[#2F7C5E]" : "text-[#C64545]"}`}>
                {modelConnected ? "Connected" : "Disconnected"}
              </p>
              <p className="mt-1 text-xs text-[#6E6E73]">API latency: {apiLatency !== null ? `${apiLatency} ms` : "--"}</p>
            </div>

            <div className="rounded-2xl border border-[#D8D8DD] bg-white/60 p-4 backdrop-blur-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6E6E73]">Completion Tracker</p>
              <div className="mt-2 flex items-center gap-3">
                <svg className="h-28 w-28 -rotate-90" viewBox="0 0 140 140" aria-hidden="true">
                  <circle cx="70" cy="70" r={statusRadius} className="fill-none" stroke="#E2E2E8" strokeWidth="10" />
                  <motion.circle
                    cx="70"
                    cy="70"
                    r={statusRadius}
                    className="fill-none"
                    stroke="#5F5F69"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={statusCircumference}
                    animate={{ strokeDashoffset: statusOffset }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  />
                </svg>
                <div>
                  <p className="text-lg font-semibold text-[#1D1D1F]">{completionCount} / {FIELD_SCHEMA.length}</p>
                  <p className="text-xs text-[#6E6E73]">fields completed</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#D8D8DD] bg-white/60 p-4 backdrop-blur-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6E6E73]">Risk Indicator (Live)</p>
              <p className={`mt-2 text-lg font-semibold ${riskTone(liveRisk.label)}`}>{liveRisk.label}</p>
              <p className="text-xs text-[#6E6E73]">{Math.round(liveRisk.score * 100)}% estimated risk trend</p>
            </div>

            <div className="rounded-2xl border border-[#D8D8DD] bg-white/60 p-4 backdrop-blur-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6E6E73]">Clinical Hint Engine</p>
              <ul className="mt-2 space-y-1.5 text-sm text-[#4A4A53]">
                {hints.map((hint) => (
                  <li key={hint} className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 text-[#7A7A84]" />
                    <span>{hint}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-[#D8D8DD] bg-white/60 p-4 backdrop-blur-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6E6E73]">Service Health</p>
              <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[#1D1D1F]">
                <Server className="h-4 w-4 text-[#70707A]" />
                {healthLoading ? "Checking..." : health.api === "online" ? "Healthy" : "Unavailable"}
              </p>
            </div>
          </aside>

          <HumanBodyInteractive
            activeRegion={activeNode}
            completionPercent={completion}
            riskCategory={liveRisk.label}
            onRegionClick={onNodeClick}
          />

          <div className="space-y-4">
            <PredictionPanel
              loading={isPredicting}
              result={result}
              connected={modelConnected}
              values={values}
              requestError={requestError}
              estimatedInputs={result?.estimated_inputs || []}
              confidenceAdjustmentFactor={Number(result?.confidence_adjustment_factor ?? 1)}
            />
            <DiabetesForm
              values={values}
              errors={errors}
              activeNode={activeNode}
              loading={isPredicting}
              isValid={isFormValid}
              onFieldChange={onFieldChange}
              onNodeFocus={setActiveNode}
              onAutoFill={() => {
                setValues({ ...SAMPLE_PATIENT });
                setErrors({});
              }}
              onUseHealthyBaseline={onUseHealthyBaseline}
              onReset={onResetForm}
              onSubmit={onGenerateReport}
              estimatedFeatures={estimatedFeatures}
            />
          </div>
        </section>

        {result ? (
          <section className="mt-6 space-y-6">
            <ModelMetrics />
            <div className="rounded-[28px] border border-[#D8D8DD] bg-white/60 p-5 shadow-[0_14px_34px_rgba(0,0,0,0.06)] backdrop-blur-xl">
              <h2 className="text-xl font-semibold text-[#1D1D1F]">Prediction Result</h2>
              <p className="mt-1 text-sm text-[#6E6E73]">
                Risk Score: {Math.round((Number(result?.risk_score ?? 0) || 0) * 100)}%
              </p>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <ExplainabilityPanel explanation={result?.explanation || []} loading={isPredicting} />
                <FeatureImportanceChart explanation={result?.explanation || []} loading={isPredicting} />
              </div>

              <div className="mt-4 rounded-2xl border border-[#D9D9DE] bg-white/80 p-4">
                <h3 className="text-base font-semibold text-[#1D1D1F]">Insights</h3>
                <ul className="mt-2 space-y-1.5 text-sm text-[#4A4A53]">
                  {(result?.insights || []).length > 0 ? (
                    result.insights.map((insight) => <li key={insight}>• {insight}</li>)
                  ) : (
                    <li>• No additional rule-based insights available.</li>
                  )}
                </ul>
                <p className="mt-3 text-sm text-[#6E6E73]">
                  {result?.clinical_interpretation || "Clinical interpretation will be available after prediction."}
                </p>
              </div>

              <div className="mt-4">
                <ReportDownloadButton
                  values={values}
                  disabled={isPredicting || !isFormValid}
                  estimatedInputs={result?.estimated_inputs || []}
                />
              </div>
            </div>
            <Charts result={result} />
            <ComparisonPanel
              predictionData={comparisonPrediction}
              llmExplanation={llmExplanation}
              llmLoading={llmLoading}
              predictionLoading={isPredicting}
            />
          </section>
        ) : null}
      </div>
    </main>
  );
}
