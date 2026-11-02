interface Props {
  value: number; // 0–1
  tone: "success" | "danger" | "neutral";
  children: React.ReactNode; // nội dung ở giữa vòng
}

const STROKE = { success: "#059669", danger: "#e11d48", neutral: "#16223b" };
const R = 52;
const CIRCUMFERENCE = 2 * Math.PI * R;

// Vòng tròn tiến độ dùng cho điểm số
export function ScoreRing({ value, tone, children }: Props) {
  const clamped = Math.min(1, Math.max(0, value));

  return (
    <div className="relative mx-auto h-36 w-36">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={R} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx="60"
          cy="60"
          r={R}
          fill="none"
          stroke={STROKE[tone]}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - clamped)}
          style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}
