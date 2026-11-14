import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { FileSearch, Play } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { examImportApi } from "@/features/exam-import/exam-import.api";
import { isFilesOnly, type ExamQuestionsPayload, type ImportedExam } from "@/features/exam-import/types";
import { AttachmentList } from "@/features/exam-attachments/AttachmentList";
import { LoadingMoreBanner } from "@/features/practice/components/quiz/LoadingMoreBanner";
import { useExamQuestionsLive } from "@/features/practice/hooks/useExamQuestionsLive";
import type { Question } from "@/features/practice/types";
import { savedApi } from "@/features/saved/saved.api";
import { ApiError } from "@/shared/api/client";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { SiteHeader } from "@/shared/layout/SiteHeader";
import { buttonClass } from "@/shared/ui/Button";
import { Card, PageHeader } from "@/shared/ui/Card";
import { Empty } from "@/shared/ui/Feedback";
import { QueryBoundary } from "@/shared/ui/QueryBoundary";
import { Switch } from "@/shared/ui/Switch";
import { JumpNav } from "./JumpNav";
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

// Trang xem đề chỉ đọc (/exam/:threadId/view): cả đề một cột, đáp án, lưu câu; muốn làm thì bấm "Làm bài ngay"
export default function ExamViewPage() {
  const threadId = useParams().threadId ?? "";
  const valid = /^\d{1,18}$/.test(threadId);
  // 404 = đề không có trong kho của người xem: exam null để hiện "không tìm thấy" thay vì lỗi
  const query = useApi(async () => {
    if (!valid) return { exam: null };
    try {
      return { exam: await examImportApi.examByThread(threadId) };
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return { exam: null };
      throw err;
    }
  }, [threadId, valid]);

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-24 pt-6">
        <QueryBoundary query={query} loadingLabel="Đang mở đề…">
          {({ exam }) =>
            exam ? (
              <ExamView key={exam.id} exam={exam} />
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

function ExamView({ exam }: { exam: ImportedExam }) {
  const { user } = useAuth();
  const toast = useToast();
  const [params] = useSearchParams();
  const [questions, setQuestions] = useState<Question[]>(exam.questions ?? []);
  const [total, setTotal] = useState(exam.totalQuestions ?? 0);
  const [failed, setFailed] = useState(false);
  const [show, setShow] = useState(readShow);
  const [highlight, setHighlight] = useState<number | null>(null);
  const [savedChanged, setSavedChanged] = useState<Record<number, boolean>>({});

  const hasAnswers = exam.answerStatus === "AI" || exam.answerStatus === "MANUAL";
  const fetching = !failed && questions.length < total;
  const references = questions.filter((q) => q.isReference);
  const items = questions.filter((q) => !q.isReference);
  const attachments = exam.attachments ?? [];
  const filesOnly = isFilesOnly(exam);

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

  return (
    <>
      <PageHeader
        title={exam.title}
        description={filesOnly ? `${attachments.length} tệp đính kèm` : `${fetching ? total : items.length} câu`}
        action={
          filesOnly ? undefined : (
            <div className="flex flex-wrap items-center gap-4">
              {hasAnswers ? (
                <label className="md-label-large flex items-center gap-3 text-on-surface">
                  <Switch checked={show} onChange={changeShow} label="Hiện đáp án" />
                  Hiện đáp án
                </label>
              ) : (
                <span className="md-body-medium text-on-surface-variant">Đề này chưa có đáp án</span>
              )}
              <Link to={`/exam/${exam.threadId}`} className={buttonClass({ variant: "filled" })}>
                <Play size={16} /> Làm bài ngay
              </Link>
            </div>
          )
        }
      />

      {attachments.length > 0 && (
        <section className="mb-4 space-y-2">
          <h2 className="md-title-medium text-on-surface">Tệp đính kèm của đề</h2>
          {filesOnly && (
            <p className="md-body-medium text-on-surface-variant">Đề này chỉ có tệp đính kèm, không có câu hỏi để làm trên web. Mở hoặc tải tệp bên dưới.</p>
          )}
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
          />
        ))}
      </ul>
    </>
  );
}
