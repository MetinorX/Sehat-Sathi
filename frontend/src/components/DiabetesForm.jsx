import { motion } from "framer-motion";

export const FIELD_SCHEMA = [
  {
    key: "glucose",
    label: "Glucose (Fasting Plasma Glucose)",
    min: 50,
    max: 300,
    step: 1,
    unit: "mg/dL",
    hint: "Normal: 70-100 mg/dL",
    defaultValue: 100,
    section: "metabolic",
    node: "ABDOMEN",
  },
  {
    key: "insulin",
    label: "Insulin (2-hour serum insulin)",
    min: 0,
    max: 300,
    step: 1,
    unit: "µU/mL",
    defaultValue: 80,
    section: "metabolic",
    node: "ABDOMEN",
  },
  {
    key: "bmi",
    label: "BMI (Body Mass Index)",
    min: 10,
    max: 60,
    step: 0.1,
    unit: "kg/m²",
    defaultValue: 24,
    section: "metabolic",
    node: "ABDOMEN",
  },
  {
    key: "bloodPressure",
    label: "Blood Pressure (Diastolic)",
    min: 40,
    max: 140,
    step: 1,
    unit: "mmHg",
    hint: "Normal: ~80 mmHg",
    defaultValue: 80,
    section: "vitals",
    node: "CHEST",
  },
  {
    key: "skinThickness",
    label: "Skin Thickness",
    min: 10,
    max: 50,
    step: 1,
    unit: "mm",
    hint: "Auto-estimated if not provided",
    defaultValue: null,
    optional: true,
    section: "vitals",
    node: "CHEST",
  },
  { key: "pregnancies", label: "Pregnancies", min: 0, max: 15, step: 1, unit: "count", defaultValue: 0, section: "history", node: "LEGS" },
  {
    key: "diabetesPedigreeFunction",
    label: "Diabetes Pedigree Function",
    min: 0,
    max: 2.5,
    step: 0.01,
    unit: "score",
    defaultValue: 0.5,
    section: "history",
    node: "HEAD",
  },
  { key: "age", label: "Age", min: 1, max: 100, step: 1, unit: "years", defaultValue: 35, section: "history", node: "HEAD" },
];

export const SECTION_META = [
  { id: "metabolic", title: "Section 1: Metabolic Core" },
  { id: "vitals", title: "Section 2: Vitals" },
  { id: "history", title: "Section 3: History" },
];

export const DEFAULT_CLINICAL_VALUES = {
  age: 35,
  bmi: 24,
  glucose: 100,
  bloodPressure: 80,
  insulin: 80,
  pregnancies: 0,
  skinThickness: null,
  diabetesPedigreeFunction: 0.5,
};

export const HEALTHY_BASELINE = {
  age: 30,
  bmi: 22,
  glucose: 90,
  bloodPressure: 75,
  insulin: 70,
  pregnancies: 0,
  skinThickness: null,
  diabetesPedigreeFunction: 0.5,
};

export const SAMPLE_PATIENT = {
  glucose: 138,
  insulin: 94,
  bmi: 31.4,
  bloodPressure: 78,
  skinThickness: 29,
  pregnancies: 2,
  diabetesPedigreeFunction: 0.67,
  age: 42,
};

function riskState(fieldKey, value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return { label: "—", tone: "text-[#6E6E73]" };

  if (fieldKey === "glucose") {
    if (numeric <= 100) return { label: "🟢 Normal", tone: "text-[#2F7C5E]" };
    if (numeric <= 200) return { label: "🟡 Borderline", tone: "text-[#B66E15]" };
    return { label: "🔴 High risk", tone: "text-[#C64545]" };
  }
  if (fieldKey === "bmi") {
    if (numeric < 25) return { label: "🟢 Normal", tone: "text-[#2F7C5E]" };
    if (numeric <= 40) return { label: "🟡 Borderline", tone: "text-[#B66E15]" };
    return { label: "🔴 High risk", tone: "text-[#C64545]" };
  }
  if (fieldKey === "bloodPressure") {
    if (numeric <= 80) return { label: "🟢 Normal", tone: "text-[#2F7C5E]" };
    if (numeric <= 120) return { label: "🟡 Borderline", tone: "text-[#B66E15]" };
    return { label: "🔴 High risk", tone: "text-[#C64545]" };
  }
  return { label: "—", tone: "text-[#6E6E73]" };
}

function thresholdWarning(fieldKey, value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "";
  if (fieldKey === "glucose" && numeric > 200) return "Warning: Glucose above 200 mg/dL.";
  if (fieldKey === "bmi" && numeric > 40) return "Warning: BMI above 40.";
  if (fieldKey === "bloodPressure" && numeric > 120) return "Warning: Diastolic BP above 120 mmHg.";
  return "";
}

function FieldRow({ field, value, error, onChange, onFocus, estimatedFields = [] }) {
  const isValidValue = Number.isFinite(Number(value));
  const safeValue = isValidValue ? Number(value) : field.defaultValue ?? field.min;
  const isEstimated = field.key === "skinThickness" && estimatedFields.includes("Skin Thickness");
  const label = isEstimated ? "Skin Thickness (Auto-estimated)" : field.label;
  const state = riskState(field.key, value);
  const warning = thresholdWarning(field.key, value);

  return (
    <div id={`diabetes-field-${field.key}`} className="rounded-2xl border border-[#D9D9DE] bg-white/80 p-3.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <label className="text-[13px] font-semibold text-[#1D1D1F]">{label}</label>
        <div className="flex items-center gap-2">
          {isEstimated ? (
            <span className="rounded-full border border-[#F4D7A6] bg-[#FFF8EB] px-2 py-0.5 text-[10px] font-semibold text-[#8A5A05]">
              🟡 Estimated
            </span>
          ) : null}
          <span className="text-[11px] text-[#6E6E73]">{field.unit}</span>
        </div>
      </div>

      <input
        type="range"
        min={field.min}
        max={field.max}
        step={field.step}
        value={safeValue}
        onFocus={() => onFocus(field.node)}
        onChange={(event) => onChange(field.key, Number(event.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[#E5E5EA] accent-[#1D1D1F]"
      />

      <div className="mt-2 flex items-center gap-2">
        <input
          type="number"
          min={field.min}
          max={field.max}
          step={field.step}
          value={value ?? ""}
          onFocus={() => onFocus(field.node)}
          onChange={(event) => onChange(field.key, event.target.value === "" ? "" : Number(event.target.value))}
          className={`w-full rounded-xl border bg-white px-3 py-2 text-sm text-[#1D1D1F] outline-none transition ${
            error ? "border-[#E25858]" : "border-[#D0D0D7] focus:border-[#6E6E73]"
          }`}
        />
        <span className="min-w-[70px] text-right text-[11px] text-[#6E6E73]">{field.unit}</span>
      </div>

      <p className="mt-1 text-[11px] text-[#6E6E73]">
        Range: {field.min} - {field.max}
      </p>
      {field.hint ? <p className="mt-0.5 text-[11px] text-[#6E6E73]">{field.hint}</p> : null}
      <p className={`mt-0.5 text-[11px] font-semibold ${state.tone}`}>{state.label}</p>
      {warning ? <p className="mt-0.5 text-[11px] font-semibold text-[#B66E15]">{warning}</p> : null}
      {error ? <p className="mt-1 text-xs font-medium text-[#C93434]">{error}</p> : null}
    </div>
  );
}

export default function DiabetesForm({
  values,
  errors,
  activeNode,
  loading,
  isValid,
  onFieldChange,
  onNodeFocus,
  onAutoFill,
  onUseHealthyBaseline,
  onReset,
  onSubmit,
  estimatedFeatures = [],
}) {
  return (
    <div className="rounded-[28px] border border-[#D8D8DD] bg-white/60 p-4 shadow-[0_18px_40px_rgba(0,0,0,0.06)] backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6E6E73]">Structured Input System</p>
          <h2 className="mt-1 text-xl font-semibold text-[#1D1D1F]">Clinical Intake</h2>
        </div>
        <button
          type="button"
          onClick={onAutoFill}
          className="rounded-xl border border-[#D0D0D7] bg-white px-3 py-2 text-xs font-semibold text-[#1D1D1F] transition hover:bg-[#F5F5F7]"
        >
          Autofill Sample
        </button>
      </div>

      <div className="max-h-[66vh] space-y-3 overflow-y-auto pr-1">
        {SECTION_META.map((section) => {
          const sectionFields = FIELD_SCHEMA.filter((item) => item.section === section.id);
          const sectionActive = sectionFields.some((field) => field.node === activeNode);

          return (
            <motion.section
              key={section.id}
              id={`diabetes-section-${section.id}`}
              initial={{ opacity: 0.95, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl border p-3 ${
                sectionActive ? "border-[#B8C0CC] bg-[#F8F8FA]" : "border-[#DDDEE3] bg-white/70"
              }`}
            >
              <h3 className="mb-3 text-sm font-semibold text-[#1D1D1F]">{section.title}</h3>
              <div className="space-y-2.5">
                {sectionFields.map((field) => (
                  <FieldRow
                    key={field.key}
                    field={field}
                    value={values[field.key]}
                    error={errors[field.key]}
                    onChange={onFieldChange}
                    onFocus={onNodeFocus}
                    estimatedFields={estimatedFeatures}
                  />
                ))}
              </div>
            </motion.section>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <p className="col-span-2 text-xs text-[#6E6E73]">
          Leave Skin Thickness blank to auto-estimate from BMI and Age.
        </p>
        <button
          type="button"
          onClick={onUseHealthyBaseline}
          className="col-span-2 rounded-xl border border-[#D0D0D7] bg-white px-4 py-2 text-sm font-semibold text-[#1D1D1F] transition hover:bg-[#F5F5F7]"
        >
          Use Healthy Baseline
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={loading || !isValid}
          className="col-span-2 rounded-xl bg-[#1D1D1F] px-4 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-[#A0A0A8]"
        >
          {loading ? "Generating..." : "Generate Clinical Risk Report"}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="col-span-2 rounded-xl border border-[#D0D0D7] bg-white px-4 py-3 text-sm font-semibold text-[#1D1D1F] transition hover:bg-[#F5F5F7]"
        >
          Reset Inputs
        </button>
      </div>
    </div>
  );
}
