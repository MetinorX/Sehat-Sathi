import { useCallback, useState } from "react";
import { fetchLLMExplanation } from "../services/api";

export type LLMExplanation = {
  summary: string;
  limitations: string;
  advice: string;
};

export function useLLMExplanation() {
  const [explanation, setExplanation] = useState<LLMExplanation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const requestExplanation = useCallback(async (payload: Record<string, unknown>) => {
    setLoading(true);
    setError("");
    try {
      const data = (await fetchLLMExplanation(payload)) as LLMExplanation;
      setExplanation(data);
      return data;
    } catch (err: any) {
      setError(String(err?.response?.data?.detail || err?.message || "LLM explanation unavailable"));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setExplanation(null);
    setError("");
    setLoading(false);
  }, []);

  return {
    explanation,
    loading,
    error,
    requestExplanation,
    reset,
  };
}

export default useLLMExplanation;

