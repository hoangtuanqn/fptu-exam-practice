// Làm tròn tối đa 2 chữ số thập phân: 7.5, 8.33, 10
export function formatScore(n: number): string {
  return String(Number(n.toFixed(2)));
}

// 75 -> "01:15", 3725 -> "1:02:05"
export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
