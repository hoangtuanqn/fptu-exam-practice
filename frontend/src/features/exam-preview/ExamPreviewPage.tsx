import { ProtectedImg } from "@/shared/ui/ProtectedImg";
import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { BookOpen, Download, FileSearch, Loader2, FileArchive, MessageSquare, Timer, ZoomIn } from "lucide-react";
import { examApi } from "@/features/exam/exam.api";
import { canPractice, type ExamAttachment, type ExamQuestionsPayload, type ImportedExam } from "@/features/exam/types";
import { downloadUrl, ICONS, isImageFile, OPENABLE } from "@/features/exam-attachments/AttachmentList";
import { CommentCountButton, CommentsDialog } from "@/features/exam-comments/CommentsDialog";
import { attachmentTarget } from "@/features/exam-comments/exam-comments.api";
import { useCommentCounts } from "@/features/exam-comments/useCommentCounts";
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
import { buttonClass } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Empty } from "@/shared/ui/Feedback";
import { QueryBoundary } from "@/shared/ui/QueryBoundary";
import { formatBytes } from "@/shared/utils/formatters";
import { isUuid } from "@/shared/utils/uuid";
import { errorMessage } from "@/shared/api/errors";
import { Button } from "@/shared/ui/Button";
import { downloadAllAsZip } from "./downloadAll";
import { ImageLightbox } from "./ImageLightbox";

// Thẻ ảnh trang đề: nền tông nhạt cùng bảng màu với thẻ tệp; ảnh như tờ giấy trắng bo góc, rê chuột thì thẻ nhấc lên và hiện biểu tượng phóng to
const CARD = "md-state group block w-full overflow-hidden rounded-m3-xl bg-surface-container-low p-2.5 text-left shadow-m3-1 outline-none transition duration-200 hover:-translate-y-0.5 hover:shadow-m3-3 focus-visible:ring-2 focus-visible:ring-primary";

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
      return { exam: await examApi.exam(examId) };
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
            exam?.trial ? (
              <Navigate to={`/exam/${exam.id}/trial`} replace />
            ) : exam ? (
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
  useEffect(() => void examApi.markOpened(exam.id), [exam.id]);
  const [questions, setQuestions] = useState<Question[]>(exam.questions ?? []);
  const [total, setTotal] = useState(exam.totalQuestions ?? 0);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState<string | null>(null); // khoá của ảnh đang xem lớn (trang đề hoặc tệp ảnh đính kèm)
  const [zipping, setZipping] = useState(false);
  const fetching = !failed && questions.length < total;
  const attachments = useExamAttachmentsLive(exam.id, exam.attachments);
  const kind = exam.kind ?? "FE";
  const term = exam.title.match(/\b(?:SP|SU|FA)\d{2}\b/i)?.[0].toUpperCase() ?? null;
  const items = questions.filter((q) => !q.isReference).length;
  const playable = canPractice(kind, total, exam.answerStatus);
  const comments = useCommentCounts(exam.id);
  const [talk, setTalk] = useState<ExamAttachment | null>(null); // tệp không phải ảnh đang mở thảo luận
  const [focus, setFocus] = useState<{ question: number; comment: string | null } | null>(null); // mở từ thông báo (?target=N&comment=ID)

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
  // Ảnh các trang và tệp đính kèm nằm chung một lưới (đề PE: tài liệu lên trước); tên hiển thị là tên tệp
  // Ảnh để xem lớn: trang đề, rồi các tệp đính kèm là ảnh (đề PE tải lên dạng thư mục tài liệu thường có Q1.webp...). Tệp ảnh đính kèm vẫn là tệp tải về
  // (máy chủ không phát inline), nên hiện bằng ProtectedImg (tải có danh tính rồi hiển thị bằng blob) giống ảnh trang đề.
  const shots = [
    ...questions.map((q) => ({ key: `p${q.number}`, src: q.imageUrl, label: pageLabel(q), question: q.number, poll: !q.isReference })),
    ...attachments.filter(isImageFile).map((a) => ({ key: `a${a.id}`, src: a.url, label: a.name, question: attachmentTarget(a.id), poll: false })),
  ];
  const commentsOf = (question?: number) => (question !== undefined ? (comments.counts?.[String(question)] ?? 0) : 0);
  // Tệp không phải ảnh: nút bình luận cạnh thẻ, bấm thẻ vẫn mở / tải tệp như cũ
  const talkButton = (a: ExamAttachment, className?: string) =>
    comments.counts ? <CommentCountButton name={a.name} count={commentsOf(attachmentTarget(a.id))} onOpen={() => setTalk(a)} className={className} /> : null;
  const pageTiles = shots.map((s) => (
    <li key={s.key}>
      <button type="button" onClick={() => setZoom(s.key)} aria-label={`Xem lớn ${s.label}${commentsOf(s.question) > 0 ? `, ${commentsOf(s.question)} bình luận` : ""}`} className={CARD}>
        <span className="relative block max-h-64 overflow-hidden rounded-m3-md bg-white shadow-sm ring-1 ring-outline-variant/50 sm:max-h-72">
          <ProtectedImg src={s.src} alt="" loading="lazy" className="block h-auto w-full object-cover object-top" />
          <span className="absolute inset-0 flex items-center justify-center bg-primary/0 text-on-primary opacity-0 transition duration-200 group-hover:bg-primary/25 group-hover:opacity-100">
            <ZoomIn size={28} className="rounded-full bg-primary p-1.5 shadow-m3-2" aria-hidden />
          </span>
          {commentsOf(s.question) > 0 && (
            <span className="md-label-medium absolute right-2 top-2 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-on-primary shadow-m3-1" aria-hidden>
              <MessageSquare size={12} /> {commentsOf(s.question)}
            </span>
          )}
        </span>
        <span className="md-label-large block truncate px-1 pb-0.5 pt-2.5 text-center text-on-surface-variant" title={s.label}>
          {s.label}
        </span>
      </button>
    </li>
  ));
  const archives = attachments.filter((a) => a.kind === "archive");
  const fileTiles = attachments
    .filter((a) => a.kind !== "archive" && !isImageFile(a))
    .map((a) => (
      <li key={`a${a.id}`} className="relative">
        <FileTile a={a} />
        {talkButton(a, "absolute right-2 top-2")}
      </li>
    ));
  const lightboxItems = shots.map((s) => ({ src: s.src, name: s.label, question: s.question, poll: s.poll }));
  const zoomAt = zoom === null ? -1 : shots.findIndex((s) => s.key === zoom);

  // Liên kết từ thông báo: mở đúng ảnh (hoặc hộp bình luận của tệp) với khung thảo luận; ảnh hiện dần nên chờ tới khi có đích
  const [params] = useSearchParams();
  const target = Number(params.get("target"));
  const comment = params.get("comment");
  const handled = useRef("");
  useEffect(() => {
    const key = `${target}:${comment}`;
    if (!Number.isInteger(target) || target === 0 || handled.current === key) return;
    const shot = shots.find((s) => s.question === target);
    const file = shot ? undefined : attachments.find((a) => attachmentTarget(a.id) === target);
    if (!shot && !file) return;
    handled.current = key;
    setFocus({ question: target, comment });
    if (shot) setZoom(shot.key);
    else setTalk(file ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chạy lại khi địa chỉ đổi hoặc có thêm ảnh/tệp
  }, [target, comment, shots.length, attachments.length]);
  const closeViewer = () => {
    setZoom(null);
    setTalk(null);
    setFocus(null);
  };
  const tiles = kind === "PE" ? [...fileTiles, ...pageTiles] : [...pageTiles, ...fileTiles];

  // Đề PE: gom mọi tài nguyên (tệp đính kèm + ảnh) vào một file zip mang tên đề
  const downloadAll = async () => {
    setZipping(true);
    try {
      await downloadAllAsZip(exam.title, [
        ...attachments.map((a) => ({ name: a.name, url: a.url })),
        ...questions.map((q) => ({ name: fileName(q), url: q.imageUrl, protectedImage: true })),
      ]);
    } catch (err) {
      toast.error(errorMessage(err, "Chưa tải được bộ tài nguyên, bạn thử lại nhé"));
    } finally {
      setZipping(false);
    }
  };

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
        {kind === "PE" && tiles.length > 0 && (
          <Button variant="filled" onClick={() => void downloadAll()} disabled={zipping || fetching}>
            {zipping ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} {zipping ? "Đang nén…" : "Download All"}
          </Button>
        )}
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

      {archives.length > 0 && (
        <ul className="mb-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {archives.map((a) => (
            <li key={a.id} className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <ArchiveRow a={a} />
              </div>
              {talkButton(a)}
            </li>
          ))}
        </ul>
      )}

      {tiles.length > 0 && (
        <section className="mb-6">
          <ul className="grid grid-cols-2 items-start gap-4 sm:grid-cols-3 lg:grid-cols-4">{tiles}</ul>
          {items > 0 && kind !== "PE" && exam.answerStatus !== "DEFAULT" && (
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

      {zoomAt >= 0 && <ImageLightbox items={lightboxItems} index={zoomAt} onIndex={(i) => setZoom(shots[i]!.key)} onClose={closeViewer} discussion={comments.counts ? { examId: exam.id, examTitle: exam.title, counts: comments.counts, onChanged: comments.reload, focus } : undefined} />}
      {talk && <CommentsDialog examId={exam.id} examTitle={exam.title} target={attachmentTarget(talk.id)} name={talk.name} onChanged={comments.reload} onClose={closeViewer} focusComment={focus?.question === attachmentTarget(talk.id) ? focus.comment : null} />}
    </>
  );
}

const pageLabel = (q: Question) => `Ảnh ${q.number}`;

// Tên tệp ảnh của trang (phần cuối đường dẫn, bỏ query)
const fileName = (q: Question) => decodeURIComponent(q.imageUrl.split("?")[0]!.split("/").pop() ?? `Q${q.number}`);

// Tệp nén (zip, rar...): một hàng ở đầu trang, trước các ảnh: biểu tượng tròn, tên đậm, dung lượng, nút tải ở cuối hàng. Bấm cả hàng là tải về
function ArchiveRow({ a }: { a: ExamAttachment }) {
  return (
    <a
      href={downloadUrl(a.url)}
      download={a.name}
      aria-label={`Tải về ${a.name}`}
      className="md-state group flex items-center gap-3 rounded-m3-lg bg-surface-container-low px-3 py-2.5 shadow-m3-1 outline-none transition duration-200 hover:-translate-y-0.5 hover:shadow-m3-2 focus-visible:ring-2 focus-visible:ring-primary"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-container to-secondary-container text-on-primary-container ring-1 ring-primary/10">
        <FileArchive size={20} strokeWidth={1.75} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="md-label-large block truncate font-semibold text-on-surface" title={a.name}>
          {a.name}
        </span>
        <span className="md-body-small block text-on-surface-variant">{formatBytes(a.sizeBytes)}</span>
      </span>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition group-hover:bg-primary-container group-hover:text-on-primary-container">
        <Download size={16} aria-hidden />
      </span>
    </a>
  );
}

// Máy có chuột mới nhúng PDF làm hình xem trước: điện thoại thường không vẽ PDF trong khung, nên chỉ hiện biểu tượng và mở tab mới
const canEmbedPdf = () => typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches;
const pdfSrc = (url: string, bar: boolean) => `${url}#${bar ? "" : "toolbar=0&navpanes=0&"}view=FitH`;

// Tệp đính kèm: PDF hiện luôn trang đầu (bấm để xem lớn); loại khác là biểu tượng lớn trên nền nhạt, mở được thì mở tab mới, không thì tải về
function FileTile({ a }: { a: ExamAttachment }) {
  const Icon = ICONS[a.kind] ?? ICONS.other;
  const open = OPENABLE.has(a.kind);
  if (a.kind === "pdf" && canEmbedPdf()) {
    // PDF: bấm là mở thẳng file .pdf ở tab mới (không xem trong trang); khung nhỏ chỉ là hình xem trước
    return (
      <a href={a.url} target="_blank" rel="noopener noreferrer" aria-label={`Mở ${a.name}`} title={a.name} className={`${TILE} bg-surface-container-lowest`}>
        <iframe src={pdfSrc(a.url, false)} title={a.name} loading="lazy" tabIndex={-1} className="pointer-events-none h-full w-full border-0" />
        <span className={CAPTION}>{a.name}</span>
      </a>
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
