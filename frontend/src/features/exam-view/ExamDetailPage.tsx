import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { FileSearch } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { examImportApi } from "@/features/exam-import/exam-import.api";
import { ExamKindBadge } from "@/features/exam-import/components/ExamKindBadge";
import { examKind, isFilesOnly, type ExamAnswersPayload, type ExamQuestionsPayload, type ImportedExam } from "@/features/exam-import/types";
import { AttachmentList } from "@/features/exam-attachments/AttachmentList";
import { MODES } from "@/features/practice/config/modes";
import { AnswerPendingBanner } from "@/features/practice/components/quiz/AnswerPendingBanner";
import { LoadingMoreBanner } from "@/features/practice/components/quiz/LoadingMoreBanner";
import { useExamAnswersLive } from "@/features/practice/hooks/useExamAnswersLive";
import { useExamQuestionsLive } from "@/features/practice/hooks/useExamQuestionsLive";
import type { AnswerSource, Question } from "@/features/practice/types";
import { savedApi } from "@/features/saved/saved.api";
import { ApiError } from "@/shared/api/client";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { SiteHeader } from "@/shared/layout/SiteHeader";
import { Button, buttonClass } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { ExpandableText } from "@/shared/ui/ExpandableText";
import { Empty } from "@/shared/ui/Feedback";
import { QueryBoundary } from "@/shared/ui/QueryBoundary";
import { Switch } from "@/shared/ui/Switch";
import { formatDate } from "@/shared/utils/formatters";
import { isUuid } from "@/shared/utils/uuid";
import { ExamTimeDialog } from "./ExamTimeDialog";
import { JumpNav } from "./JumpNav";
import { QuestionLightbox } from "./QuestionLightbox";
import { ViewQuestionCard } from "./ViewQuestionCard";

const SHOW_KEY = "exam_view_show_answers";
const HIGHLIGHT_MS = 3000;

const readShow = () => {
  try {
    return localStorage.getItem(SHOW_KEY) !== "0";
  } catch {
    return true;
  }
};

// Trang chi tiết đề (/exam/:examId): thông tin đề, mô tả, tệp đính kèm, cả đề một cột kèm đáp án, lưu câu; bấm "Luyện tập" hoặc "Thi" để làm bài
export default function ExamDetailPage() {
  const examId = useParams().examId ?? "";
  const valid = isUuid(examId);
  // 404 = đề không có trong kho của người xem: exam null để hiện "không tìm thấy" thay vì lỗi
  const query = useApi(async () => {
    if (!valid) return { exam: null };
    try {
      return { exam: await examImportApi.exam(examId) };
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return { exam: null };
      throw err;
    }
  }, [examId, valid]);

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-24 pt-6">
        <QueryBoundary query={query} loadingLabel="Đang mở đề…">
          {({ exam }) =>
            exam ? (
              <ExamDetail key={exam.id} exam={exam} />
            ) : (
              <Card>
                <Empty icon={FileSearch} title="Không tìm thấy đề trong kho của bạn">
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    <Link to="/" className={buttonClass({ size: "sm" })}>
                      Về trang chủ
                    </Link>
                    <Link to="/account/exams" className={buttonClass({ size: "sm", variant: "text" })}>
                      Kho đề
                    </Link>
                  </div>
                </Empty>
              </Card>
            )
          }
        </QueryBoundary>
      </main>
    </div>
  );
}

function ExamDetail({ exam }: { exam: ImportedExam }) {
  const { user } = useAuth();
  const toast = useToast();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>(exam.questions ?? []);
  const [total, setTotal] = useState(exam.totalQuestions ?? 0);
  const [status, setStatus] = useState<AnswerSource>(exam.answerStatus);
  const [failed, setFailed] = useState(false);
  const [show, setShow] = useState(readShow);
  const [highlight, setHighlight] = useState<number | null>(null);
  const [lightbox, setLightbox] = useState<number | null>(null); // số câu đang xem lớn
  const [timeAsk, setTimeAsk] = useState(false); // hộp chọn thời gian trước khi thi
  const closeTimeAsk = useCallback(() => setTimeAsk(false), []); // ổn định để Modal không giành lại tiêu điểm mỗi lần vẽ lại
  const [savedChanged, setSavedChanged] = useState<Record<number, boolean>>({});

  const hasAnswers = status === "AI" || status === "MANUAL";
  const fetching = !failed && questions.length < total;
  const references = questions.filter((q) => q.isReference);
  const items = questions.filter((q) => !q.isReference);
  const attachments = exam.attachments ?? [];
  const filesOnly = isFilesOnly(exam);
  const hasQuestions = total > 0 || items.length > 0;

  useExamQuestionsLive(
    exam.id,
    fetching,
    (p: ExamQuestionsPayload) => {
      setTotal(p.total);
      setQuestions((prev) => {
        const have = new Set(prev.map((q) => q.number));
        const fresh = p.questions.filter((q) => !have.has(q.number));
        return fresh.length === 0 ? prev : [...prev, ...fresh].sort((a, b) => a.number - b.number);
      });
    },
    (message) => {
      setFailed(true);
      toast.error(`Lấy đề thất bại: ${message}`);
    },
  );

  // AI đang phân tích đáp án: có kết quả thì gắn đáp án, chủ đề vào các câu (tài liệu tham khảo tách khỏi danh sách câu)
  useExamAnswersLive(exam.id, hasQuestions && status === "PENDING", (r: ExamAnswersPayload) => {
    if (r.status === "PENDING") return;
    if (r.status === "FAILED" || r.status === "DEFAULT") return setStatus("FAILED");
    const byNumber = new Map(r.answers.map((a) => [a.number, a]));
    const refs = new Set(r.references ?? []);
    setQuestions((prev) => prev.map((q) => ({ ...q, correct: byNumber.get(q.number)?.correct ?? q.correct, topic: byNumber.get(q.number)?.topic ?? q.topic, isReference: q.isReference || refs.has(q.number) })));
    setStatus(r.status);
    toast.success("Đáp án đã sẵn sàng, bạn có thể làm bài");
  });

  const savedOfExam = useApi(() => (user ? savedApi.ofExam(exam.id) : Promise.resolve(null)), [user?.id, exam.id]);
  const isSaved = (n: number) => savedChanged[n] ?? (Array.isArray(savedOfExam.data) && savedOfExam.data.includes(n));
  const saving = useRef(new Set<number>()); // câu đang chờ máy chủ: bỏ qua lần bấm tiếp theo
  const toggleSave = async (n: number) => {
    if (saving.current.has(n)) return;
    saving.current.add(n);
    const next = !isSaved(n);
    try {
      await (next ? savedApi.save(exam.id, n) : savedApi.remove(exam.id, n));
      setSavedChanged((prev) => ({ ...prev, [n]: next }));
      toast.success(next ? `Đã lưu câu ${n}` : `Đã bỏ lưu câu ${n}`);
    } catch (err) {
      toast.error(errorMessage(err, next ? "Chưa lưu được câu này" : "Chưa bỏ lưu được câu này"));
    } finally {
      saving.current.delete(n);
    }
  };

  const changeShow = (v: boolean) => {
    setShow(v);
    try {
      localStorage.setItem(SHOW_KEY, v ? "1" : "0");
    } catch {
      // trình duyệt chặn lưu trữ: chỉ nhớ trong lần xem này
    }
  };

  const jump = (n: number) => document.getElementById(`q-${n}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  // Đóng cửa sổ xem lớn: cuộn tới câu xem cuối cùng và đặt focus vào ảnh của câu đó (sau khi cửa sổ đã trả focus)
  const closeLightbox = () => {
    const n = lightbox;
    setLightbox(null);
    if (n === null) return;
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(`#q-${n} [data-lightbox-open]`)?.focus({ preventScroll: true });
      jump(n);
    });
  };

  // ?q=N: cuộn tới câu N một lần và làm nổi bật vài giây; số không hợp lệ hoặc không có trong đề thì bỏ qua
  const target = Number(params.get("q"));
  const scrolled = useRef(false);
  useEffect(() => {
    if (scrolled.current || !Number.isInteger(target) || !items.some((q) => q.number === target)) return;
    scrolled.current = true;
    document.getElementById(`q-${target}`)?.scrollIntoView({ block: "start" });
    setHighlight(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ cần chạy lại khi có thêm câu (câu N có thể về sau)
  }, [items.length]);
  useEffect(() => {
    if (highlight === null) return;
    const t = setTimeout(() => setHighlight(null), HIGHLIGHT_MS);
    return () => clearTimeout(t);
  }, [highlight]);

  const kind = examKind(exam);
  const lockedReason = hasAnswers ? null : status === "PENDING" ? "Mở khi đáp án sẵn sàng" : "Đề chưa có đáp án";

  return (
    <>
      <header className="mb-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <ExamKindBadge kind={kind} />
          {exam.subjectCode && (
            <Link to={`/kho-de?subject=${encodeURIComponent(exam.subjectCode)}`} className="md-label-large text-primary hover:underline">
              {exam.subjectCode}
            </Link>
          )}
          {exam.postedAt && <span className="md-body-small text-on-surface-variant">Đăng ngày {formatDate(exam.postedAt)}</span>}
        </div>
        <h1 className="md-headline-small mt-2 break-words text-on-surface">{exam.title}</h1>
        <p className="md-body-medium mt-1 text-on-surface-variant">
          {[hasQuestions && `${fetching ? total : items.length} câu`, attachments.length > 0 && `${attachments.length} tệp đính kèm`].filter(Boolean).join(" · ")}
        </p>
      </header>

      {hasQuestions && (
        <>
          {/* Điện thoại: hai nút làm bài dính dưới thanh trên cùng khi cuộn qua các câu */}
          <div className="sticky top-16 z-20 -mx-4 mb-3 flex flex-wrap items-center gap-2 border-b border-outline-variant bg-surface/95 px-4 py-2 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
            {MODES.map(({ value, label, Icon }) => {
              const variant = value === "practice" ? "filled" : "tonal";
              return lockedReason ? (
                <Button key={value} variant={variant} disabled>
                  <Icon size={16} /> {label}
                </Button>
              ) : value === "exam" ? (
                <Button key={value} variant={variant} onClick={() => setTimeAsk(true)}>
                  <Icon size={16} /> {label}
                </Button>
              ) : (
                <Link key={value} to={`/exam/${exam.id}/practice?mode=${value}`} className={buttonClass({ variant })}>
                  <Icon size={16} /> {label}
                </Link>
              );
            })}
            {lockedReason && <span className="md-body-small text-on-surface-variant">{lockedReason}</span>}
          </div>
          <AnswerPendingBanner source={status} examId={exam.id} onRetry={() => setStatus("PENDING")} />
          {hasAnswers && (
            <label className="md-label-large mb-3 flex items-center gap-3 text-on-surface">
              <Switch checked={show} onChange={changeShow} label="Hiện đáp án" />
              Hiện đáp án
            </label>
          )}
        </>
      )}

      {exam.description && (
        <Card className="mb-4 p-4">
          <ExpandableText text={exam.description} lines={6} className="md-body-medium text-on-surface" />
        </Card>
      )}

      {attachments.length > 0 && (
        <section className="mb-4 space-y-2">
          <h2 className="md-title-medium text-on-surface">Tệp đính kèm</h2>
          {filesOnly && <p className="md-body-medium text-on-surface-variant">Đề này chỉ có tệp đính kèm, không có câu hỏi để làm trên web. Xem hoặc tải tệp bên dưới.</p>}
          <AttachmentList attachments={attachments} />
        </section>
      )}

      {fetching && <LoadingMoreBanner loaded={questions.length} total={total} />}

      <JumpNav numbers={items.map((q) => q.number)} onJump={jump} />

      {references.length > 0 && (
        <section className="mt-4 space-y-3">
          <h2 className="md-title-medium text-on-surface">Tài liệu tham khảo</h2>
          {references.map((r) => (
            <Card key={r.number} className="overflow-hidden">
              <img src={r.imageUrl} alt={`Tài liệu tham khảo ${r.number}`} loading="lazy" className="h-auto w-full bg-surface-container-lowest" />
            </Card>
          ))}
        </section>
      )}

      <ul className="mt-4 space-y-4">
        {items.map((q) => (
          <ViewQuestionCard
            key={q.number}
            q={q}
            showAnswer={hasAnswers && show}
            highlighted={highlight === q.number}
            saved={isSaved(q.number)}
            onToggleSave={user ? () => void toggleSave(q.number) : undefined}
            onOpen={() => setLightbox(q.number)}
          />
        ))}
      </ul>

      {lightbox !== null && items.some((q) => q.number === lightbox) && (
        <QuestionLightbox questions={items} current={lightbox} onCurrentChange={setLightbox} onClose={closeLightbox} showAnswer={hasAnswers && show} />
      )}
      {timeAsk && <ExamTimeDialog onCancel={closeTimeAsk} onStart={(m) => navigate(`/exam/${exam.id}/practice?mode=exam${m > 0 ? `&limit=${m}` : ""}`)} />}
    </>
  );
}
