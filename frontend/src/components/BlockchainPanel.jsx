export default function BlockchainPanel({ result }) {
  return (
    <div className="bg-purple-100 p-4 rounded shadow">
      <h2 className="text-xl font-bold mb-2">Blockchain Verification</h2>

      <p>Verified: {result.blockchain_verified ? "Yes" : "No"}</p>
      <p className="break-all">Model Hash: {result.model_hash}</p>
    </div>
  );
}