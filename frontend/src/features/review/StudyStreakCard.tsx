import { Check, Flame } from "lucide-react";
import { useToast } from "@/shared/context/ToastContext";
import { errorMessage } from "@/shared/api/errors";
import { useApi } from "@/shared/hooks/useApi";
import { Card } from "@/shared/ui/Card";
import { Segmented } from "@/shared/ui/Segmented";
import { studyApi } from "./review.api";

const DAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

// Chuỗi ngày học + tiến độ tuần + mục tiêu. Một ngày tính là có học khi nộp một bài (làm trên nửa số câu) hoặc ôn xong vài câu trong sổ câu sai.
export function StudyStreakCard() {
  const toast = useToast();
  const stats = useApi(() => studyApi.stats(), []);
  const s = stats.data;
  if (!s) return null; // đang tải hoặc lỗi: bỏ qua, đây là phần phụ

  const setGoal = (days: number) =>
    studyApi
      .setGoal(days)
      .then(() => stats.reload())
      .catch((err: unknown) => toast.error(errorMessage(err, "Chưa lưu được mục tiêu")));

  const message = s.goalMet
    ? "Đã đạt mục tiêu tuần này. Giữ nhịp nhé!"
    : s.studiedToday
      ? `Hôm nay đã học xong. Còn ${s.goal - s.weekDone} ngày nữa là đạt mục tiêu tuần.`
      : s.streak > 0
        ? `Học hôm nay để giữ chuỗi ${s.streak} ngày. Chỉ cần nộp một bài hoặc ôn ${s.minReviews} câu.`
        : `Nộp một bài hoặc ôn ${s.minReviews} câu trong sổ để bắt đầu chuỗi ngày học.`;

  return (
    <Card>
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${s.streak > 0 ? "bg-gradient-to-b from-[#ffd75e] to-[#f0a800] text-[#3a2600]" : "bg-surface-container-high text-on-surface-variant"}`}>
            <Flame size={28} strokeWidth={2.2} />
          </span>
          <div className="min-w-0">
            <div className="md-headline-small tabular-nums text-on-surface">
              {s.streak} <span className="md-title-medium font-normal text-on-surface-variant">ngày liên tiếp</span>
            </div>
            <p className="md-body-medium mt-0.5 text-on-surface-variant">{message}</p>
          </div>
        </div>

        <div className="shrink-0">
          <ol className="flex items-center gap-1.5" aria-label={`Tuần này đã học ${s.weekDone} trên ${s.goal} ngày mục tiêu`}>
            {DAYS.map((d, i) => {
              const done = s.week[i];
              const today = i === s.todayIndex;
              return (
                <li key={d} className="flex flex-col items-center gap-1">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs ${
                      done ? "border-transparent bg-primary text-on-primary" : today ? "border-primary text-primary" : "border-outline-variant text-on-surface-variant"
                    }`}
                  >
                    {done ? <Check size={15} strokeWidth={3} /> : null}
                  </span>
                  <span className={`md-label-small ${today ? "font-semibold text-on-surface" : "text-on-surface-variant"}`}>{d}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant px-5 py-3">
        <p className="md-body-medium text-on-surface-variant">
          Mục tiêu tuần: <b className="text-on-surface">{s.weekDone}</b> / {s.goal} ngày
        </p>
        <Segmented label="Mục tiêu số ngày học mỗi tuần" value={String(s.goal)} options={[{ value: "3", label: "3 ngày" }, { value: "5", label: "5 ngày" }, { value: "7", label: "7 ngày" }]} onChange={(v) => void setGoal(Number(v))} />
      </div>
    </Card>
  );
}
