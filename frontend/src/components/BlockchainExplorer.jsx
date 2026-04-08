import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Clipboard, Copy, Database } from "lucide-react";

function makeHash(seed, index) {
  const value = `${seed || "model"}${index}`.replace(/\s+/g, "");
  return `0x${value.padEnd(64, "a").slice(0, 64)}`;
}

export default function BlockchainExplorer({ result }) {
  const [copiedHash, setCopiedHash] = useState("");

  const transactions = useMemo(() => {
    const baseHash = result.model_hash || "madhumeha";
    return [
      { client: "Client_1", txHash: makeHash(baseHash, 1), status: "Confirmed" },
      { client: "Client_2", txHash: makeHash(baseHash, 2), status: "Confirmed" },
      { client: "Client_3", txHash: makeHash(baseHash, 3), status: "Confirmed" },
      { client: "Client_4", txHash: makeHash(baseHash, 4), status: "Confirmed" },
      { client: "Client_5", txHash: makeHash(baseHash, 5), status: "Confirmed" },
    ];
  }, [result.model_hash]);

  const copyHash = async (hash) => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopiedHash(hash);
      setTimeout(() => setCopiedHash(""), 1500);
    } catch (_error) {
      setCopiedHash("copy-failed");
      setTimeout(() => setCopiedHash(""), 1500);
    }
  };

  return (
    <motion.article
      className="glass-panel rounded-2xl p-6"
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45 }}
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-display text-xl font-semibold text-slate-900">Blockchain Explorer</h3>
          <p className="text-sm text-slate-500">Recent transactions</p>
        </div>
        <Database className="h-5 w-5 text-violet-600" />
      </div>

      <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
        {transactions.map((tx, index) => (
          <motion.div
            key={tx.txHash}
            className="rounded-xl border border-slate-200 bg-white/85 p-3 transition hover:border-violet-200 hover:shadow-sm"
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.05 }}
          >
            <div className="mb-1 flex items-center justify-between text-sm">
              <p className="font-medium text-slate-700">{tx.client}</p>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                {tx.status}
              </span>
            </div>

            <p className="font-mono text-xs text-slate-500 break-all">{tx.txHash}</p>

            <button
              type="button"
              onClick={() => copyHash(tx.txHash)}
              className="mt-2 inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 transition hover:border-violet-200 hover:text-violet-700"
            >
              {copiedHash === tx.txHash ? <Clipboard className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedHash === tx.txHash ? "Copied" : "Copy"}
            </button>
          </motion.div>
        ))}
      </div>
    </motion.article>
  );
}