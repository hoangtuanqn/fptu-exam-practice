import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { Button } from "@/shared/ui/Button";
import { explanationApi, FEEDBACK_REASONS, type FeedbackReason } from "./explanation.api";

interface Props {
  examId: number;
  questionNumber: number;
  initial: boolean | null; // đánh giá đã gửi trước đó (null = chưa)
}

const MAX_COMMENT = 500;

// 👍/👎 cho lời giải. Bấm là gửi ngay; chọn 👎 thì hỏi thêm lý do (không bắt buộc) để biết lời giải sai ở đâu.
export function ExplainFeedback({ examId, questionNumber, initial }: Props) {
  const toast = useToast();
  const [vote, setVote] = useState<boolean | null>(initial);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState<FeedbackReason | null>(null);
  const [comment, setComment] = useState("");
  const [detailSent, setDetailSent] = useState(false);

  async function send(helpful: boolean, extra?: { reason?: FeedbackReason; comment?: string }) {
    if (busy) return false;
    setBusy(true);
    try {
      await explanationApi.feedback({ examId, questionNumber, helpful, ...extra });
      setVote(helpful);
      return true;
    } catch (err) {
      toast.error(errorMessage(err, "Chưa gửi được đánh giá, vui lòng thử lại"));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function pick(helpful: boolean) {
    if (vote === helpful) return;
    setDetailSent(false);
    if (await send(helpful)) {
      if (helpful) toast.success("Cảm ơn bạn đã đánh giá");
    }
  }

  async function sendDetail() {
    if (!reason && !comment.trim()) return;
    if (await send(false, { ...(reason && { reason }), ...(comment.trim() && { comment: comment.trim() }) })) {
      setDetailSent(true);
      toast.success("Cảm ơn góp ý của bạn, chúng tôi sẽ cải thiện lời giải");
    }
  }

  const btn = (on: boolean, tone: string) =>
    `inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition disabled:opacity-60 ${on ? tone : "border-slate-200 text-slate-600 hover:bg-slate-50"}`;

  return (
    <section aria-label="Đánh giá lời giải" className="mt-5 border-t border-slate-100 pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-600">Lời giải này có giúp ích không?</span>
        <button type="button" disabled={busy} aria-pressed={vote === true} onClick={() => void pick(true)} className={btn(vote === true, "border-emerald-300 bg-emerald-50 text-emerald-700")}>
          <ThumbsUp size={15} /> Hữu ích
        </button>
        <button type="button" disabled={busy} aria-pressed={vote === false} onClick={() => void pick(false)} className={btn(vote === false, "border-rose-300 bg-rose-50 text-rose-700")}>
          <ThumbsDown size={15} /> Chưa tốt
        </button>
      </div>

      {vote === false && !detailSent && (
        <div className="mt-3 space-y-2.5 rounded-xl bg-slate-50 p-3">
          <p className="text-sm font-medium text-slate-800">Lời giải chưa tốt ở điểm nào? (không bắt buộc)</p>
          <div role="group" aria-label="Lý do" className="flex flex-wrap gap-2">
            {FEEDBACK_REASONS.map((r) => (
              <button
                key={r.value}
                type="button"
                aria-pressed={reason === r.value}
                onClick={() => setReason(reason === r.value ? null : r.value)}
                className={`min-h-9 rounded-full border px-3 text-xs font-medium transition ${reason === r.value ? "border-brand-400 bg-brand-50 text-brand-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"}`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, MAX_COMMENT))}
            rows={2}
            maxLength={MAX_COMMENT}
            aria-label="Góp ý thêm"
            placeholder="Góp ý thêm cho chúng tôi (nếu có)"
            className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
          />
          <Button variant="primary" disabled={busy || (!reason && !comment.trim())} onClick={() => void sendDetail()}>
            Gửi góp ý
          </Button>
        </div>
      )}
    </section>
  );
}
