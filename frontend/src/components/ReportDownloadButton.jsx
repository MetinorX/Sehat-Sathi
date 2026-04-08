import { useState } from "react";
import { downloadDiabetesReport } from "../services/api";

export default function ReportDownloadButton({ values, disabled = false, estimatedInputs = [] }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  async function onDownload() {
    setError("");
    setDownloading(true);
    try {
      const pdfBlob = await downloadDiabetesReport(values);
      const url = window.URL.createObjectURL(pdfBlob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "diabetes_clinical_report.pdf";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (_error) {
      setError("Failed to generate report. Please retry.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onDownload}
        disabled={disabled || downloading}
        className="w-full rounded-xl bg-[#1D1D1F] px-4 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-[#A0A0A8]"
      >
        {downloading ? "Preparing Clinical Report..." : "Download Clinical Report"}
      </button>
      {error ? <p className="text-xs text-[#B13737]">{error}</p> : null}
      {Array.isArray(estimatedInputs) && estimatedInputs.length > 0 ? (
        <p className="rounded-lg border border-[#F4D7A6] bg-[#FFF8EB] px-2.5 py-2 text-xs text-[#8A5A05]">
          Estimated Inputs included in report: {estimatedInputs.map((item) => item.feature).join(", ")}.
        </p>
      ) : null}
    </div>
  );
}
