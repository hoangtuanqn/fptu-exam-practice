import { Link } from "react-router-dom";
import { ArrowRight, ClipboardCheck, Library, PenLine, Plus } from "lucide-react";
import { userApi } from "@/features/account/api/user.api";
import { TransactionTable } from "@/features/account/components/TransactionTable";
import { useAuth } from "@/features/auth/AuthContext";
import { ResumeList } from "@/features/practice-session/ResumeList";
import { useOnLibraryChanged } from "@/features/exam-library/libraryEvents";
import { examLibraryApi } from "@/features/exam-library/exam-library.api";
import { historyApi } from "@/features/history/history.api";
import { PASS_SCORE } from "@/features/practice/config/scoring";
import { formatScore } from "@/features/practice/utils/format";
import { useApi } from "@/shared/hooks/useApi";
import { Badge } from "@/shared/ui/Badge";
import { buttonClass } from "@/shared/ui/Button";
import { Card, CardHeader, StatCard, StatGrid } from "@/shared/ui/Card";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import { formatDateTime, formatCredit } from "@/shared/utils/formatters";

const seeAll = (to: string, label = "Xem tất cả") => (
  <Link to={to} className="inline-flex items-center gap-1 text-sm font-medium text-slate-900 underline-offset-4 hover:text-brand-700 hover:underline">
    {label} <ArrowRight size={14} />
  </Link>
);

export default function OverviewPage() {
  const { user } = useAuth();
  const library = useApi(() => examLibraryApi.list(1, 5), []);
  useOnLibraryChanged(library.reload);
  const attempts = useApi(() => historyApi.list(1, 20), []);
  const recentTx = useApi(() => userApi.transactions(1, 5), []);
  if (!user) return null;

  const recent = attempts.data?.items ?? [];
  const avg = recent.length ? recent.reduce((sum, a) => sum + a.score, 0) / recent.length : null;
  const best = recent.length ? Math.max(...recent.map((a) => a.score)) : null;

  return (
    <div className="space-y-8">
      {/* Đầu trang: lời chào canh trái, nút ở bên phải, kẻ một đường mảnh bên dưới */}
      <header className="flex flex-col gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Tổng quan tài khoản</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">
            Xin chào, <span className="marker">{user.fullName}</span>
          </h1>
          <p className="mt-2 text-sm text-slate-500">Tiếp tục luyện đề để chạm tới điểm 10.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/" className={buttonClass({ variant: "primary" })}>
            <PenLine size={16} /> Vào luyện đề
          </Link>
          <Link to="/account/deposit" className={buttonClass()}>
            <Plus size={16} /> Nạp credit
          </Link>
        </div>
      </header>

      {/* Các lượt đang làm dở: hiện ngay đầu trang để vào làm tiếp (không có thì không chiếm chỗ) */}
      <ResumeList limit={5} />

      <StatGrid className="grid-cols-2 xl:grid-cols-4">
        <StatCard label="Số dư ví" value={formatCredit(user.balance)} note="Dùng để lấy đề từ FuOverflow" />
        <StatCard tone="emerald" label="Đề trong kho" value={library.data?.meta.total ?? "—"} note="Đã lấy về tài khoản" />
        <StatCard tone="amber" label="Lần làm bài" value={attempts.data?.meta.total ?? "—"} note="Tổng số lần đã nộp" />
        <StatCard
          tone="rose"
          label="Điểm trung bình"
          value={avg === null ? "—" : formatScore(avg)}
          note={best === null ? "Chưa có bài nào" : `Cao nhất ${formatScore(best)} · ${recent.length} bài gần nhất`}
        />
      </StatGrid>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Bài làm gần đây" action={seeAll("/account/attempts")} />
          {attempts.loading && !attempts.data ? (
            <Loading />
          ) : attempts.error ? (
            <ErrorBox message={attempts.error} onRetry={attempts.reload} />
          ) : recent.length === 0 ? (
            <Empty icon={ClipboardCheck} title="Chưa có bài làm nào">
              Lấy một đề từ link FuOverflow ở trang chủ rồi nộp bài, kết quả sẽ hiện ở đây.
            </Empty>
          ) : (
            <ul className="divide-y divide-slate-200">
              {recent.slice(0, 5).map((a) => (
                <li key={a.id}>
                  <Link to={`/account/attempts/${a.id}`} className="flex items-center gap-3 px-5 py-3 transition hover:bg-slate-50">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-900">{a.exam.title}</div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {a.mode === "EXAM" ? "Thi" : "Luyện tập"} · {formatDateTime(a.createdAt)} · {a.correct}/{a.totalGraded}
                      </div>
                    </div>
                    <Badge tone={a.score >= PASS_SCORE ? "success" : "danger"}>{formatScore(a.score)}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Đề trong kho" action={seeAll("/", "Lấy đề mới")} />
          {library.loading && !library.data ? (
            <Loading />
          ) : library.error ? (
            <ErrorBox message={library.error} onRetry={library.reload} />
          ) : !library.data || library.data.items.length === 0 ? (
            <Empty icon={Library} title="Kho đề đang trống">
              Dán link đề FuOverflow ở trang chủ, đề sẽ được lưu vào đây.
            </Empty>
          ) : (
            <ul className="divide-y divide-slate-200">
              {library.data.items.map((e, i) => (
                <li key={e.id}>
                  <Link to={`/exam/${e.threadId}`} className="flex items-center gap-4 px-5 py-3 transition hover:bg-slate-50">
                    <span className="w-6 shrink-0 text-xs text-slate-400">{String(i + 1).padStart(2, "0")}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-900">{e.title}</div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {e.totalQuestions} câu · {e.attempts > 0 ? `${e.attempts} lần, cao nhất ${formatScore(e.bestScore ?? 0)}` : "chưa làm"}
                      </div>
                    </div>
                    <ArrowRight size={15} className="text-slate-300" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader title="Giao dịch gần đây" action={seeAll("/account/transactions")} />
        {recentTx.loading && !recentTx.data ? (
          <Loading />
        ) : recentTx.error ? (
          <ErrorBox message={recentTx.error} onRetry={recentTx.reload} />
        ) : (
          recentTx.data && <TransactionTable items={recentTx.data.items} />
        )}
      </Card>
    </div>
  );
}
