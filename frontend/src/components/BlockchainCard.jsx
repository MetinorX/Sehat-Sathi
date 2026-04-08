import { motion } from "framer-motion";
import { useState } from "react";
import { BadgeCheck, Copy, ShieldCheck, CheckCircle2, Lock } from "lucide-react";

export default function BlockchainCard({ result }) {
  const isVerified = Boolean(result.blockchain_verified);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.model_hash || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (_error) {
      setCopied(false);
    }
  };

  return (
    <motion.article
      className="relative overflow-hidden rounded-2xl border border-white/40 bg-gradient-to-br from-white/70 to-white/50 backdrop-blur-xl"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.1 }}
      whileHover={{ scale: 1.02, boxShadow: "0 20px 60px rgba(139, 92, 246, 0.15)" }}
    >
      {/* Animated gradient background */}
      <motion.div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      />

      <div className="relative space-y-6 p-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-widest text-slate-500 font-medium">
              Blockchain Integrity
            </p>
            <h3 className="mt-2 font-display text-2xl font-bold text-slate-900">
              Cryptographic Verification
            </h3>
          </div>

          <motion.div
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
              isVerified
                ? "bg-gradient-to-r from-violet-100 to-purple-100 text-violet-700 border border-violet-200"
                : "bg-gradient-to-r from-slate-100 to-slate-50 text-slate-600 border border-slate-200"
            }`}
            animate={
              isVerified
                ? {
                    boxShadow: [
                      "0 0 0px rgba(139,92,246,0)",
                      "0 0 20px rgba(139,92,246,0.4)",
                      "0 0 0px rgba(139,92,246,0)",
                    ],
                  }
                : {}
            }
            transition={{ duration: 2, repeat: Infinity }}
          >
            {isVerified ? (
              <>
                <BadgeCheck className="h-4 w-4" />
                Verified on Blockchain
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                Pending Verification
              </>
            )}
          </motion.div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* Model Hash */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest text-slate-600 font-medium flex items-center gap-2">
                <Lock className="h-3.5 w-3.5 text-violet-600" />
                Model Hash
              </p>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-white px-2.5 py-1.5 text-xs font-medium text-violet-700 transition-all hover:bg-violet-50 hover:border-violet-300"
              >
                <Copy className="h-3.5 w-3.5" />
                {copied ? "Copied!" : "Copy Hash"}
              </button>
            </div>

            <div className="relative overflow-hidden rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50/80 to-white/80 p-4 font-mono text-xs leading-relaxed text-violet-900 break-all shadow-inner">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
              <code className="relative">{result.model_hash || "No model hash available."}</code>
            </div>
          </motion.div>

          {/* Why blockchain? */}
          <motion.div
            className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <p className="text-xs uppercase tracking-widest text-slate-600 font-medium mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Why Blockchain?
            </p>
            <p className="text-sm leading-relaxed text-slate-700">
              This prediction is generated by the clinical AI model and cryptographically recorded and validated using blockchain technology, ensuring predictive integrity, auditability, and clinical governance.
            </p>
          </motion.div>

          {/* Security features */}
          <motion.div
            className="grid gap-3 sm:grid-cols-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold text-slate-600">Immutable</p>
              <p className="mt-1 text-xs text-slate-500">
                Transaction cannot be altered or deleted
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold text-slate-600">Transparent</p>
              <p className="mt-1 text-xs text-slate-500">
                All parties can verify the model updates
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold text-slate-600">Decentralized</p>
              <p className="mt-1 text-xs text-slate-500">
                No single point of failure or control
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold text-slate-600">Auditable</p>
              <p className="mt-1 text-xs text-slate-500">
                Full history available for compliance
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.article>
  );
}