import { Link } from "react-router-dom";
import { Crown, Eye, Loader2, RotateCcw, Target } from "lucide-react";
import type { TopicSummary } from "@/features/history/types";
import { useAuth } from "@/features/auth/AuthContext";
import type { AnswerSource } from "@/features/practice/types";
import { ResultUpgradeCard } from "@/features/plan/ResultUpgradeCard";
import { SignUpCta } from "@/features/trial/SignUpCta";
import { MAX_SCORE, PASS_SCORE } from "@/features/practice/config/scoring";
import { formatDuration, formatScore } from "@/features/practice/utils/format";
import type { GradeResult } from "@/features/practice/utils/grade";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Modal, ModalActions } from "@/shared/ui/Modal";
import { ScoreRing } from "@/shared/ui/ScoreRing";
import { ResultToad } from "./ResultToad";
import { toadFor } from "./toadMood";

interface Props {
  result: GradeResult;
  topicSummary?: TopicSummary; // kết quả theo chủ đề của bài vừa nộp
  elapsed: number; // số giây làm bài
  answersPending: boolean; // AI chưa phân tích xong: điểm sẽ cập nhật khi có đáp án
  answerSource: AnswerSource | null; // nguồn đáp án, để ghi chú độ tin cậy của điểm
  savable: boolean; // đề của hệ thống: bài vừa làm lưu được vào lịch sử khi đăng ký
  onReview: () => void;
  onRetry: () => void;
}

// Bảng điểm sau khi nộp
export function ResultDialog({ result, topicSummary = null, elapsed, savable, answersPending, answerSource, onReview, onRetry }: Props) {
  const { user } = useAuth();
  const passed = result.score >= PASS_SCORE;
  const tone = result.total === 0 ? "neutral" : passed ? "success" : "danger";
  const showToad = !answersPending && result.total > 0;
  const toad = toadFor(result.score);

  return (
    <Modal onClose={onReview}>
      {showToad && <ResultToad key={toad.mood} mood={toad.mood} say={toad.say} />}
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

      {!answersPending && topicSummary && <TopicBreakdown summary={topicSummary} />}

      {!answersPending && <ResultUpgradeCard wrong={result.wrong} />}

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

// Kết quả theo chủ đề của chính bài vừa làm. Chủ đề yếu nhất đứng đầu và được nhấn mạnh; gói thường chỉ thấy chủ đề này.
function TopicBreakdown({ summary }: { summary: Exclude<TopicSummary, null> }) {
  if (summary === "loading") {
    return (
      <p className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-500">
        <Loader2 size={14} className="animate-spin" /> Đang phân tích theo chủ đề…
      </p>
    );
  }
  const { topics, hidden } = summary;
  return (
    <section className="mt-5 rounded-xl border border-slate-200 p-4" aria-label="Kết quả theo chủ đề">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Target size={16} className="text-brand-700" /> Kết quả theo chủ đề
      </h3>
      <ul className="mt-3 space-y-3">
        {topics.map((t, i) => {
          const rate = t.total ? t.correct / t.total : 0;
          const weak = i === 0 && rate < 0.75;
          return (
            <li key={t.topic}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-slate-800">
                  {t.topic}
                  {weak && <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">Cần ôn</span>}
                </span>
                <span className="shrink-0 tabular-nums text-xs text-slate-500">
                  {t.correct}/{t.total} câu
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden>
                <div className={`h-full rounded-full ${rate < 0.5 ? "bg-rose-500" : rate < 0.75 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.max(4, rate * 100)}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
      {hidden > 0 && (
        <p className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <span>Còn {hidden} chủ đề nữa trong bài này.</span>
          <Link to="/pro" className="inline-flex items-center gap-1 font-semibold text-brand-800 hover:underline">
            <Crown size={12} className="text-[#f0a800]" /> Xem đủ với Pro
          </Link>
        </p>
      )}
    </section>
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
