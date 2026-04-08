import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Sparkles } from "lucide-react";

const numericFields = [
  { key: "Pregnancies", label: "Pregnancies", min: 0, max: 20, step: "1" },
  { key: "Glucose", label: "Glucose", min: 0, max: 300, step: "1" },
  { key: "BloodPressure", label: "Blood Pressure", min: 0, max: 200, step: "1" },
  { key: "SkinThickness", label: "Skin Thickness", min: 0, max: 120, step: "1" },
  { key: "Insulin", label: "Insulin", min: 0, max: 1000, step: "1" },
  { key: "BMI", label: "BMI", min: 0, max: 80, step: "0.1" },
  {
    key: "DiabetesPedigreeFunction",
    label: "Diabetes Pedigree Function",
    min: 0,
    max: 3,
    step: "0.001",
  },
  { key: "Age", label: "Age", min: 1, max: 120, step: "1" },
];

const categoricalFields = [
  { key: "Prakriti", label: "Prakriti", options: ["Vata", "Pitta", "Kapha"] },
  { key: "PhysicalActivity", label: "Physical Activity", options: ["Low", "Medium", "High"] },
  { key: "DietType", label: "Diet Type", options: ["Veg", "Mixed", "NonVeg"] },
  { key: "StressLevel", label: "Stress Level", options: ["1", "2", "3"] },
  { key: "FrequentUrination", label: "Frequent Urination", options: ["Yes", "No"] },
  { key: "ExcessThirst", label: "Excess Thirst", options: ["Yes", "No"] },
  { key: "Fatigue", label: "Fatigue", options: ["Yes", "No"] },
];

export default function InputForm({ onSubmitPrediction, onValidationError, isLoading }) {
  const [form, setForm] = useState({
    Pregnancies: 2,
    Glucose: 120,
    BloodPressure: 80,
    SkinThickness: 25,
    Insulin: 90,
    BMI: 25,
    DiabetesPedigreeFunction: 0.45,
    Age: 30,
    Prakriti: "Pitta",
    PhysicalActivity: "Medium",
    DietType: "Mixed",
    StressLevel: "2",
    FrequentUrination: "No",
    ExcessThirst: "No",
    Fatigue: "No",
  });
  const [errors, setErrors] = useState({});
  const [localError, setLocalError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    const isNumericField = numericFields.some((field) => field.key === name);

    setForm((prev) => ({
      ...prev,
      [name]: value === "" ? "" : isNumericField ? Number(value) : value,
    }));
  };

  const fieldErrors = useMemo(() => {
    const next = {};

    numericFields.forEach((field) => {
      const value = Number(form[field.key]);
      if (form[field.key] === "" || Number.isNaN(value)) {
        next[field.key] = "Required";
      } else if (value < field.min) {
        next[field.key] = `Must be >= ${field.min}`;
      } else if (value > field.max) {
        next[field.key] = `Must be <= ${field.max}`;
      }
    });

    categoricalFields.forEach((field) => {
      const value = form[field.key];
      if (!value) {
        next[field.key] = "Required";
      }
    });

    return next;
  }, [form]);

  const isFormValid = Object.keys(fieldErrors).length === 0;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrors(fieldErrors);
    setLocalError("");

    if (Object.keys(fieldErrors).length > 0) {
      const message = "Please fill all required fields correctly before submitting.";
      setLocalError(message);
      if (onValidationError) {
        onValidationError(message);
      }
      return;
    }

    const payload = {
      ...form,
      StressLevel: Number(form.StressLevel),
    };

    try {
      await onSubmitPrediction(payload);
    } catch (_error) {
      // Error message is managed by the prediction hook state.
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
      {localError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700 sm:px-4 sm:py-3 sm:text-sm">
          {localError}
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Clinical Biomarkers</h3>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {numericFields.map((field) => {
          const hasValue = form[field.key] !== "";
          const hasError = Boolean(errors[field.key]);

          return (
            <motion.label
              key={field.key}
              className="group relative block"
              whileHover={{ scale: 1.01 }}
            >
              <span
                className={`pointer-events-none absolute left-4 z-10 rounded bg-white px-1 text-xs font-medium transition-all duration-200 ${
                  hasValue
                    ? "-top-2 text-blue-600"
                    : "top-3.5 text-slate-400 group-focus-within:-top-2 group-focus-within:text-blue-600"
                }`}
              >
                {field.label}
              </span>
              <input
                name={field.key}
                type="number"
                min={field.min}
                max={field.max}
                step={field.step}
                value={form[field.key]}
                onChange={handleChange}
                className={`w-full rounded-2xl border bg-white/80 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:opacity-0 focus:ring-4 sm:px-4 sm:py-3 sm:text-base ${
                  hasError
                    ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100"
                    : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                }`}
                placeholder={field.label}
                required
              />
              {hasError && <span className="mt-1 block text-xs text-rose-600">{errors[field.key]}</span>}
            </motion.label>
          );
        })}
      </div>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Lifestyle & Symptoms</h3>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">

        {categoricalFields.map((field) => {
          const hasError = Boolean(errors[field.key]);

          return (
            <motion.label
              key={field.key}
              className="group relative block"
              whileHover={{ scale: 1.015 }}
            >
              <span className="pointer-events-none absolute -top-2 left-4 z-10 rounded bg-white px-1 text-xs font-medium text-blue-600 transition-all duration-200">
                {field.label}
              </span>
              <div className="relative">
                <select
                  name={field.key}
                  value={String(form[field.key])}
                  onChange={handleChange}
                  className={`w-full appearance-none rounded-2xl border bg-gradient-to-b from-white to-slate-50/90 px-3.5 py-2.5 pr-10 text-sm font-medium text-slate-800 shadow-[0_8px_24px_-18px_rgba(15,23,42,0.45)] outline-none transition duration-300 focus:ring-4 sm:px-4 sm:py-3 sm:text-base ${
                    hasError
                      ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100"
                      : "border-slate-200 hover:border-blue-300 hover:shadow-[0_14px_28px_-20px_rgba(37,99,235,0.5)] focus:border-blue-500 focus:ring-blue-100"
                  }`}
                  required
                >
                  {field.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 transition group-hover:text-blue-600" />
              </div>
              {hasError && <span className="mt-1 block text-xs text-rose-600">{errors[field.key]}</span>}
            </motion.label>
          );
        })}
      </div>

      <motion.button
        type="submit"
        disabled={isLoading || !isFormValid}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="group relative inline-flex h-11 w-full items-center justify-center overflow-hidden rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-[0_18px_36px_-22px_rgba(37,99,235,0.95)] transition duration-300 hover:scale-105 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 sm:h-12 sm:w-auto"
      >
        <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition duration-700 group-hover:translate-x-full" />
        <span className="relative inline-flex items-center gap-2">
          {isLoading ? (
            <>
              <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Predicting...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Start Prediction
            </>
          )}
        </span>
      </motion.button>
    </form>
  );
}