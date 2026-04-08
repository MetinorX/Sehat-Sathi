export default function AyurvedaPanel({ result }) {
  return (
    <div className="bg-green-100 p-4 rounded shadow">
      <h2 className="text-xl font-bold mb-2">Ayurveda Insight</h2>

      <p>Prakriti: {result.prakriti}</p>
      <p>Recommendation: {result.recommendation}</p>
    </div>
  );
}