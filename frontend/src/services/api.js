import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

function buildDiabetesPayload(data) {
  const skinRaw = data.skinThickness;
  const skinThickness =
    skinRaw === "" || skinRaw === null || skinRaw === undefined || Number.isNaN(Number(skinRaw))
      ? null
      : Number(skinRaw);

  return {
    pregnancies: Number(data.pregnancies ?? 0),
    glucose: Number(data.glucose ?? data.fastingGlucose ?? 0),
    bloodPressure: Number(data.bloodPressure),
    skinThickness,
    insulin: Number(data.insulin),
    bmi: Number(data.bmi),
    diabetesPedigreeFunction: Number(data.diabetesPedigreeFunction ?? (Number(data.familyHistory) ? 0.8 : 0.2)),
    age: Number(data.age),
    gender: data.gender,
    familyHistory: Number(data.familyHistory),
    physicalActivity: data.physicalActivity,
    dietType: data.dietType,
    sleepHours: Number(data.sleepHours),
    fastingGlucose: Number(data.fastingGlucose),
    postprandialGlucose: Number(data.postprandialGlucose),
    hba1c: Number(data.hba1c),
    cholesterol: Number(data.cholesterol),
    frequentUrination: Number(data.frequentUrination),
    excessiveThirst: Number(data.excessiveThirst),
    fatigue: Number(data.fatigue),
    blurredVision: Number(data.blurredVision),
    weightLoss: Number(data.weightLoss),
  };
}

function normalizeUnifiedPrediction(raw) {
  const task = String(raw?.task || "").toLowerCase();
  const validation = raw?.validation || {};
  const prediction = raw?.prediction || {};
  const explainability = raw?.explainability || {};
  const checks = validation?.checks || {};
  const score = Number(validation?.score ?? 0);
  const status = String(validation?.status || (score < 60 ? "blocked" : "accepted_with_warning"));

  const trust =
    score >= 75 && status !== "blocked"
      ? "🟢 High Trust"
      : score >= 60 && status !== "blocked"
        ? "🟡 Moderate Trust"
        : "🔴 Low Trust / Blocked";

  return {
    task: task === "lung" ? "lung" : "diabetes",
    validation: {
      status,
      score,
      checks: {
        modality: String(checks?.modality || "fail"),
        view: String(checks?.view || "fail"),
        lung_detected: String(checks?.lung_detected || "fail"),
        quality: String(checks?.quality || "fail"),
        sanity: String(checks?.sanity || checks?.clinical_sanity || "fail"),
      },
      warnings: Array.isArray(validation?.warnings) ? validation.warnings.map((w) => String(w)) : [],
      trust,
    },
    prediction: {
      label: String(prediction?.label || "Unknown"),
      confidence: Math.max(0, Math.min(1, Number(prediction?.confidence ?? 0))),
      probabilities: prediction?.probabilities && typeof prediction.probabilities === "object" ? prediction.probabilities : {},
    },
    estimated: {
      inputs: Array.isArray(raw?.estimated_inputs) ? raw.estimated_inputs : [],
      features: Array.isArray(raw?.estimated_features) ? raw.estimated_features.map((item) => String(item)) : [],
      confidence_adjustment_factor: Number(raw?.confidence_adjustment_factor ?? 1),
    },
    explainability: {
      type: String(explainability?.type || (task === "lung" ? "gradcam" : "shap")).toLowerCase(),
      features: Array.isArray(explainability?.features)
        ? explainability.features
            .map((item) => ({
              name: String(item?.name || ""),
              impact: Number(item?.impact ?? 0),
              estimated: Boolean(item?.estimated),
            }))
            .filter((item) => item.name && Number.isFinite(item.impact))
            .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
        : [],
      heatmap_url: explainability?.heatmap_url ? String(explainability.heatmap_url) : "",
      regions: Array.isArray(raw?.regions)
        ? raw.regions
            .map((item) => ({
              x: Number(item?.x ?? 0),
              y: Number(item?.y ?? 0),
              label: String(item?.label || "Region of interest"),
              confidence: Number(item?.confidence ?? 0),
              explanation: String(item?.explanation || ""),
            }))
            .filter((item) => Number.isFinite(item.x) && Number.isFinite(item.y))
        : [],
    },
    report: {
      download_url: raw?.report?.download_url ? String(raw.report.download_url) : "",
    },
    insights: Array.isArray(raw?.insights) ? raw.insights.map((item) => String(item)) : [],
    clinical_interpretation: String(raw?.clinical_interpretation || ""),
    message: String(raw?.message || ""),
  };
}

function normalizeDiabetesResponse(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("Model unavailable. Please retry.");
  }

  const normalizeConfidence = (value, level) => {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.min(1, parsed));
    }

    const lvl = String(level || "").toLowerCase();
    if (lvl === "high") return 0.9;
    if (lvl === "medium") return 0.7;
    if (lvl === "low") return 0.55;
    return 0;
  };

  // New endpoint contract: { risk_score, category, confidence }
  if (raw.risk_score !== undefined) {
    const riskScore = Number(raw.risk_score);
    if (!Number.isFinite(riskScore)) {
      throw new Error("Invalid prediction response");
    }
    const explanation = Array.isArray(raw.explanation)
      ? raw.explanation
          .map((item) => ({
            feature: String(item?.feature || ""),
            impact: Number(item?.impact ?? 0),
            estimated: Boolean(item?.estimated),
          }))
          .filter((item) => item.feature && Number.isFinite(item.impact))
          .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
      : [];

    const insights = Array.isArray(raw.insights)
      ? raw.insights.map((item) => String(item))
      : [];

    return {
      risk_score: Math.max(0, Math.min(1, riskScore)),
      category: String(raw.category || "Low"),
      confidence: normalizeConfidence(raw.confidence, raw.confidence_level),
      base_confidence: normalizeConfidence(raw.base_confidence, raw.confidence_level),
      confidence_adjustment_factor: Number(raw.confidence_adjustment_factor ?? 1),
      estimated_inputs: Array.isArray(raw.estimated_inputs) ? raw.estimated_inputs : [],
      estimated_features: Array.isArray(raw.estimated_features) ? raw.estimated_features.map((item) => String(item)) : [],
      explanation,
      insights,
      clinical_interpretation: String(raw.clinical_interpretation || ""),
      explanation_method: String(raw.explanation_method || ""),
      timestamp: raw.timestamp,
      source: "public-api",
    };
  }

  // Legacy unified contract: { prediction: { probability, condition }, confidence }
  const probability = Number(raw?.prediction?.probability ?? raw?.probability);
  if (!Number.isFinite(probability)) {
    throw new Error("Invalid prediction response");
  }

  const condition = String(raw?.prediction?.condition || raw?.risk || "low_diabetes_risk").toLowerCase();
  let category = "Low";
  if (condition.includes("high")) category = "High";
  else if (condition.includes("moderate")) category = "Medium";
  else if (probability >= 0.7) category = "High";
  else if (probability >= 0.4) category = "Medium";

  return {
    risk_score: Math.max(0, Math.min(1, probability)),
    category,
    confidence: normalizeConfidence(raw?.confidence, raw?.prediction?.confidence_level ?? raw?.confidence_level),
    base_confidence: normalizeConfidence(raw?.confidence, raw?.prediction?.confidence_level ?? raw?.confidence_level),
    confidence_adjustment_factor: 1,
    estimated_inputs: [],
    estimated_features: [],
    explanation: [],
    insights: [],
    clinical_interpretation: "",
    explanation_method: "legacy",
    timestamp: null,
    source: "legacy-api",
  };
}

export async function predictDiabetes(data) {
  const payload = buildDiabetesPayload(data);

  try {
    const { data: response } = await apiClient.post("/api/diabetes/predict", payload, {
      headers: { "Cache-Control": "no-cache" },
    });
    return normalizeDiabetesResponse(response);
  } catch (primaryError) {
    // Fallback to legacy backend route if user is running older server build.
    const legacyPayload = {
      glucose: Number(data.fastingGlucose ?? payload.glucose),
      bmi: payload.bmi,
      age: payload.age,
      blood_pressure: payload.bloodPressure,
      insulin: payload.insulin,
      skin_thickness: Number(data.skinThickness ?? 0),
      pregnancies: Number(data.pregnancies ?? 0),
      diabetes_pedigree_function: Number(data.diabetesPedigreeFunction ?? (Number(data.familyHistory) ? 0.8 : 0.2)),
      consent_given: true,
      demographics: {
        age_group: payload.age >= 45 ? "45-59" : "30-44",
        sex: "unknown",
        ethnicity: "unknown",
      },
    };

    try {
      const { data: legacyResponse } = await apiClient.post("/api/v1/predict/diabetes", legacyPayload, {
        headers: { "Cache-Control": "no-cache" },
      });
      return normalizeDiabetesResponse(legacyResponse);
    } catch (legacyError) {
      throw legacyError?.response ? legacyError : primaryError;
    }
  }
}

export async function healthCheck() {
  try {
    const { data } = await apiClient.get("/api/health", {
      headers: { "Cache-Control": "no-cache" },
    });
    return data;
  } catch (_error) {
    const { data } = await apiClient.get("/api/v1/health", {
      headers: { "Cache-Control": "no-cache" },
    });
    return {
      api: "online",
      diabetes_model: data?.models_loaded ? "connected" : "disconnected",
      ...data,
    };
  }
}

export async function downloadDiabetesReport(data) {
  const payload = buildDiabetesPayload(data);

  const response = await apiClient.post("/api/diabetes/report", payload, {
    responseType: "blob",
    headers: { "Cache-Control": "no-cache" },
  });

  return response.data;
}

export async function postPrediction(payload) {
  const data = await predictDiabetes({
    pregnancies: payload.Pregnancies,
    glucose: payload.Glucose,
    bloodPressure: payload.BloodPressure,
    skinThickness: payload.SkinThickness,
    insulin: payload.Insulin,
    bmi: payload.BMI,
    diabetesPedigreeFunction: payload.DiabetesPedigreeFunction,
    age: payload.Age,
  });

  const probability = Number(data?.risk_score ?? 0);
  const prediction = probability >= 0.5 ? 1 : 0;

  return {
    prediction,
    probability,
    probabilityPercent: probability * 100,
    risk: String(data?.category || "Low").trim(),
    confidence: Number(data?.confidence ?? 0),
  };
}

export async function postXrayAnalysis(file) {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("modality", "chest_xray");
  formData.append("consent_given", "true");
  formData.append("age_group", "unknown");
  formData.append("sex", "unknown");
  formData.append("ethnicity", "unknown");

  let data;
  try {
    const response = await apiClient.post("/api/v1/analyze/xray", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    data = response.data;
  } catch (error) {
    const detail = error?.response?.data?.detail;
    if (detail?.code === "scan_rejected") {
      const enhanced = new Error(detail?.message || "Scan rejected");
      enhanced.code = "scan_rejected";
      enhanced.validation = detail?.validation || null;
      enhanced.audit_id = detail?.audit_id || null;
      enhanced.image_hash = detail?.image_hash || null;
      throw enhanced;
    }
    throw error;
  }

  if (String(data?.status || "").toLowerCase() === "blocked") {
    const blocked = new Error(String(data?.message || "Analysis blocked"));
    blocked.code = "analysis_blocked";
    blocked.reason = String(data?.reason || "Invalid medical image");
    blocked.message = String(data?.message || "Please upload a valid chest X-ray");
    blocked.validation = data?.validation || null;
    blocked.trust_indicator = String(data?.trust_indicator || "🔴 Low Trust / Blocked");
    blocked.audit_id = data?.audit_id || null;
    blocked.image_hash = data?.image_hash || null;
    throw blocked;
  }

  const regions = Array.isArray(data?.regions)
    ? data.regions
        .map((item) => ({
          x: Number(item?.x ?? 0),
          y: Number(item?.y ?? 0),
          label: String(item?.label || "Region of interest"),
          confidence: Number(item?.confidence ?? 0),
          explanation: String(item?.explanation || ""),
        }))
        .filter((item) => Number.isFinite(item.x) && Number.isFinite(item.y))
    : [];

  const heatmapBase64 = String(data?.heatmap || "");
  const heatmap_url =
    String(data?.heatmap_url || "").trim() ||
    (heatmapBase64 ? `data:image/png;base64,${heatmapBase64}` : "");

  return {
    ...data,
    heatmap: heatmapBase64,
    heatmap_url,
    regions,
    explanation_method: String(data?.explanation_method || "saliency"),
    validation: data?.validation || null,
    trust_indicator:
      data?.validation?.trust_level === "high"
        ? "🟢 High Trust"
        : data?.validation?.trust_level === "moderate"
          ? "🟡 Moderate Trust"
          : "🔴 Low Trust / Blocked",
  };
}

export async function predictDiabetesUnified(data) {
  const payload = buildDiabetesPayload(data);
  const { data: response } = await apiClient.post("/api/predict/diabetes", payload, {
    headers: { "Cache-Control": "no-cache" },
  });
  return normalizeUnifiedPrediction(response);
}

export async function predictLungUnified(file) {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("modality", "chest_xray");
  const { data: response } = await apiClient.post("/api/predict/lung", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
      "Cache-Control": "no-cache",
    },
  });
  return normalizeUnifiedPrediction(response);
}

export async function fetchLLMExplanation(payload) {
  const { data } = await apiClient.post("/api/llm/explain", payload, {
    headers: { "Cache-Control": "no-cache" },
  });
  return {
    summary: String(data?.summary || "Plain-language summary unavailable."),
    limitations: String(data?.limitations || "Model limitations not provided."),
    advice: String(data?.advice || "Seek clinician review."),
  };
}

export default apiClient;
