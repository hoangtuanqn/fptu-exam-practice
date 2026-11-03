import { Eye, RotateCcw } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
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
  onReview: () => void;
  onRetry: () => void;
}

// Bảng điểm sau khi nộp
export function ResultDialog({ result, elapsed, onReview, onRetry }: Props) {
  const { user } = useAuth();
  const passed = result.score >= PASS_SCORE;
  const tone = result.total === 0 ? "neutral" : passed ? "success" : "danger";

  return (
    <Modal>
      <div className="text-center">
        <div>
          <ScoreRing value={result.score / MAX_SCORE} tone={tone}>
            <span className="font-serif text-4xl font-semibold leading-none text-slate-900">
              {formatScore(result.score)}
            </span>
            <span className="mt-1 text-xs text-slate-400">/ {MAX_SCORE}</span>
          </ScoreRing>
        </div>

        {result.total > 0 && (
          <div className="mt-3">
            <Badge tone={passed ? "success" : "danger"}>{passed ? "Đạt" : "Chưa đạt"}</Badge>
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-4 divide-x divide-slate-200 rounded-xl border border-slate-200 text-center">
        <Stat label="Đúng" value={result.correct} color="text-emerald-600" />
        <Stat label="Sai" value={result.wrong} color="text-rose-600" />
        <Stat label="Chưa làm" value={result.skipped} color="text-slate-600" />
        <Stat label="Thời gian" value={formatDuration(elapsed)} color="text-brand-800" />
      </div>

      {result.total === 0 && (
        <p className="mt-4 text-center text-xs text-slate-500">Chưa có đáp án trong ans.txt nên không thể chấm điểm.</p>
      )}

      {!user && (
        <div className="mt-5 rounded-xl bg-brand-50 p-4">
          <div className="text-sm font-medium text-brand-900">Muốn giữ lại kết quả này?</div>
          <p className="mb-3 mt-1 text-xs leading-relaxed text-slate-600">
            Lượt làm thử này chưa được lưu. Đăng ký tài khoản miễn phí để nhập đề từ link FuOverflow, lưu điểm và chi tiết
            từng câu vào lịch sử, rồi theo dõi tiến bộ qua mỗi lần làm.
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
