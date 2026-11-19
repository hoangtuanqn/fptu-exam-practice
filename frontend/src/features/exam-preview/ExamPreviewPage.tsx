import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BookOpen, FileSearch, Timer, X } from "lucide-react";
import { examImportApi } from "@/features/exam-import/exam-import.api";
import { canPractice, type ExamAttachment, type ExamQuestionsPayload, type ImportedExam } from "@/features/exam-import/types";
import { downloadUrl, ICONS, OPENABLE } from "@/features/exam-attachments/AttachmentList";
import { ExamKindBadge } from "@/features/exam-store/ExamKindBadge";
import { NewExamBadge } from "@/features/exam-store/NewExamBadge";
import { LoadingMoreBanner } from "@/features/practice/components/quiz/LoadingMoreBanner";
import { useExamAttachmentsLive } from "@/features/practice/hooks/useExamAttachmentsLive";
import { useExamQuestionsLive } from "@/features/practice/hooks/useExamQuestionsLive";
import type { Question } from "@/features/practice/types";
import { ApiError } from "@/shared/api/client";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { SiteHeader } from "@/shared/layout/SiteHeader";
import { Button, buttonClass } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Empty } from "@/shared/ui/Feedback";
import { Modal } from "@/shared/ui/Modal";
import { QueryBoundary } from "@/shared/ui/QueryBoundary";
import { isUuid } from "@/shared/utils/uuid";

const TILE = "md-state group relative block aspect-[4/3] overflow-hidden rounded-m3-md bg-surface-container-lowest shadow-m3-1 outline-none focus-visible:ring-2 focus-visible:ring-primary";
const CAPTION = "md-label-large absolute inset-x-0 bottom-0 truncate bg-inverse-surface/70 px-3 py-2 text-left text-inverse-on-surface";

// Trang xem trước đề (/exam/:examId/preview): các trang ảnh và tệp đính kèm dạng lưới, nút Luyện đề / Thi nếu đề làm được trên web
export default function ExamPreviewPage() {
  const examId = useParams().examId ?? "";
  const valid = isUuid(examId);
  // 404 = đề không có trong kho của người xem
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
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-6">
        <QueryBoundary query={query} loadingLabel="Đang mở đề…">
          {({ exam }) =>
            exam ? (
              <Preview key={exam.id} exam={exam} />
            ) : (
              <Card>
                <Empty icon={FileSearch} title="Không tìm thấy đề trong kho của bạn">
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    <Link to="/account/exams" className={buttonClass({ size: "sm" })}>
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

function Preview({ exam }: { exam: ImportedExam }) {
  const toast = useToast();
  const [questions, setQuestions] = useState<Question[]>(exam.questions ?? []);
  const [total, setTotal] = useState(exam.totalQuestions ?? 0);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState<Question | null>(null);
  const fetching = !failed && questions.length < total;
  const attachments = useExamAttachmentsLive(exam.id, exam.attachments);
  const kind = exam.kind ?? "FE";
  const term = exam.title.match(/\b(?:SP|SU|FA)\d{2}\b/i)?.[0].toUpperCase() ?? null;
  const items = questions.filter((q) => !q.isReference).length;
  const playable = canPractice(kind, total);

  // Đề vừa lấy về có thể còn đang tải ảnh: các trang mới hiện dần
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

  const meta = [term && `Kỳ ${term}`, items > 0 && `${items} câu`, attachments.length > 0 && `${attachments.length} tệp đính kèm`].filter(Boolean).join(" · ");
  // Ảnh các trang và tệp đính kèm nằm chung một lưới như bên FuOverflow (đề PE: tài liệu lên trước); tên hiển thị là tên tệp
  const pageTiles = questions.map((q) => (
    <li key={`p${q.number}`}>
      <button type="button" onClick={() => setZoom(q)} aria-label={`Xem lớn ${fileName(q)}`} className={`${TILE} w-full`}>
        <img src={q.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover object-top" />
        <span className={CAPTION}>{fileName(q)}</span>
      </button>
    </li>
  ));
  const fileTiles = attachments.map((a) => (
    <li key={`a${a.id}`}>
      <FileTile a={a} />
    </li>
  ));
  const tiles = kind === "PE" ? [...fileTiles, ...pageTiles] : [...pageTiles, ...fileTiles];

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <ExamKindBadge kind={kind} />
            <NewExamBadge term={term} />
          </div>
          <h1 className="md-headline-small mt-2 break-words text-on-surface">{exam.title}</h1>
          {meta && <p className="md-body-medium mt-1 text-on-surface-variant">{meta}</p>}
        </div>
        {playable && (
          <div className="flex flex-wrap gap-2">
            <Link to={`/exam/${exam.id}?mode=practice`} className={buttonClass({ variant: "tonal" })}>
              <BookOpen size={16} /> Luyện đề
            </Link>
            <Link to={`/exam/${exam.id}?start=exam`} className={buttonClass({ variant: "filled" })}>
              <Timer size={16} /> Thi
            </Link>
          </div>
        )}
      </div>

      {fetching && <LoadingMoreBanner loaded={questions.length} total={total} />}

      {tiles.length > 0 && (
        <section className="mb-6">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{tiles}</ul>
          {items > 0 && kind !== "PE" && (
            <Link to={`/exam/${exam.id}/view`} className={buttonClass({ variant: "text", className: "mt-3" })}>
              Xem từng câu kèm đáp án
            </Link>
          )}
        </section>
      )}
      {questions.length === 0 && attachments.length === 0 && !fetching && (
        <Card>
          <Empty icon={FileSearch} title="Đề này chưa có trang nào" />
        </Card>
      )}

      {zoom && (
        <Modal wide onClose={() => setZoom(null)}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="md-title-medium truncate text-on-surface">{fileName(zoom)}</h2>
            <Button variant="text" onClick={() => setZoom(null)} aria-label="Đóng">
              <X size={18} />
            </Button>
          </div>
          <img src={zoom.imageUrl} alt={`Ảnh ${fileName(zoom)} của đề`} className="h-auto w-full rounded-m3-md bg-surface-container-lowest" />
        </Modal>
      )}
    </>
  );
}

// Tên tệp ảnh của trang (phần cuối đường dẫn, bỏ query), hiện như bên FuOverflow
const fileName = (q: Question) => decodeURIComponent(q.imageUrl.split("?")[0]!.split("/").pop() ?? `Q${q.number}`);

// Máy có chuột mới nhúng PDF làm hình xem trước: điện thoại thường không vẽ PDF trong khung, nên chỉ hiện biểu tượng và mở tab mới
const canEmbedPdf = () => typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches;
const pdfSrc = (url: string, bar: boolean) => `${url}#${bar ? "" : "toolbar=0&navpanes=0&"}view=FitH`;

// Tệp đính kèm: PDF hiện luôn trang đầu (bấm để xem lớn); loại khác là biểu tượng lớn trên nền nhạt, mở được thì mở tab mới, không thì tải về
function FileTile({ a }: { a: ExamAttachment }) {
  const [big, setBig] = useState(false);
  const Icon = ICONS[a.kind] ?? ICONS.other;
  const open = OPENABLE.has(a.kind);
  if (a.kind === "pdf" && canEmbedPdf()) {
    return (
      <>
        <button type="button" onClick={() => setBig(true)} aria-label={`Xem lớn ${a.name}`} title={a.name} className={`${TILE} w-full bg-surface-container-lowest`}>
          <iframe src={pdfSrc(a.url, false)} title={a.name} loading="lazy" tabIndex={-1} className="pointer-events-none h-full w-full border-0" />
          <span className={CAPTION}>{a.name}</span>
        </button>
        {big && (
          <Modal wide onClose={() => setBig(false)}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="md-title-medium truncate text-on-surface">{a.name}</h2>
              <div className="flex shrink-0 gap-1">
                <a href={a.url} target="_blank" rel="noopener noreferrer" className={buttonClass({ size: "sm", variant: "text" })}>
                  Mở tab mới
                </a>
                <Button variant="text" onClick={() => setBig(false)} aria-label="Đóng">
                  <X size={18} />
                </Button>
              </div>
            </div>
            <iframe src={pdfSrc(a.url, true)} title={a.name} className="h-[75vh] w-full rounded-m3-md border-0 bg-surface-container-lowest" />
          </Modal>
        )}
      </>
    );
  }
  return (
    <a
      href={open ? a.url : downloadUrl(a.url)}
      {...(open ? { target: "_blank", rel: "noopener noreferrer" } : { download: a.name })}
      aria-label={`${open ? "Mở" : "Tải về"} ${a.name}`}
      title={a.name}
      className={`${TILE} bg-primary-container/40`}
    >
      <span className="flex h-full items-center justify-center pb-8">
        <Icon size={72} strokeWidth={1.5} className="text-primary" aria-hidden />
      </span>
      <span className={CAPTION}>{a.name}</span>
    </a>
  );
}
