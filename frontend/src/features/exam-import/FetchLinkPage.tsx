import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FileSearch, Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
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
            <p className="flex items-center justify-center gap-2 px-5 py-10 text-on-surface-variant" role="status">
              <Loader2 size={18} className="animate-spin" /> {job.phase === "running" ? `${job.stage ?? "Đang lấy đề…"} Đề mới có thể mất vài phút, đừng đóng trang.` : "Đang kiểm tra đề…"}
            </p>
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
