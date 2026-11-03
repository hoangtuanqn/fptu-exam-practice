import { useEffect, useState, type FormEvent } from "react";
import { Link2, Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { SignUpCta } from "@/features/trial/SignUpCta";
import { useFakeProgress } from "@/shared/hooks/useFakeProgress";
import { Button } from "@/shared/ui/Button";
import { FormError } from "@/shared/ui/Feedback";
import { inputClass } from "@/shared/ui/Input";
import { useExamImport } from "../useExamImport";
import type { ImportedExam } from "../types";

const PLACEHOLDER = "https://fuoverflow.com/threads/pro192-su26-fe.7094/";
const FINISH_DELAY_MS = 600; // cho người dùng thấy thanh chạm 100% trước khi chuyển

interface Props {
  onImported: (exam: ImportedExam) => void;
}

// Nhập link đề FuOverflow: server crawl ở nền, ở đây hiện thanh tiến độ và mở đề khi xong
export function LinkImport({ onImported }: Props) {
  const { user } = useAuth();
  const [url, setUrl] = useState("");
  const job = useExamImport();

  const running = job.phase === "running";
  const done = job.phase === "done";
  const percent = useFakeProgress(running || done, done);

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

  if (!user) {
    return (
      <div className="mt-6 rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/40 px-6 py-8 text-center">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-accent text-white shadow-md shadow-brand-600/25">
          <Link2 size={20} />
        </span>
        <div className="mt-3 font-serif text-xl font-semibold text-slate-900">Nhập đề từ link FuOverflow</div>
        <p className="mb-4 mt-1 text-sm text-slate-500">Đăng nhập để dán link đề, hệ thống tự lấy đề về cho bạn.</p>
        <SignUpCta />
      </div>
    );
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (url.trim() && !running) void job.start(url.trim());
  };

  return (
    <form onSubmit={onSubmit} className="mt-6 rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/40 px-6 py-8 text-left">
      <div className="flex flex-col items-center text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-accent text-white shadow-md shadow-brand-600/25">
          <Link2 size={20} />
        </span>
        <div className="mt-3 font-serif text-xl font-semibold text-slate-900">Nhập đề từ link FuOverflow</div>
        <div className="mt-0.5 text-sm text-slate-500">Dán link thread đề thi, hệ thống tự lấy ảnh và lưu lại</div>
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
        <Button variant="primary" type="submit" disabled={!url.trim() || running || done}>
          {running && <Loader2 size={16} className="animate-spin" />}
          {running ? "Đang lấy đề…" : "Lấy đề"}
        </Button>
      </div>

      {(running || done) && (
        <div className="mt-4" role="status" aria-live="polite">
          <div className="mb-1.5 flex items-center justify-between text-xs text-slate-600">
            <span>{done ? "Hoàn tất" : (job.stage ?? "Đang xử lý")}</span>
            <span className="font-mono tabular-nums">{percent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-brand-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-600 via-accent to-accent-soft transition-[width] duration-500 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">Đề mới có thể mất vài phút. Đề đã có sẵn sẽ mở ngay.</p>
        </div>
      )}

      {job.phase === "failed" && (
        <div className="mt-4 space-y-2">
          <FormError message={job.error} />
          <button type="button" onClick={job.reset} className="text-xs font-medium text-brand-700 hover:underline">
            Thử lại
          </button>
        </div>
      )}
    </form>
  );
}
