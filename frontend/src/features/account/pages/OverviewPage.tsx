import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown, ClipboardCheck, NotebookPen, PenLine } from "lucide-react";
import { reviewApi } from "@/features/review/review.api";
import { ReadinessCard } from "@/features/review/ReadinessCard";
import { StudyStreakCard } from "@/features/review/StudyStreakCard";
import { userApi } from "@/features/account/api/user.api";
import { TransactionTable } from "@/features/account/components/TransactionTable";
import { useAuth } from "@/features/auth/AuthContext";
import { ResumeList } from "@/features/practice-session/ResumeList";
import { useOnLibraryChanged } from "@/features/exam-store/libraryEvents";
import { examLibraryApi } from "@/features/exam-store/exam-library.api";
import { historyApi } from "@/features/history/history.api";
import { PASS_SCORE } from "@/features/practice/config/scoring";
import { formatScore } from "@/features/practice/utils/format";
import { useApi } from "@/shared/hooks/useApi";
import { Badge } from "@/shared/ui/Badge";
import { buttonClass } from "@/shared/ui/Button";
import { Card, CardHeader } from "@/shared/ui/Card";
import { Empty } from "@/shared/ui/Feedback";
import { QueryBoundary } from "@/shared/ui/QueryBoundary";
import { formatDateTime } from "@/shared/utils/formatters";

const seeAll = (to: string, label = "Xem tất cả") => (
  <Link to={to} className="inline-flex items-center gap-1 text-sm font-medium text-on-surface underline-offset-4 hover:text-primary hover:underline">
    {label} <ArrowRight size={14} />
  </Link>
);

// Giao dịch gần đây: ít khi cần nên thu gọn, chỉ tải dữ liệu khi người dùng mở
function RecentTransactions() {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="md-state flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
        <span className="md-title-medium text-on-surface">Giao dịch gần đây</span>
        <ChevronDown size={18} className={`text-on-surface-variant transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <TransactionList />}
    </Card>
  );
}

function TransactionList() {
  const tx = useApi(() => userApi.transactions(1, 5), []);
  return (
    <div className="border-t border-outline-variant">
      <QueryBoundary query={tx}>{(d) => <TransactionTable items={d.items} />}</QueryBoundary>
      <div className="border-t border-outline-variant px-5 py-3 text-right">{seeAll("/account/transactions")}</div>
    </div>
  );
}

// Tổng quan: chỉ những gì cần cho hôm nay. Việc cần làm lên đầu, tiến độ gọn một dòng, bài làm gần đây; phần còn lại có menu bên trái.
export default function OverviewPage() {
  const { user } = useAuth();
  const library = useApi(() => examLibraryApi.list(1, 1), []);
  useOnLibraryChanged(library.reload);
  const attempts = useApi(() => historyApi.list(1, 20), []);
  const review = useApi(() => reviewApi.summary(), []);
  if (!user) return null;

  const recent = attempts.data?.items ?? [];
  const avg = recent.length ? recent.reduce((sum, a) => sum + a.score, 0) / recent.length : null;
  const facts = [
    library.data ? `${library.data.meta.total} đề trong kho` : null,
    attempts.data ? `${attempts.data.meta.total} lần làm bài` : null,
    avg !== null ? `điểm trung bình ${formatScore(avg)}` : null,
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-on-surface sm:text-3xl">
            Xin chào, <span className="marker">{user.fullName}</span>
          </h1>
          {facts.length > 0 && <p className="md-body-medium mt-1.5 text-on-surface-variant">{facts.join(" · ")}</p>}
        </div>
        <Link to="/" className={buttonClass({ variant: "primary" })}>
          <PenLine size={16} /> Vào luyện đề
        </Link>
      </header>

      {/* Việc cần làm: lượt đang dở và câu đến hạn ôn. Không có thì không chiếm chỗ */}
      <ResumeList limit={3} />
      {review.data && review.data.due > 0 && (
        <Link to="/account/review/practice" className="md-state md-motion flex items-center gap-3 rounded-m3-md border border-outline-variant bg-surface-container-low px-4 py-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
            <NotebookPen size={20} />
          </span>
          <p className="md-title-small min-w-0 flex-1 text-on-surface">Có {review.data.due} câu đến hạn ôn trong Sổ câu sai</p>
          <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary">
            Ôn ngay <ArrowRight size={14} />
          </span>
        </Link>
      )}

      {/* Tiến độ: chuỗi ngày học gọn một dòng; mức sẵn sàng chỉ hiện khi đã có bài thi thử */}
      <StudyStreakCard compact />
      <ReadinessCard />

      <Card>
        <CardHeader title="Bài làm gần đây" action={seeAll("/account/attempts")} />
        <QueryBoundary query={attempts}>
          {() =>
            recent.length === 0 ? (
              <Empty icon={ClipboardCheck} title="Chưa có bài làm nào">
                Lấy một đề ở trang chủ hoặc trong Kho đề rồi nộp bài, kết quả sẽ hiện ở đây.
                <div className="mt-4">
                  <Link to="/" className={buttonClass({ variant: "primary" })}>
                    <PenLine size={16} /> Lấy đề đầu tiên
                  </Link>
                </div>
              </Empty>
            ) : (
              <ul className="divide-y divide-outline-variant">
                {recent.slice(0, 5).map((a) => (
                  <li key={a.id}>
                    <Link to={`/account/attempts/${a.id}`} className="md-state flex items-center gap-3 px-5 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="md-title-small truncate text-on-surface">{a.exam.title}</div>
                        <div className="md-body-small mt-0.5 text-on-surface-variant">
                          {a.mode === "EXAM" ? "Thi" : "Luyện tập"} · {formatDateTime(a.createdAt)} · {a.correct}/{a.totalGraded}
                        </div>
                      </div>
                      <Badge tone={a.score >= PASS_SCORE ? "success" : "danger"}>{formatScore(a.score)}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )
          }
        </QueryBoundary>
      </Card>

      <RecentTransactions />
    </div>
  );
}
