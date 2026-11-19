import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CloudDownload, FileSearch, Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { formatDuration } from "@/features/practice/utils/format";
import { errorMessage } from "@/shared/api/errors";
import { SiteHeader } from "@/shared/layout/SiteHeader";
import { buttonClass } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Empty } from "@/shared/ui/Feedback";
import { isPro } from "@/shared/utils/pro";
import { ConfirmFetchDialog } from "./components/ConfirmFetchDialog";
import { examImportApi } from "./exam-import.api";
import { examOpenPath } from "./types";
import { useExamImport } from "./useExamImport";

// Trang mở từ tiện ích Chrome (/fetch?link=<bài FuOverflow>): hỏi phí, chỉ trừ credit khi người dùng xác nhận,
// lấy xong thì mở đề (đề PE: trang xem trước /exam/:id/preview; đề đã có trong kho thì mở luôn, không trừ thêm)
export default function FetchLinkPage() {
  const link = useSearchParams()[0].get("link") ?? "";
  const navigate = useNavigate();
  const { user, refresh } = useAuth();
  const job = useExamImport();
  const [fee, setFee] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const asked = useRef(false);

  useEffect(() => {
    if (asked.current || !link) return;
    asked.current = true; // StrictMode gọi effect hai lần: chỉ hỏi phí một lần
    examImportApi
      .quote(link)
      .then((q) => (q.free ? void job.start(link) : setFee(q.fee)))
      .catch((err) => setError(errorMessage(err, "Chưa kiểm tra được bài này")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [link]);

  useEffect(() => {
    if (!job.exam) return;
    void refresh(); // số dư vừa đổi
    navigate(examOpenPath(job.exam), { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.exam]);

  const message = !link ? "Thiếu link bài trên FuOverflow." : (error ?? (job.phase === "failed" ? `${job.error ?? "Không lấy được đề này."} Nếu đã bị trừ credit, hệ thống tự hoàn lại.` : null));

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <SiteHeader />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-24 pt-10">
        <Card>
          {message ? (
            <Empty icon={FileSearch} title="Chưa mở được đề">
              {message}
              <div className="mt-3 flex justify-center">
                <Link to="/account/exams" className={buttonClass({ size: "sm" })}>
                  Kho đề
                </Link>
              </div>
            </Empty>
          ) : (
            <FetchProgress stage={job.phase === "running" ? (job.stage ?? "Đang lấy đề") : fee !== null ? "Chờ bạn xác nhận" : "Đang kiểm tra đề"} running={job.phase === "running"} />
          )}
        </Card>
      </main>

      {fee !== null && (
        <ConfirmFetchDialog
          url={link}
          fee={fee}
          pro={isPro(user)}
          balance={user ? user.balance : null}
          onCancel={() => navigate("/account/exams", { replace: true })}
          onConfirm={() => {
            setFee(null);
            void job.start(link);
          }}
        />
      )}
    </div>
  );
}

// Thanh tiến trình khi lấy đề: bước có dạng "x/y" (ví dụ "Đang tải ảnh 12/50") thì chạy theo số thật,
// còn lại chạy theo thời gian, chậm dần và không chạm 100% khi chưa xong (giống dải chờ AI giải đề)
function FetchProgress({ stage, running }: { stage: string; running: boolean }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  const m = stage.match(/(\d+)\s*\/\s*(\d+)/);
  const timed = Math.round(90 * (1 - Math.exp(-seconds / 60)));
  const percent = !running ? 3 : m && Number(m[2]) > 0 ? Math.max(timed, Math.min(99, Math.round((Number(m[1]) / Number(m[2])) * 100))) : timed;
  return (
    <div role="status" aria-live="polite" className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-4 text-sm text-brand-900">
      <div className="flex items-start gap-2.5">
        <CloudDownload size={18} className="mt-0.5 shrink-0 text-brand-700" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{stage.replace(/[.…\s]+$/, "")}…</p>
          <p className="text-brand-800/80">{running ? "Đề mới có thể mất vài phút, đừng đóng trang. Xong sẽ tự mở đề." : "Đang chuẩn bị mở đề từ FuOverflow."}</p>
        </div>
        <Loader2 size={16} className="mt-0.5 shrink-0 animate-spin text-brand-700" />
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-brand-100" aria-hidden>
        <div className="h-full rounded-full bg-brand-600 transition-[width] duration-1000 ease-linear" style={{ width: `${percent}%` }} />
      </div>
      {running && (
        <div className="mt-1.5 flex justify-between text-xs tabular-nums text-brand-800/70">
          <span>Đã chờ {formatDuration(seconds)}</span>
          <span>{percent}%</span>
        </div>
      )}
    </div>
  );
}
