import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, PartyPopper, X } from "lucide-react";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { Button, buttonClass } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Empty, ErrorBox, LinearProgress, Loading } from "@/shared/ui/Feedback";
import { dueText, reviewApi, type ReviewAnswerResult } from "./review.api";

// Ảnh câu hỏi không cho biết số đáp án, nên luôn hiện A–F (đề FE hiếm khi có hơn 6 lựa chọn)
const LETTERS = ["A", "B", "C", "D", "E", "F"];

// Một lượt ôn: lần lượt từng câu trong sổ (tối đa 20). Chọn đáp án là có kết quả ngay (câu một đáp án); câu nhiều đáp án thì chọn đủ rồi bấm Kiểm tra.
// Phím tắt: A–F chọn đáp án, Enter = Kiểm tra / Câu tiếp. Chấm ở máy chủ theo đáp án hiện tại, rồi xếp lịch ôn kế tiếp.
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
  const nextRef = useRef<HTMLButtonElement>(null);

  const items = queue.data ?? [];
  const q = items[index];
  const multiple = !!q && q.correct.length > 1;

  const submit = (chosen: string[]) => {
    if (!q || checking || result || chosen.length === 0) return;
    setChecking(true);
    reviewApi
      .answer(q.id, chosen)
      .then((r) => {
        setResult(r);
        if (r.correct) setRight((n) => n + 1);
      })
      .catch((err: unknown) => toast.error(errorMessage(err, "Chưa chấm được câu này, bạn thử lại nhé")))
      .finally(() => setChecking(false));
  };
  const choose = (opt: string) => {
    if (result || checking) return;
    if (multiple) setSelected((cur) => (cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt]));
    else {
      setSelected([opt]);
      submit([opt]); // câu một đáp án: chọn là chấm luôn
    }
  };
  const next = () => {
    setSelected([]);
    setResult(null);
    setIndex((i) => i + 1);
  };
  const restart = () => {
    setIndex(0);
    setSelected([]);
    setResult(null);
    setRight(0);
    setRound((r) => r + 1);
  };

  // Có kết quả thì đưa tiêu điểm tới nút "Câu tiếp" để Enter/Space đi tiếp ngay
  useEffect(() => {
    if (result) nextRef.current?.focus();
  }, [result]);

  // Phím tắt (bỏ qua khi đang gõ ở ô nhập hoặc có tổ hợp phím hệ thống)
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => undefined);
  keyRef.current = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || !q) return;
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    const k = e.key.toUpperCase();
    if (!result && LETTERS.includes(k)) {
      e.preventDefault();
      choose(k);
    } else if (e.key === "Enter") {
      if (result) return; // nút "Câu tiếp" đang giữ tiêu điểm, Enter kích hoạt nó
      if (multiple && selected.length > 0) {
        e.preventDefault();
        submit(selected);
      }
    }
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  if (queue.loading && !queue.data) return <Loading label="Đang chuẩn bị câu ôn…" />;
  if (queue.error) return <ErrorBox message={queue.error} onRetry={queue.reload} />;

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

  if (!q) {
    const pct = Math.round((right / items.length) * 100);
    return (
      <Card>
        <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-success-container text-on-success-container">
            <PartyPopper size={30} />
          </span>
          <h1 className="md-headline-small text-on-surface">Xong lượt ôn!</h1>
          <p className="md-display-small tabular-nums text-on-surface">
            {right}/{items.length} <span className="md-title-medium text-on-surface-variant">câu đúng ({pct}%)</span>
          </p>
          <p className="md-body-large max-w-md text-on-surface-variant">Câu đúng sẽ được hỏi lại sau lâu hơn, câu sai quay lại vào ngày mai.</p>
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

  const stateOf = (opt: string) => {
    const isSel = selected.includes(opt);
    if (result) {
      if (result.correctAnswers.includes(opt)) return { cls: "border-success bg-success-container text-on-success-container", mark: "right" as const };
      if (isSel) return { cls: "border-error bg-error-container text-on-error-container", mark: "wrong" as const };
      return { cls: "border-outline-variant text-on-surface/38", mark: null };
    }
    return { cls: isSel ? "border-transparent bg-secondary-container text-on-secondary-container" : "border-outline text-on-surface", mark: null };
  };

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Link to="/account/review" className={buttonClass({ variant: "text", size: "sm" })}>
          <ArrowLeft size={16} /> Thoát
        </Link>
        <p className="md-label-large tabular-nums text-on-surface-variant">
          Câu {index + 1}/{items.length} · đúng {right}
        </p>
      </div>
      <LinearProgress value={(index + (result ? 1 : 0)) / items.length} label="Tiến độ lượt ôn" />

      <Card>
        <p className="md-label-large truncate border-b border-outline-variant px-5 py-2.5 text-on-surface-variant">
          Câu {q.number} · {q.examTitle}
        </p>
        <a href={q.imageUrl} target="_blank" rel="noreferrer" title="Mở ảnh lớn" className="block bg-surface-container-lowest p-3">
          <img src={q.imageUrl} alt={`Câu ${q.number}`} className="mx-auto max-h-[55vh] w-auto max-w-full object-contain" />
        </a>

        <div className="space-y-4 p-5">
          {multiple && !result && <p className="md-body-medium text-on-surface-variant">Câu này có nhiều đáp án đúng: chọn đủ rồi bấm Kiểm tra.</p>}
          <div role="group" aria-label={multiple ? "Chọn các đáp án đúng" : "Chọn một đáp án"} className="grid grid-cols-6 gap-2 sm:flex sm:flex-wrap sm:gap-3">
            {LETTERS.map((opt) => {
              const { cls, mark } = stateOf(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => choose(opt)}
                  disabled={!!result || checking}
                  aria-pressed={selected.includes(opt)}
                  aria-label={`Đáp án ${opt}${mark === "right" ? ", đúng" : mark === "wrong" ? ", sai" : ""}`}
                  className={`md-state md-motion md-title-medium relative inline-flex h-12 w-full items-center justify-center border sm:w-14 ${multiple ? "rounded-m3-md" : "rounded-full"} ${cls} disabled:cursor-default`}
                >
                  {opt}
                  {mark === "right" && <Check size={14} strokeWidth={3} className="absolute -right-1 -top-1 rounded-full bg-success p-0.5 text-on-success" />}
                  {mark === "wrong" && <X size={14} strokeWidth={3} className="absolute -right-1 -top-1 rounded-full bg-error p-0.5 text-on-error" />}
                </button>
              );
            })}
          </div>

          {result && (
            <div role="status" className={`flex items-start gap-3 rounded-m3-md px-4 py-3 ${result.correct ? "bg-success-container text-on-success-container" : "bg-error-container text-on-error-container"}`}>
              {result.correct ? <Check size={20} className="mt-0.5 shrink-0" /> : <X size={20} className="mt-0.5 shrink-0" />}
              <div className="md-body-large">
                <b>{result.correct ? (result.mastered ? "Chính xác! Câu này bạn đã thuộc." : "Chính xác!") : `Chưa đúng. Đáp án là ${result.correctAnswers.join(", ")}.`}</b>
                <span className="md-body-medium block opacity-90">{result.mastered ? "Câu này sẽ rời khỏi sổ." : result.correct ? `${dueText(result.nextReviewAt)}.` : "Câu này sẽ quay lại vào ngày mai."}</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <p className="md-body-small hidden text-on-surface-variant sm:block">Phím tắt: A–F chọn đáp án · Enter đi tiếp</p>
            <div className="ml-auto">
              {result ? (
                <button ref={nextRef} type="button" onClick={next} className={buttonClass({ variant: "primary", className: "!px-8" })}>
                  {index + 1 >= items.length ? "Xem kết quả" : "Câu tiếp"} <ArrowRight size={16} />
                </button>
              ) : multiple ? (
                <Button variant="primary" onClick={() => submit(selected)} disabled={selected.length === 0 || checking}>
                  {checking ? "Đang chấm…" : "Kiểm tra"}
                </Button>
              ) : checking ? (
                <span className="md-body-medium text-on-surface-variant">Đang chấm…</span>
              ) : null}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
