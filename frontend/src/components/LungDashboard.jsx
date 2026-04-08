import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Cpu, ScanLine, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import LungVisualizer from "./LungVisualizer";
import ScanUploader from "./ScanUploader";
import LungResultPanel from "./LungResultPanel";
import LungExplainabilityPanel from "./LungExplainabilityPanel";
import LungValidationPanel from "./LungValidationPanel";
import ComparisonPanel from "./ComparisonPanel";
import useLLMExplanation from "../hooks/useLLMExplanation";
import { predictLungUnified } from "../services/api";

function safeResolution(width, height) {
  if (!width || !height) return "--";
  return `${width} × ${height}`;
}

export default function LungDashboard() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [meta, setMeta] = useState({ name: "--", resolution: "--", type: "--" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [scanState, setScanState] = useState("idle");
  const [overlayMode, setOverlayMode] = useState("overlay");
  const [heatmapIntensity, setHeatmapIntensity] = useState(40);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [scanRejected, setScanRejected] = useState(false);
  const [blockedInfo, setBlockedInfo] = useState(null);
  const [comparisonPrediction, setComparisonPrediction] = useState(null);
  const { explanation: llmExplanation, loading: llmLoading, requestExplanation, reset: resetLLM } = useLLMExplanation();

  const aiStatus = loading ? "Processing" : file ? "Connected" : "Idle";

  const contextStatus = useMemo(() => {
    if (loading) return "Analyzing";
    if (result) return "Complete";
    if (file) return "Uploaded";
    return "No scan";
  }, [loading, result, file]);

  function onFileChange(nextFile) {
    setError("");
    setResult(null);
    setSelectedRegion(null);
    setValidationResult(null);
    setScanRejected(false);
    setBlockedInfo(null);
    setComparisonPrediction(null);
    resetLLM();
    setScanState(nextFile ? "uploaded" : "idle");
    setFile(nextFile);

    if (!nextFile) {
      setPreviewUrl("");
      setMeta({ name: "--", resolution: "--", type: "--" });
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const objectUrl = URL.createObjectURL(nextFile);
    setPreviewUrl(objectUrl);

    const img = new Image();
    img.onload = () => {
      setMeta({
        name: nextFile.name,
        resolution: safeResolution(img.naturalWidth, img.naturalHeight),
        type: nextFile.type || "image/*",
      });
    };
    img.src = objectUrl;
  }

  async function onAnalyze() {
    if (!file) {
      setError("Please upload an X-ray or CT image first.");
      return;
    }

    setLoading(true);
    setScanState("analyzing");
    setError("");
    setScanRejected(false);
    setBlockedInfo(null);
    try {
      const unified = await predictLungUnified(file);
      setComparisonPrediction(unified);
      if (unified?.validation?.status === "blocked") {
        setValidationResult(unified?.validation || null);
        setBlockedInfo({
          reason: "Invalid medical image",
          message: unified?.message || "Please upload a valid chest X-ray",
          trust: unified?.validation?.trust || "🔴 Low Trust / Blocked",
        });
        setScanRejected(true);
        setResult(null);
        setSelectedRegion(null);
      } else {
        const regions = Array.isArray(unified?.explainability?.regions) ? unified.explainability.regions : [];
        const normalized = {
          condition: unified?.prediction?.label || "Unknown",
          confidence: Number(unified?.prediction?.confidence ?? 0),
          validation: {
            score: Number(unified?.validation?.score ?? 0),
            status: unified?.validation?.status,
            checks: unified?.validation?.checks,
            warnings: unified?.validation?.warnings || [],
          },
          trust_indicator: unified?.validation?.trust || "",
          regions,
          heatmap_url: unified?.explainability?.heatmap_url || "",
          explanation_method: unified?.explainability?.type || "gradcam",
          explanation: regions[0]?.explanation || "Model highlighted pulmonary attention regions.",
          report: "Use download URL from unified report endpoint.",
        };
        setResult(normalized);
        setValidationResult(normalized.validation);
        setSelectedRegion(regions.length ? regions[0] : null);
        setScanState("complete");
        requestExplanation({
          task: "lung",
          prediction: unified?.prediction || {},
          explainability: {
            ...unified?.explainability,
            regions,
          },
        }).catch(() => null);
      }
    } catch (err) {
      if (err?.code === "analysis_blocked") {
        setValidationResult(err?.validation || null);
        setBlockedInfo({
          reason: err?.reason || "Invalid medical image",
          message: err?.message || "Please upload a valid chest X-ray",
          trust: err?.trust_indicator || "🔴 Low Trust / Blocked",
        });
        setScanRejected(true);
        setResult(null);
        setSelectedRegion(null);
      } else if (err?.code === "scan_rejected") {
        setValidationResult(err?.validation || null);
        setScanRejected(true);
      }
      setError(err?.response?.data?.detail?.message || err?.message || "Unable to analyze scan.");
      setScanState("uploaded");
    } finally {
      setLoading(false);
    }
  }

  function onReset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl("");
    setMeta({ name: "--", resolution: "--", type: "--" });
    setResult(null);
    setSelectedRegion(null);
    setValidationResult(null);
    setScanRejected(false);
    setBlockedInfo(null);
    setComparisonPrediction(null);
    resetLLM();
    setError("");
    setScanState("idle");
  }

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <main className="min-h-screen bg-[#F5F5F7] px-4 py-7 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1650px] space-y-5">
        <header className="rounded-2xl border border-[#D9D9DE] bg-white/60 px-5 py-4 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6E6E73]">AI Radiology Workstation</p>
              <h1 className="mt-1 text-2xl font-semibold text-[#1D1D1F]">Lung X-Ray Analysis Dashboard</h1>
            </div>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="inline-flex items-center gap-2 rounded-lg border border-[#D0D0D7] bg-white px-3 py-2 text-sm font-medium text-[#4A4A53] hover:bg-[#F2F2F4]"
            >
              <ArrowLeft className="h-4 w-4" />
              Hub
            </button>
          </div>
        </header>

        <section className="grid gap-5 xl:grid-cols-[300px_1fr_420px]">
          <aside className="space-y-3">
            <div className="rounded-2xl border border-[#D8D8DD] bg-white/60 p-4 backdrop-blur-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6E6E73]">Scan Status</p>
              <p className="mt-2 text-sm font-semibold text-[#1D1D1F]">{contextStatus}</p>
            </div>

            <div className="rounded-2xl border border-[#D8D8DD] bg-white/60 p-4 backdrop-blur-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6E6E73]">Preprocessing</p>
              <ul className="mt-2 space-y-1.5 text-sm text-[#4A4A53]">
                <li className="inline-flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-[#2F6FB1]" />Normalization</li>
                <li className="inline-flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-[#2F6FB1]" />Denoising</li>
                <li className="inline-flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-[#2F6FB1]" />Resizing</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-[#D8D8DD] bg-white/60 p-4 backdrop-blur-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6E6E73]">Image Metadata</p>
              <p className="mt-2 text-sm text-[#4A4A53]">File: <span className="font-medium text-[#1D1D1F]">{meta.name}</span></p>
              <p className="text-sm text-[#4A4A53]">Resolution: <span className="font-medium text-[#1D1D1F]">{meta.resolution}</span></p>
              <p className="text-sm text-[#4A4A53]">Type: <span className="font-medium text-[#1D1D1F]">{meta.type}</span></p>
            </div>

            <div className="rounded-2xl border border-[#D8D8DD] bg-white/60 p-4 backdrop-blur-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6E6E73]">AI Status Indicator</p>
              <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[#1D1D1F]">
                <Cpu className="h-4 w-4 text-[#70707A]" />
                {aiStatus}
              </p>
            </div>
            <LungValidationPanel validation={validationResult} loading={loading} rejected={scanRejected} />
          </aside>

          <div className="space-y-4">
            <div className="rounded-2xl border border-[#D8D8DD] bg-white/60 p-3 backdrop-blur-xl">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex rounded-xl border border-[#D6D6DC] bg-white/80 p-1">
                  {["original", "heatmap", "overlay"].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setOverlayMode(mode)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] ${
                        overlayMode === mode ? "bg-[#1D1D1F] text-white" : "text-[#5A5A64] hover:bg-[#F0F0F4]"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-2 text-xs text-[#6E6E73]">
                  Intensity
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={heatmapIntensity}
                    onChange={(e) => setHeatmapIntensity(Number(e.target.value))}
                    className="w-28 accent-[#2F6FB1]"
                  />
                  <span className="w-8 text-right">{heatmapIntensity}%</span>
                </label>
              </div>
            </div>

            {blockedInfo ? (
              <div className="rounded-[28px] border border-[#F1C3C3] bg-[#FDF4F4] p-6">
                <h3 className="text-xl font-semibold text-[#B13737]">🚫 Analysis Blocked</h3>
                <p className="mt-2 text-sm text-[#7A2E2E]">Uploaded image is not a valid chest X-ray</p>
                <p className="mt-1 text-sm text-[#7A2E2E]">Reason: {blockedInfo.reason}</p>
                <p className="mt-1 text-sm text-[#7A2E2E]">{blockedInfo.message}</p>
                <p className="mt-2 text-sm font-semibold text-[#7A2E2E]">{blockedInfo.trust}</p>
                <button
                  type="button"
                  onClick={onReset}
                  className="mt-4 rounded-xl bg-[#1D1D1F] px-4 py-2 text-sm font-semibold text-white hover:bg-black"
                >
                  Upload Valid Scan
                </button>
              </div>
            ) : (
              <>
                <LungVisualizer
                  analysisState={scanState}
                  hasResult={Boolean(result)}
                  explainability={result?.regions || []}
                  heatmapUrl={result?.heatmap_url || ""}
                  overlayMode={overlayMode}
                  intensity={heatmapIntensity}
                  baseImageUrl={previewUrl || undefined}
                  selectedRegion={selectedRegion}
                  onSelectRegion={setSelectedRegion}
                />
                <LungExplainabilityPanel
                  regions={result?.regions || []}
                  selectedRegion={selectedRegion}
                  method={result?.explanation_method || "saliency"}
                />
              </>
            )}
            <ScanUploader file={file} previewUrl={previewUrl} onFileChange={onFileChange} disabled={loading} />
            <div className="rounded-2xl border border-[#D8D8DD] bg-white/60 p-4 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-sm text-[#6E6E73]">
                <ScanLine className="h-4 w-4 text-[#2F6FB1]" />
                {loading ? "Analyzing pulmonary regions..." : "Ready for AI inference"}
              </div>
              <button
                type="button"
                onClick={onAnalyze}
                disabled={loading || !file}
                className="mt-3 w-full rounded-xl bg-[#1D1D1F] px-4 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-[#A0A0A8]"
              >
                {loading ? "Running Analysis..." : "Run Analysis"}
              </button>
              {error ? (
                <p className={`mt-2 text-sm ${scanRejected ? "text-[#B13737]" : "text-[#8A5A05]"}`}>
                  {error}
                </p>
              ) : null}
            </div>
          </div>

          <LungResultPanel result={result} loading={loading} onReset={onReset} blockedInfo={blockedInfo} />
        </section>
        <ComparisonPanel
          predictionData={comparisonPrediction}
          llmExplanation={llmExplanation}
          llmLoading={llmLoading}
          predictionLoading={loading}
          sourceImageUrl={previewUrl}
        />
      </div>
    </main>
  );
}

