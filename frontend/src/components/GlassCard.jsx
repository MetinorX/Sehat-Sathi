export default function GlassCard({ className = "", children }) {
  return (
    <div
      className={`rounded-xl border border-[rgba(0,0,0,0.05)] bg-[rgba(255,255,255,0.7)] shadow-sm backdrop-blur-[20px] ${className}`}
    >
      {children}
    </div>
  );
}
