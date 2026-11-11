import { BarChart3 } from "lucide-react";
import { useApi } from "@/shared/hooks/useApi";
import { Badge } from "@/shared/ui/Badge";
import { Empty, LinearProgress } from "@/shared/ui/Feedback";
import { QueryBoundary } from "@/shared/ui/QueryBoundary";
import { formatDate } from "@/shared/utils/formatters";
import { subjectApi } from "@/features/subject/subject.api";
import { confidenceOf } from "./confidence";
import { frequentApi, type ChapterStatItem } from "./frequent.api";

// Ngày ngắn, bỏ qua khi thiếu hoặc không đọc được
const shortDate = (iso: string | null | undefined) => (iso && !Number.isNaN(Date.parse(iso)) ? formatDate(iso) : null);

function NoStats() {
  return (
    <Empty icon={BarChart3} title="Chưa có thống kê cho môn này">
      Thống kê được cập nhật định kỳ, bạn quay lại sau nhé.
    </Empty>
  );
}

// "Chương nào hay ra thi?": thống kê tần suất theo chương. Trang chỉ biết mã môn nên lấy id số của môn trước.
export function ChapterStats({ code }: { code: string }) {
  const info = useApi(() => subjectApi.info(code), [code]);
  return (
    <QueryBoundary query={info} loadingLabel="Đang tải thống kê…">
      {(s) => (typeof s.id === "number" ? <ChapterList subjectId={s.id} /> : <NoStats />)}
    </QueryBoundary>
  );
}

function ChapterList({ subjectId }: { subjectId: number }) {
  const q = useApi(() => frequentApi.chapterStats(subjectId), [subjectId]);
  return (
    <QueryBoundary query={q} loadingLabel="Đang tải thống kê…">
      {(d) => {
        const items = Array.isArray(d.items) ? d.items : [];
        if (items.length === 0) return <NoStats />;
        const total = d.totalExams || items[0]?.totalExams || 0;
        const confidence = confidenceOf(items[0]?.confidence);
        return (
          <div className="space-y-4 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="md-body-medium text-on-surface-variant">
                Dựa trên <b className="text-on-surface">{total}</b> đề đã có trên hệ thống, chỉ để tham khảo.
              </p>
              {confidence && <Badge tone={confidence.tone}>{confidence.label}</Badge>}
            </div>
            {items[0]?.confidence === "low" && (
              <p className="md-body-small rounded-m3-md bg-surface-container-low px-4 py-3 text-on-surface-variant">
                Mới có ít đề nên thứ tự các chương có thể còn thay đổi.
              </p>
            )}
            <ol className="space-y-3">
              {items.map((it, i) => (
                <ChapterRow key={it.chapter || i} rank={i + 1} item={it} total={total} />
              ))}
            </ol>
          </div>
        );
      }}
    </QueryBoundary>
  );
}

function ChapterRow({ rank, item, total }: { rank: number; item: ChapterStatItem; total: number }) {
  const name = item.chapter?.trim() || "Chưa rõ chương";
  const seen = Math.max(0, item.examsWithChapter ?? 0);
  const of = item.totalExams || total;
  const last = shortDate(item.lastSeenAt);
  return (
    <li className="flex items-start gap-3 rounded-m3-md border border-outline-variant px-4 py-3">
      <span className="md-title-small shrink-0 text-on-surface">#{rank}</span>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="md-title-small break-words text-on-surface">{name}</p>
        <LinearProgress value={of > 0 ? seen / of : 0} label={`${name}: xuất hiện trong ${seen}/${of} đề`} />
        <p className="md-body-small text-on-surface-variant">
          Xuất hiện trong <b className="text-on-surface">{seen}/{of}</b> đề{last && ` · Lần gần nhất: ${last}`}
        </p>
      </div>
    </li>
  );
}
