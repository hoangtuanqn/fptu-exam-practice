import { Link } from "react-router-dom";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Gauge } from "lucide-react";
import { useApi } from "@/shared/hooks/useApi";
import { Badge, type Tone } from "@/shared/ui/Badge";
import { Card, CardHeader } from "@/shared/ui/Card";
import { studyApi, type SubjectReadiness } from "./review.api";

const LEVELS: Record<SubjectReadiness["level"], { label: string; tone: Tone }> = {
  insufficient: { label: "Chưa đủ dữ liệu", tone: "neutral" },
  "needs-work": { label: "Cần ôn thêm", tone: "danger" },
  fair: { label: "Khá ổn", tone: "warning" },
  ready: { label: "Sẵn sàng", tone: "success" },
};

const TREND = {
  up: { Icon: ArrowUpRight, text: "đang tăng", cls: "text-success" },
  down: { Icon: ArrowDownRight, text: "đang giảm", cls: "text-error" },
  flat: { Icon: ArrowRight, text: "ổn định", cls: "text-on-surface-variant" },
} as const;

// Mức sẵn sàng theo môn, tính từ các bài thi thử gần nhất. Cố ý không có phần trăm "khả năng qua môn".
export function ReadinessCard() {
  const { data } = useApi(() => studyApi.readiness(), []);
  if (!data || data.length === 0) return null; // chưa có bài thi thử nào: bỏ qua

  return (
    <Card>
      <CardHeader title="Mức sẵn sàng theo môn" />
      <ul className="divide-y divide-outline-variant">
        {data.map((s) => {
          const lv = LEVELS[s.level];
          const trend = s.trend ? TREND[s.trend] : null;
          return (
            <li key={s.code} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant">
                <Gauge size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="md-title-small text-on-surface">{s.code}</span>
                  <Badge tone={lv.tone}>{lv.label}</Badge>
                </div>
                <p className="md-body-small mt-0.5 text-on-surface-variant">
                  {s.level === "insufficient" ? (
                    <>Làm thêm {s.needed} bài ở chế độ Thi thử để đánh giá.</>
                  ) : (
                    <>
                      Điểm trung bình <b className="text-on-surface">{s.average}</b>/10 qua {s.attempts} bài thi thử gần nhất
                      {s.weakTopics > 0 ? `, còn ${s.weakTopics} chủ đề yếu` : ""}
                      {trend && (
                        <span className={`ml-2 inline-flex items-center gap-0.5 ${trend.cls}`}>
                          <trend.Icon size={14} /> {trend.text}
                        </span>
                      )}
                    </>
                  )}
                </p>
              </div>
              {s.weakTopics > 0 && (
                <Link to="/account/review" className="md-label-large shrink-0 text-primary hover:underline">
                  Xem chủ đề yếu
                </Link>
              )}
            </li>
          );
        })}
      </ul>
      <p className="md-body-small border-t border-outline-variant px-5 py-3 text-on-surface-variant">Chỉ mang tính tham khảo, dựa trên điểm các bài thi thử của bạn trên hệ thống, không phải dự đoán điểm thi thật.</p>
    </Card>
  );
}
