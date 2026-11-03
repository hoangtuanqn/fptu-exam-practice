import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { ApiError } from "@/shared/api/client";
import { useFakeProgress } from "@/shared/hooks/useFakeProgress";
import { Button } from "@/shared/ui/Button";
import { Modal, ModalActions, ModalTitle } from "@/shared/ui/Modal";
import { formatCredit } from "@/shared/utils/formatters";
import { explanationApi } from "./explanation.api";

interface Props {
  examId: number;
  questionNumber: number;
  price: number;
  alreadyBought: boolean; // đã mua rồi: xem lại miễn phí, không cần xác nhận
  onClose: () => void;
  onBought: () => void; // báo đã mua (để nút đổi sang "xem lại")
}

type Phase = "confirm" | "loading" | "done" | "error";

// Một lời giải lấy từ bản đã lưu vẫn hiện trạng thái "AI đang phân tích" thêm vài giây cho đồng nhất trải nghiệm
const MIN_CACHED_WAIT_MS = 2000;
const CACHED_WAIT_JITTER_MS = 2000;

// Xem lời giải thích AI của một câu: xác nhận phí -> đang phân tích -> hiện lời giải
export function ExplainDialog({ examId, questionNumber, price, alreadyBought, onClose, onBought }: Props) {
  const { user, refresh } = useAuth();
  const [phase, setPhase] = useState<Phase>(alreadyBought ? "loading" : "confirm");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);
  const started = useRef(false);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const percent = useFakeProgress(phase === "loading", phase === "done");
  const balance = user?.balance ?? 0;
  const short = !alreadyBought && balance < price;

  async function load() {
    setPhase("loading");
    setError(null);
    const startedAt = Date.now();
    try {
      const result = await explanationApi.explain(examId, questionNumber);
      if (result.cached) {
        const target = MIN_CACHED_WAIT_MS + Math.random() * CACHED_WAIT_JITTER_MS;
        await new Promise((r) => setTimeout(r, Math.max(0, target - (Date.now() - startedAt))));
      }
      if (!alive.current) return;
      setContent(result.content);
      setPhase("done");
      onBought();
      if (result.charged > 0) void refresh(); // cập nhật số dư sau khi trừ phí
    } catch (err) {
      if (!alive.current) return;
      setError(err instanceof ApiError ? err.message : "Không tải được lời giải thích");
      setPhase("error");
    }
  }

  // Đã mua rồi thì tải ngay khi mở (StrictMode chạy effect hai lần nên có cờ chặn gọi trùng)
  useEffect(() => {
    if (alreadyBought && !started.current) {
      started.current = true;
      void load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Modal onClose={phase === "loading" ? undefined : onClose}>
      <ModalTitle icon={Sparkles}>Giải thích câu {questionNumber}</ModalTitle>

      {phase === "confirm" && (
        <>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            AI sẽ giải thích vì sao đáp án đúng và vì sao các lựa chọn còn lại sai. Phí <b className="text-slate-900">{formatCredit(price)}</b>, mỗi câu chỉ trả một lần, xem lại miễn phí.
          </p>
          <div className="mt-3 rounded-lg bg-slate-50 px-3.5 py-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Số dư hiện tại</span>
              <span className="font-medium tabular-nums text-slate-900">{formatCredit(balance)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-slate-500">Số dư sau khi xem</span>
              <span className={`font-medium tabular-nums ${short ? "text-rose-600" : "text-slate-900"}`}>{formatCredit(Math.max(0, balance - price))}</span>
            </div>
          </div>
          {short && (
            <p className="mt-2 text-sm text-rose-600">
              Số dư không đủ.{" "}
              <Link to="/account/deposit" className="font-medium underline">
                Nạp thêm credit
              </Link>
            </p>
          )}
          <ModalActions>
            <Button onClick={onClose}>Hủy</Button>
            <Button variant="primary" onClick={() => void load()} disabled={short}>
              <Sparkles size={16} /> Xác nhận ({formatCredit(price)})
            </Button>
          </ModalActions>
        </>
      )}

      {phase === "loading" && (
        <div className="mt-4 space-y-3 py-4 text-center" role="status" aria-live="polite">
          <Loader2 size={28} className="mx-auto animate-spin text-brand-600" />
          <div className="text-sm font-medium text-slate-900">AI đang phân tích câu hỏi…</div>
          <div className="mx-auto h-1.5 max-w-xs overflow-hidden rounded-full bg-slate-100" aria-hidden>
            <div className="h-full rounded-full bg-brand-600 transition-[width] duration-300 ease-linear" style={{ width: `${percent}%` }} />
          </div>
          <p className="text-xs text-slate-500">Thường mất vài giây đến nửa phút.</p>
        </div>
      )}

      {phase === "done" && (
        <>
          <div className="mt-3 max-h-[55vh] overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-800">{content}</div>
          <p className="mt-2 text-xs text-slate-400">Lời giải do AI tạo, có thể chưa hoàn toàn chính xác. Thấy đáp án sai? Hãy dùng nút “Báo cáo”.</p>
          <ModalActions>
            <Button variant="primary" onClick={onClose}>
              Đóng
            </Button>
          </ModalActions>
        </>
      )}

      {phase === "error" && (
        <>
          <p className="mt-3 rounded-lg bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">{error}</p>
          <ModalActions>
            <Button onClick={onClose}>Đóng</Button>
            <Button variant="primary" onClick={() => void load()}>
              Thử lại
            </Button>
          </ModalActions>
        </>
      )}
    </Modal>
  );
}
