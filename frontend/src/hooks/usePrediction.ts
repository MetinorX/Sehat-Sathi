import { useCallback, useState } from "react";
import { predictDiabetesUnified, predictLungUnified } from "../services/api";

export type UnifiedPredictionTask = "diabetes" | "lung";

export type UnifiedPrediction = {
  task: UnifiedPredictionTask;
  validation: {
    status: "accepted" | "accepted_with_warning" | "blocked";
    score: number;
    checks: {
      modality: string;
      view: string;
      lung_detected: string;
      quality: string;
      sanity: string;
    };
    warnings: string[];
    trust: string;
  };
  prediction: {
    label: string;
    confidence: number;
    probabilities: Record<string, number>;
  };
  explainability: {
    type: string;
    features: Array<{ name: string; impact: number }>;
    heatmap_url: string;
    regions: Array<{ x: number; y: number; label: string; confidence: number; explanation: string }>;
  };
  report: {
    download_url: string;
  };
  insights?: string[];
  clinical_interpretation?: string;
  message?: string;
};

export function usePrediction() {
  const [prediction, setPrediction] = useState<UnifiedPrediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const runDiabetes = useCallback(async (payload: Record<string, unknown>) => {
    setLoading(true);
    setError("");
    try {
      const data = (await predictDiabetesUnified(payload)) as UnifiedPrediction;
      setPrediction(data);
      return data;
    } catch (err: any) {
      setError(String(err?.response?.data?.detail || err?.message || "Prediction failed"));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const runLung = useCallback(async (file: File) => {
    setLoading(true);
    setError("");
    try {
      const data = (await predictLungUnified(file)) as UnifiedPrediction;
      setPrediction(data);
      return data;
    } catch (err: any) {
      setError(String(err?.response?.data?.detail || err?.message || "Prediction failed"));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    prediction,
    loading,
    error,
    runDiabetes,
    runLung,
    setPrediction,
  };
}

export default usePrediction;

