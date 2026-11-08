import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, PartyPopper, X } from "lucide-react";
import { AnswerOptions } from "@/features/practice/components/quiz/AnswerOptions";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { Button, buttonClass } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Empty, ErrorBox, LinearProgress, Loading } from "@/shared/ui/Feedback";
import { boxLabel, dueText, reviewApi, type ReviewAnswerResult } from "./review.api";

// Một lượt ôn: lần lượt từng câu trong sổ (tối đa 20). Chấm ở máy chủ theo đáp án hiện tại, rồi xếp lịch ôn kế tiếp.
export default function ReviewPracticePage() {
  const toast = useToast();
  const [params] = useSearchParams();
  const subject = params.get("subject");
  const topic = params.get("topic");
  const byTopic = subject && topic ? { subject, topic } : undefined; // ôn riêng một chủ đề (Pro)
  const all = params.get("all") === "1" || !!byTopic;
  const [round, setRound] = useState(0); // đổi để nạp lượt mới
  const queue = useApi(() => reviewApi.queue(all, byTopic), [all, subject, topic, round]);

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<ReviewAnswerResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [right, setRight] = useState(0);

  const restart = () => {
    setIndex(0);
    setSelected([]);
    setResult(null);
    setRight(0);
    setRound((r) => r + 1);
  };

  if (queue.loading && !queue.data) return <Loading label="Đang chuẩn bị câu ôn…" />;
  if (queue.error) return <ErrorBox message={queue.error} onRetry={queue.reload} />;
  const items = queue.data ?? [];

  if (items.length === 0) {
    return (
      <Empty icon={PartyPopper} title={byTopic ? "Không có câu sai nào ở chủ đề này" : all ? "Sổ câu sai đang trống" : "Hôm nay không còn câu nào cần ôn"}>
        <p>{byTopic ? `Bạn chưa có câu sai nào về “${byTopic.topic}” trong sổ. Làm thêm đề của môn ${byTopic.subject} để có thêm câu luyện.` : all ? "Làm đề rồi nộp bài, câu sai sẽ tự vào sổ." : "Quay lại vào ngày mai nhé, hoặc ôn thêm cả những câu chưa đến hạn."}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link to="/account/review" className={buttonClass()}>
            <ArrowLeft size={16} /> Về Sổ câu sai
          </Link>
          {!all && (
            <Link to="/account/review/practice?all=1" className={buttonClass({ variant: "primary" })}>
              Ôn thêm
            </Link>
          )}
        </div>
      </Empty>
    );
  }

  const finished = index >= items.length;
  if (finished) {
    return (
      <Card>
        <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-success-container text-on-success-container">
            <PartyPopper size={30} />
          </span>
          <h1 className="md-headline-small text-on-surface">Xong lượt ôn!</h1>
          <p className="md-body-large text-on-surface-variant">
            Bạn trả lời đúng <b className="text-on-surface">{right}</b> / {items.length} câu. Câu đúng được ôn lại sau lâu hơn, câu sai sẽ quay lại vào ngày mai.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <Link to="/account/review" className={buttonClass()}>
              Về Sổ câu sai
            </Link>
            <Button variant="primary" onClick={restart}>
              Ôn tiếp
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  const q = items[index]!;
  const question = { number: q.number, imageUrl: q.imageUrl, correct: q.correct };
  const multiple = q.correct.length > 1;

  const choose = (opt: string) => {
    if (result) return;
    setSelected((cur) => (multiple ? (cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt]) : [opt]));
  };
  const check = () => {
    if (selected.length === 0 || checking) return;
    setChecking(true);
    reviewApi
      .answer(q.id, selected)
      .then((r) => {
        setResult(r);
        if (r.correct) setRight((n) => n + 1);
      })
      .catch((err: unknown) => toast.error(errorMessage(err, "Chưa chấm được câu này, bạn thử lại nhé")))
      .finally(() => setChecking(false));
  };
  const next = () => {
    setSelected([]);
    setResult(null);
    setIndex((i) => i + 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Link to="/account/review" className={buttonClass({ variant: "text", size: "sm" })}>
          <ArrowLeft size={16} /> Thoát
        </Link>
        <p className="md-label-large text-on-surface-variant">
          Câu {index + 1} / {items.length}
        </p>
      </div>
      <LinearProgress value={(index + (result ? 1 : 0)) / items.length} label="Tiến độ lượt ôn" />

      <Card>
        <div className="border-b border-outline-variant px-5 py-3">
          <p className="md-title-small truncate text-on-surface">
            Câu {q.number} · {q.examTitle}
          </p>
          <p className="md-body-small mt-0.5 text-on-surface-variant">
            {boxLabel(q.box)}
            {q.wrongCount > 0 ? ` · từng sai ${q.wrongCount} lần` : ""}
            {multiple ? " · chọn tất cả đáp án đúng" : ""}
          </p>
        </div>
        <a href={q.imageUrl} target="_blank" rel="noreferrer" title="Mở ảnh lớn" className="block bg-surface-container-lowest p-3">
          <img src={q.imageUrl} alt={`Câu ${q.number}`} className="mx-auto max-h-[60vh] w-auto max-w-full object-contain" />
        </a>
        <div className="space-y-4 p-5">
          <AnswerOptions question={question} selected={selected} revealed={!!result} onChoose={choose} />

          {result && (
            <div
              role="status"
              className={`flex items-start gap-3 rounded-m3-md px-4 py-3 ${result.correct ? "bg-success-container text-on-success-container" : "bg-error-container text-on-error-container"}`}
            >
              {result.correct ? <Check size={20} className="mt-0.5 shrink-0" /> : <X size={20} className="mt-0.5 shrink-0" />}
              <div className="md-body-medium">
                <b>{result.correct ? (result.mastered ? "Chính xác, câu này đã thuộc!" : "Chính xác!") : `Chưa đúng. Đáp án là ${result.correctAnswers.join(", ")}.`}</b>{" "}
                {result.mastered ? "Câu này tốt nghiệp khỏi sổ." : `${dueText(result.nextReviewAt)} (${boxLabel(result.box).toLowerCase()}).`}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            {result ? (
              <Button variant="primary" onClick={next}>
                {index + 1 >= items.length ? "Xem kết quả" : "Câu tiếp"} <ArrowRight size={16} />
              </Button>
            ) : (
              <Button variant="primary" onClick={check} disabled={selected.length === 0 || checking}>
                {checking ? "Đang chấm…" : "Kiểm tra"}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
