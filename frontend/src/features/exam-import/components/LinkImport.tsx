import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Link2, Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { SignUpCta } from "@/features/trial/SignUpCta";
import { useApi } from "@/shared/hooks/useApi";
import { examImportApi } from "../exam-import.api";
import { useFakeProgress } from "@/shared/hooks/useFakeProgress";
import { Button } from "@/shared/ui/Button";
import { FormError } from "@/shared/ui/Feedback";
import { inputClass } from "@/shared/ui/Input";
import { ConfirmFetchDialog } from "./ConfirmFetchDialog";
import { useExamImport } from "../useExamImport";
import type { ImportedExam } from "../types";

const PLACEHOLDER = "https://fuoverflow.com/threads/pro192-su26-fe.7094/";
const FINISH_DELAY_MS = 600; // cho người dùng thấy thanh chạm 100% trước khi chuyển

interface Props {
  onImported: (exam: ImportedExam) => void;
}

// Nhập link đề FuOverflow: server crawl ở nền, ở đây hiện thanh tiến độ và mở đề khi xong
export function LinkImport({ onImported }: Props) {
  const { user, refresh } = useAuth();
  // /?url=<link FuOverflow> điền sẵn ô nhập; không tự lấy đề vì mỗi lần lấy có thể bị tính phí
  const [searchParams] = useSearchParams();
  const [url, setUrl] = useState(searchParams.get("url") ?? "");
  const job = useExamImport();
  const price = useApi(
    () => (user ? examImportApi.price() : Promise.resolve({ price: 0 })),
    [user?.id],
  );
  const fee = price.data?.price ?? 0;
  const [confirming, setConfirming] = useState(false); // hộp thoại xác nhận trước khi lấy (và trừ phí)

  const limitReached =
    !user && job.phase === "failed" && job.errorStatus === 429;
  const running = job.phase === "running";
  const done = job.phase === "done";
  const percent = useFakeProgress(running || done, done);

  // Số dư đổi khi server trừ phí (sau khi gửi) và khi hoàn phí (lỗi): cập nhật lại cho khớp
  const charged = job.phase === "running" && job.stage !== "Đang gửi yêu cầu";
  useEffect(() => {
    if (charged || job.phase === "done" || job.phase === "failed")
      void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [charged, job.phase]);

  // Xong thì dừng ở 100% một nhịp rồi trao đề ra ngoài
  useEffect(() => {
    if (!job.exam) return;
    const exam = job.exam;
    const id = setTimeout(() => {
      onImported(exam);
      job.reset();
      setUrl("");
    }, FINISH_DELAY_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.exam]);

  // Thành viên có phí, hoặc khách (có giới hạn lượt): hỏi xác nhận. Thành viên không mất phí thì lấy luôn.
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!url.trim() || running) return;
    if (!user || fee > 0) setConfirming(true);
    else void job.start(url.trim());
  };

  const confirm = () => {
    setConfirming(false);
    void job.start(url.trim());
  };

  return (
    <>
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-left sm:px-6 sm:py-9"
    >
      <div className="flex flex-col items-center text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-accent text-white shadow-lg shadow-brand-600/25">
          <Link2 size={22} />
        </span>
        <div className="mt-4 text-lg font-semibold text-slate-900">
          Nhập đề từ link FuOverflow
        </div>
        <div className="mt-0.5 text-sm text-slate-500">
          Dán link thread đề thi, hệ thống tự lấy ảnh và lưu lại
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={running || done}
          placeholder={PLACEHOLDER}
          aria-label="Link đề FuOverflow"
          className={`${inputClass(job.error ?? undefined)} sm:flex-1`}
        />
        <Button
          variant="primary"
          type="submit"
          disabled={!url.trim() || running || done || (!!user && price.loading)}
        >
          {running && <Loader2 size={16} className="animate-spin" />}
          {running ? "Đang lấy đề…" : "Lấy đề"}
        </Button>
      </div>



      {limitReached && (
        <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50/70 p-4">
          <div className="text-sm font-semibold text-slate-900">
            Hết lượt lấy đề hôm nay rồi!
          </div>
          <p className="mb-3 mt-1 text-xs leading-relaxed text-slate-600">
            Khách được lấy miễn phí 1 đề mỗi ngày. Đăng ký tài khoản (mất vài
            giây thôi) để lấy thêm đề, giữ mọi đề trong kho riêng và lưu lại
            từng lần làm bài với điểm cùng chi tiết từng câu. Hoặc quay lại vào
            ngày mai để nhận thêm một lượt nhé.
          </p>
          <SignUpCta />
        </div>
      )}

      {(running || done) && (
        <div className="mt-4" role="status" aria-live="polite">
          <div className="mb-1.5 flex items-center justify-between text-xs text-slate-600">
            <span>{done ? "Hoàn tất" : (job.stage ?? "Đang xử lý")}</span>
            <span className="tabular-nums">{percent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200/70">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-600 via-accent to-accent-soft transition-[width] duration-500 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Đề mới có thể mất vài phút. Đề đã có sẵn sẽ mở ngay.
          </p>
        </div>
      )}

      {job.phase === "failed" && !limitReached && (
        <div className="mt-4 space-y-2">
          <FormError message={job.error} />
          <button
            type="button"
            onClick={job.reset}
            className="text-xs font-medium text-brand-700 hover:underline"
          >
            Thử lại
          </button>
        </div>
      )}
    </form>

    {confirming && (
      <ConfirmFetchDialog
        url={url.trim()}
        fee={fee}
        balance={user ? user.balance : null}
        onCancel={() => setConfirming(false)}
        onConfirm={confirm}
      />
    )}
    </>
  );
}
