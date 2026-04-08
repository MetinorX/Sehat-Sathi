import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { UploadCloud, FileImage, X } from "lucide-react";

export default function ScanUploader({ file, previewUrl, onFileChange, disabled = false }) {
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  function handleFileList(fileList) {
    const next = fileList?.[0] || null;
    onFileChange(next);
  }

  return (
    <section className="rounded-[28px] border border-[#D8D8DD] bg-white/60 p-5 backdrop-blur-xl">
      <h3 className="text-lg font-semibold text-[#1D1D1F]">Scan Uploader</h3>
      <p className="mt-1 text-sm text-[#6E6E73]">Drop your chest X-ray or CT scan here</p>

      <motion.label
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (disabled) return;
          handleFileList(e.dataTransfer.files);
        }}
        whileHover={{ y: -2 }}
        className={`mt-4 block cursor-pointer rounded-2xl border border-dashed p-5 transition ${
          dragActive ? "border-[#77AFFF] bg-[#EEF5FF]" : "border-[#CFD4DC] bg-white/70"
        } ${disabled ? "pointer-events-none opacity-70" : ""}`}
      >
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-[#E9F2FF] p-2 text-[#2F6FB1]">
            <UploadCloud className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-medium text-[#1D1D1F]">{file ? file.name : "Upload diagnostic image"}</p>
            <p className="text-xs text-[#6E6E73]">PNG, JPG, JPEG up to clinical upload limits</p>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileList(e.target.files)}
          disabled={disabled}
        />
      </motion.label>

      {file && previewUrl ? (
        <div className="mt-4 rounded-2xl border border-[#D8D8DD] bg-white/80 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="inline-flex items-center gap-2 text-xs font-medium text-[#4A4A53]">
              <FileImage className="h-3.5 w-3.5" />
              Preview
            </p>
            <button
              type="button"
              onClick={() => onFileChange(null)}
              className="rounded-lg p-1 text-[#6E6E73] transition hover:bg-[#F2F4F7]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <img src={previewUrl} alt="Scan preview" className="max-h-44 w-full rounded-xl object-cover" />
        </div>
      ) : null}
    </section>
  );
}

