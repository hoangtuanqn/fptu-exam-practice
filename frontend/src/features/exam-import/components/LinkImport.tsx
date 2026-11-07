import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertCircle, BadgeCheck, CheckCircle2, Link2, Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { ApiError } from "@/shared/api/client";
import { useToast } from "@/shared/context/ToastContext";
import { SignUpCta } from "@/features/trial/SignUpCta";
import { useApi } from "@/shared/hooks/useApi";
import { examImportApi, type QuoteResult } from "../exam-import.api";
import { checkFuoLink } from "@/shared/utils/fuo-link";
import { useFakeProgress, type ProgressHint } from "@/shared/hooks/useFakeProgress";
import { Button } from "@/shared/ui/Button";
import { FormError } from "@/shared/ui/Feedback";
import { inputClass } from "@/shared/ui/Input";
import { ConfirmFetchDialog } from "./ConfirmFetchDialog";
import { ExtLoginDialog } from "./ExtLoginDialog";
import { useExamImport } from "../useExamImport";
import type { ImportedExam } from "../types";

const PLACEHOLDER = "https://fuoverflow.com/threads/pro192-su26-fe.7094/";
// Từ dòng trạng thái thật của worker ("Đang tải ảnh 12/50") suy ra mốc phần trăm: đọc thread 0-10, tải ảnh 10-70,
// lấy bình luận 70-95, lưu 96+. Nhờ vậy thanh phản ánh tiến độ thật thay vì đoán.
function hintFor(stage: string | null): ProgressHint {
  const m = stage?.match(/(\d+)\/(\d+)/);
  const [done, total] = m ? [Number(m[1]), Math.max(1, Number(m[2]))] : [0, 1];
  if (stage?.includes("tải ảnh")) {
    const floor = 10 + (60 * done) / total;
    return { floor, ceiling: Math.min(70, floor + (60 / total) * 1.5) };
  }
  if (stage?.includes("bình luận")) {
    const floor = 70 + (25 * done) / total;
    return { floor, ceiling: Math.min(95, floor + (25 / total) * 1.5) };
  }
  if (stage?.includes("lưu")) return { floor: 96, ceiling: 98 };
  if (stage?.includes("xếp hàng") || stage?.includes("tới lượt")) return { floor: 0, ceiling: 6 };
  if (stage?.includes("gửi")) return { floor: 0, ceiling: 4 };
  return { floor: 0, ceiling: 10 }; // đang đọc thread
}

const FINISH_DELAY_MS = 600; // cho người dùng thấy thanh chạm 100% trước khi chuyển

interface Props {
  onImported: (exam: ImportedExam) => void;
}

const DEFAULT_PRICE = 500; // phí niêm yết hiện khi chưa lấy được từ máy chủ

// Nhập link đề FuOverflow: server crawl ở nền, ở đây hiện thanh tiến độ và mở đề khi xong
export function LinkImport({ onImported }: Props) {
  const { user, refresh, loading: authLoading } = useAuth();
  // /?url=<link FuOverflow> điền sẵn ô nhập; không tự lấy đề vì mỗi lần lấy có thể bị tính phí.
  // Thêm &confirm=1 (nút trên FuOverflow của tiện ích Chrome) thì mở luôn hộp xác nhận: vẫn phải bấm xác nhận mới bị trừ phí.
  const [searchParams, setSearchParams] = useSearchParams();
  const initialLink = searchParams.get("link") ?? searchParams.get("url") ?? ""; // "link" cho tiện ích (máy chủ dev Vite chặn ?url=), "url" là cách cũ
  const [url, setUrl] = useState(initialLink);
  const job = useExamImport();
  // Giá niêm yết luôn lấy về để hiện cho mọi người; phí thực tế chỉ tính với thành viên (khách dùng thử miễn phí)
  const price = useApi(() => examImportApi.price(), [user?.id]);
  const listPrice = price.data?.price ?? null;
  const shownPrice = listPrice ?? DEFAULT_PRICE; // chưa tải được thì hiện giá mặc định
  const fee = user ? (listPrice ?? 0) : 0;
  const [confirming, setConfirming] = useState(false); // hộp thoại xác nhận trước khi lấy (và trừ phí)
  const [quoting, setQuoting] = useState(false); // đang hỏi server phí thực tế của lần lấy này
  const [quotedFee, setQuotedFee] = useState<number | null>(null);
  const toast = useToast();

  // Kiểm tra link ngay khi gõ/dán: bước 1 ở trình duyệt (tức thì), bước 2 hỏi backend (gộp bằng debounce) để biết link có được
  // chấp nhận không và đề đã có trong kho của bạn chưa. Kết quả backend cũng dùng lại cho bước báo phí khi bấm "Lấy đề".
  const local = checkFuoLink(url);
  const link = url.trim();
  const [remote, setRemote] = useState<{ link: string; status: "checking" | "ok" | "error"; message?: string; quote?: QuoteResult } | null>(null);
  useEffect(() => {
    if (!local.ok) return void setRemote(null);
    setRemote({ link, status: "checking" });
    let cancelled = false;
    const id = setTimeout(() => {
      examImportApi
        .quote(link)
        .then((quote) => !cancelled && setRemote({ link, status: "ok", quote }))
        .catch((err) => {
          if (cancelled) return;
          // 4xx (trừ 429) = backend không chấp nhận link; lỗi mạng/quá tải thì không chặn, để lúc bấm "Lấy đề" báo tiếp
          if (err instanceof ApiError && err.status >= 400 && err.status < 500 && err.status !== 429) setRemote({ link, status: "error", message: err.message });
          else setRemote(null);
        });
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [link, local.ok, user?.id]);
  const current = remote?.link === link ? remote : null;
  const linkError = link ? (local.ok ? (current?.status === "error" ? current.message ?? "Link không hợp lệ" : null) : local.message) : null;
  const linkInvalid = !!linkError;

  const limitReached =
    !user && job.phase === "failed" && job.errorStatus === 429;
  const running = job.phase === "running";
  const done = job.phase === "done";
  const percent = useFakeProgress(running || done, done, hintFor(job.stage));

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
  const submit = async () => {
    const link = url.trim();
    if (!link || running || quoting || linkInvalid) return;
    if (!user) return setConfirming(true);
    if (fee <= 0) return void job.start(link);

    // Hỏi trước phí thực tế: đề đã từng lấy thì miễn phí, mở luôn và báo cho người dùng biết
    setQuoting(true);
    try {
      const quote = current?.status === "ok" && current.quote ? current.quote : await examImportApi.quote(link);
      if (quote.free) {
        toast.success("Bạn đã lấy đề này trước đó nên được mở lại miễn phí, không bị trừ credit");
        void job.start(link);
      } else {
        setQuotedFee(quote.fee);
        setConfirming(true);
      }
    } catch (err) {
      // Backend từ chối link (sai nhãn, không tồn tại...): báo lỗi, TUYỆT ĐỐI không gửi lấy đề. Lỗi khác (mạng...): vẫn hỏi xác nhận với mức phí mặc định, không tự trừ tiền.
      if (err instanceof ApiError && err.status >= 400 && err.status < 500 && err.status !== 429) {
        setRemote({ link, status: "error", message: err.message });
        toast.error(err.message);
      } else {
        setQuotedFee(fee);
        setConfirming(true);
      }
    } finally {
      setQuoting(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submit();
  };

  // Mở từ nút của tiện ích: tự đi tới bước xác nhận (một lần) khi đã biết người dùng là ai và giá là bao nhiêu
  const autoConfirm = searchParams.get("confirm") === "1" && !!initialLink;
  const autoDone = useRef(false);
  const fromExt = useRef(searchParams.get("src") === "ext"); // đến từ nút của tiện ích: bắt buộc có tài khoản
  const [needLogin, setNeedLogin] = useState(false);
  useEffect(() => {
    if (!autoConfirm || autoDone.current || authLoading || (!!user && price.loading)) return;
    autoDone.current = true;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("confirm"); // tải lại trang không tự mở hộp xác nhận lần nữa
        next.delete("src");
        return next;
      },
      { replace: true },
    );
    if (!user && fromExt.current) setNeedLogin(true);
    else void submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConfirm, authLoading, user, price.loading]);

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
        <span className="flex h-12 w-12 items-center justify-center rounded-md bg-brand-900 text-white">
          <Link2 size={22} />
        </span>
        <div className="mt-4 font-display text-xl font-semibold text-brand-900">
          Nhập đề từ link FuOverflow
        </div>
        <div className="mt-0.5 text-sm text-slate-500">
          Dán link thread đề thi, hệ thống tự lấy ảnh và lưu lại
        </div>
        <div className="mt-3 flex flex-col items-center gap-1.5">
          <div className="flex items-baseline gap-1">
            <span className="font-display text-3xl font-semibold leading-none tracking-tight text-brand-900">
              {shownPrice > 0 ? `${shownPrice.toLocaleString("vi-VN")}đ` : "Miễn phí"}
            </span>
            <span className="text-sm font-medium text-slate-500">/ đề</span>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
            <BadgeCheck size={14} className="text-brand-700" /> Đáp án chính xác đến 99.9%
          </span>
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
          aria-invalid={linkInvalid || undefined}
          className={`${inputClass(linkError ?? job.error ?? undefined)} sm:flex-1`}
        />
        <Button
          variant="primary"
          type="submit"
          disabled={!url.trim() || linkInvalid || running || done || quoting || (!!user && price.loading)}
        >
          {(running || quoting) && <Loader2 size={16} className="animate-spin" />}
          {running ? "Đang lấy đề…" : "Lấy đề"}
        </Button>
      </div>

      {link && !running && !done && (
        <div className="mt-2 min-h-5 text-left text-xs" role="status" aria-live="polite">
          {linkError ? (
            <span className="flex items-start gap-1.5 text-red-600">
              <AlertCircle size={14} className="mt-px shrink-0" /> {linkError}
            </span>
          ) : current?.status === "ok" ? (
            <span className="flex items-start gap-1.5 text-emerald-700">
              <CheckCircle2 size={14} className="mt-px shrink-0" />
              {current.quote?.reason === "owned"
                ? `Link hợp lệ. Bạn đã lấy đề${current.quote.title ? ` "${current.quote.title}"` : ""} rồi, mở lại miễn phí.`
                : current.quote?.reason === "in-progress"
                  ? "Link hợp lệ. Đề đang được lấy, không tính thêm phí."
                  : `Link hợp lệ${local.ok ? ` (mã đề ${local.threadId})` : ""}.`}
            </span>
          ) : local.ok ? (
            <span className="flex items-center gap-1.5 text-slate-500">
              <Loader2 size={14} className="animate-spin" /> Đang kiểm tra link…
            </span>
          ) : null}
        </div>
      )}

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

    {needLogin && <ExtLoginDialog url={url.trim()} onCancel={() => setNeedLogin(false)} />}

    {confirming && (
      <ConfirmFetchDialog
        url={url.trim()}
        fee={quotedFee ?? fee}
        balance={user ? user.balance : null}
        onCancel={() => setConfirming(false)}
        onConfirm={confirm}
      />
    )}
    </>
  );
}
