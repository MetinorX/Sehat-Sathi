import { useCallback, useState } from "react";
import { predictDiabetes } from "../services/api";

export default function usePrediction() {
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const predict = useCallback(async (payload) => {
    setIsLoading(true);
    setError("");

    try {
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
      setResult(data);
      return data;
    } catch (err) {
      const apiDetail = err?.response?.data?.detail;
      const isValidationError = err?.message === "Invalid response from AI system";
      const isJsonError = err instanceof SyntaxError;

      let message = "Unable to connect to prediction service. Please ensure backend is running on http://127.0.0.1:8000.";
      if (isValidationError || isJsonError) {
        message = "Invalid response from AI system";
      } else if (typeof apiDetail === "string" && apiDetail.trim()) {
        message = apiDetail;
      }

      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    result,
    isLoading,
    error,
    predict,
  };
}