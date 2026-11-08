import { Link } from "react-router-dom";
import { Crown, Lock, Play, Target } from "lucide-react";
import { useApi } from "@/shared/hooks/useApi";
import { buttonClass } from "@/shared/ui/Button";
import { Card, CardHeader } from "@/shared/ui/Card";
import { studyApi, type TopicStat } from "./review.api";

const pct = (x: number) => `${Math.round(x * 100)}%`;

// Màu thanh theo tỷ lệ đúng: dưới 50% yếu, dưới 75% tạm, còn lại tốt. Kèm chữ nên không chỉ dựa vào màu.
const tone = (rate: number) => (rate < 0.5 ? { bar: "bg-error", label: "Yếu" } : rate < 0.75 ? { bar: "bg-warning", label: "Tạm" } : { bar: "bg-success", label: "Tốt" });

function Row({ subject, t }: { subject: string; t: TopicStat }) {
  const c = tone(t.rate);
  return (
    <li className="px-5 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="md-title-small min-w-0 truncate text-on-surface">{t.topic}</span>
        <span className="md-body-small shrink-0 tabular-nums text-on-surface-variant">
          {t.enough ? (
            <>
              <b className="text-on-surface">{pct(t.rate)}</b> đúng · {t.correct}/{t.answered} câu · {c.label}
            </>
          ) : (
            <>Mới {t.answered} câu, chưa đủ để đánh giá</>
          )}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-container-highest" aria-hidden>
          <div className={`h-full rounded-full ${t.enough ? c.bar : "bg-outline"}`} style={{ width: `${Math.max(3, t.rate * 100)}%` }} />
        </div>
        {t.enough && t.rate < 0.75 && (
          <Link to={`/account/review/practice?subject=${encodeURIComponent(subject)}&topic=${encodeURIComponent(t.topic)}`} className={buttonClass({ size: "sm", variant: "text" })} title="Ôn các câu bạn từng sai ở chủ đề này">
            <Play size={14} /> Luyện
          </Link>
        )}
      </div>
    </li>
  );
}

// Điểm mạnh/yếu theo chủ đề. Gói thường: chủ đề yếu nhất + lời mời nâng cấp. Pro: đầy đủ theo từng môn, có nút luyện đúng phần yếu.
export function TopicReport() {
  const { data } = useApi(() => studyApi.topics(), []);
  if (!data) return null;
  if (!data.weakest && data.totalTopics === 0) return null; // chưa có bài nào gắn nhãn chủ đề: bỏ qua, không hiện khối rỗng

  return (
    <Card>
      <CardHeader title="Điểm mạnh và yếu theo chủ đề" description="Tính từ bài làm gần nhất của mỗi đề" />
      {data.locked ? (
        <div className="space-y-4 p-5">
          {data.weakest ? (
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-error-container text-on-error-container">
                <Target size={20} />
              </span>
              <div className="min-w-0">
                <p className="md-label-medium uppercase tracking-wider text-on-surface-variant">Chủ đề cần ôn nhất · {data.weakest.subject}</p>
                <p className="md-title-medium text-on-surface">{data.weakest.topic}</p>
                <p className="md-body-medium text-on-surface-variant">
                  Bạn đúng {pct(data.weakest.rate)} ({data.weakest.correct}/{data.weakest.answered} câu).
                </p>
              </div>
            </div>
          ) : (
            <p className="md-body-medium text-on-surface-variant">Làm thêm vài đề, mỗi chủ đề cần ít nhất {data.minSample} câu để đánh giá.</p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-m3-md bg-surface-container-low px-4 py-3">
            <p className="md-body-medium flex items-center gap-2 text-on-surface">
              <Lock size={16} className="shrink-0 text-on-surface-variant" />
              Pro xem được cả {data.totalTopics} chủ đề và luyện đúng phần yếu.
            </p>
            <Link to="/pro" className={buttonClass({ size: "sm" })}>
              <Crown size={15} className="text-[#f0a800]" /> Xem gói Pro
            </Link>
          </div>
        </div>
      ) : data.subjects.length === 0 ? (
        <p className="md-body-medium px-5 py-6 text-on-surface-variant">Làm bài ở các đề đã gắn chủ đề để xem báo cáo ở đây.</p>
      ) : (
        <div className="divide-y divide-outline-variant">
          {data.subjects.map((s) => (
            <section key={s.code}>
              <h3 className="md-label-large bg-surface-container-low px-5 py-2 text-on-surface-variant">{s.code}</h3>
              <ul className="divide-y divide-outline-variant">
                {s.topics.map((t) => (
                  <Row key={t.topic} subject={s.code} t={t} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Card>
  );
}
