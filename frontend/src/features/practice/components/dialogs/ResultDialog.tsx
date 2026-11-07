import { Eye, Loader2, RotateCcw } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import type { AnswerSource } from "@/features/practice/types";
import { SignUpCta } from "@/features/trial/SignUpCta";
import { MAX_SCORE, PASS_SCORE } from "@/features/practice/config/scoring";
import { formatDuration, formatScore } from "@/features/practice/utils/format";
import type { GradeResult } from "@/features/practice/utils/grade";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Modal, ModalActions } from "@/shared/ui/Modal";
import { ScoreRing } from "@/shared/ui/ScoreRing";

interface Props {
  result: GradeResult;
  elapsed: number; // số giây làm bài
  answersPending: boolean; // AI chưa phân tích xong: điểm sẽ cập nhật khi có đáp án
  answerSource: AnswerSource | null; // nguồn đáp án, để ghi chú độ tin cậy của điểm
  savable: boolean; // đề của hệ thống: bài vừa làm lưu được vào lịch sử khi đăng ký
  onReview: () => void;
  onRetry: () => void;
}

// Bảng điểm sau khi nộp
export function ResultDialog({ result, elapsed, savable, answersPending, answerSource, onReview, onRetry }: Props) {
  const { user } = useAuth();
  const passed = result.score >= PASS_SCORE;
  const tone = result.total === 0 ? "neutral" : passed ? "success" : "danger";

  return (
    <Modal onClose={onReview}>
      <div className="text-center">
        {answersPending ? (
          // AI chưa xong: chưa có điểm. Khi có đáp án, màn hình này tự chuyển sang điểm thật.
          <div className="flex flex-col items-center gap-3 py-6">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <Loader2 size={26} className="animate-spin" />
            </span>
            <div className="text-lg font-semibold text-slate-900">Đang chuẩn bị đáp án…</div>
            <p className="max-w-xs text-sm leading-relaxed text-slate-500">
              Bài của bạn đã được ghi nhận. Điểm sẽ hiện ngay ở đây khi đáp án sẵn sàng, thường sau ít phút. Bạn có thể xem lại bài trong lúc chờ.
            </p>
          </div>
        ) : (
          <div>
            <ScoreRing value={result.score / MAX_SCORE} tone={tone}>
              <span className="font-serif text-4xl font-semibold leading-none text-slate-900">
                {formatScore(result.score)}
              </span>
              <span className="mt-1 text-xs text-slate-400">/ {MAX_SCORE}</span>
            </ScoreRing>
          </div>
        )}

        {!answersPending && result.total > 0 && (
          <div className="mt-3">
            <Badge tone={passed ? "success" : "danger"}>{passed ? "Đạt" : "Chưa đạt"}</Badge>
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-4 divide-x divide-slate-200 rounded-xl border border-slate-200 text-center">
        <Stat label="Đúng" value={answersPending ? "—" : result.correct} color="text-emerald-600" />
        <Stat label="Sai" value={answersPending ? "—" : result.wrong} color="text-rose-600" />
        <Stat label="Chưa làm" value={answersPending ? "—" : result.skipped} color="text-slate-600" />
        <Stat label="Thời gian" value={formatDuration(elapsed)} color="text-brand-800" />
      </div>

      {answerSource === "AI" && result.total > 0 && (
        <p className="mt-3 text-center text-xs text-slate-500">Đáp án do AI phân tích, có thể còn vài câu chưa chính xác.</p>
      )}
      {answerSource === "DEFAULT" && result.total > 0 && (
        <p className="mt-3 text-center text-xs text-amber-700">Đáp án tạm (chưa có AI phân tích) nên điểm chỉ mang tính tham khảo.</p>
      )}

      {!answersPending && result.total === 0 && (
        <p className="mt-4 text-center text-xs text-slate-500">Chưa có đáp án trong ans.txt nên không thể chấm điểm.</p>
      )}

      {!user && (
        <div className="mt-5 rounded-xl bg-brand-50 p-4">
          <div className="text-sm font-medium text-brand-900">Muốn giữ lại kết quả này?</div>
          <p className="mb-3 mt-1 text-xs leading-relaxed text-slate-600">
            {savable
              ? "Đăng ký (hoặc đăng nhập) ngay bây giờ, bài vừa làm sẽ được lưu vào lịch sử cùng điểm và chi tiết từng câu, và các đề bạn đã lấy sẽ nằm trong kho riêng của bạn."
              : "Đề mở từ thư mục không được lưu lịch sử. Đăng ký tài khoản miễn phí để lấy đề từ link FuOverflow, lưu điểm và chi tiết từng câu, rồi theo dõi tiến bộ qua mỗi lần làm."}
          </p>
          <SignUpCta />
        </div>
      )}

      <ModalActions>
        <Button grow onClick={onRetry}>
          <RotateCcw size={16} />
          Làm lại
        </Button>
        <Button grow variant="primary" onClick={onReview}>
          <Eye size={16} />
          Xem lại bài
        </Button>
      </ModalActions>
    </Modal>
  );
}

function Stat({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="py-3">
      <div className={`font-serif text-xl font-semibold tabular-nums ${color}`}>{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
