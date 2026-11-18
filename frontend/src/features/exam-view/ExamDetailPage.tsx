import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, FileSearch, Maximize, MessageSquare, Minimize, ZoomIn, ZoomOut } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { CommentsPanel } from "@/features/exam-comment/CommentsPanel";
import { examCommentApi } from "@/features/exam-comment/exam-comment.api";
import { examImportApi } from "@/features/exam-import/exam-import.api";
import { ExamKindBadge } from "@/features/exam-import/components/ExamKindBadge";
import { examKind, isFilesOnly, type ExamAnswersPayload, type ExamQuestionsPayload, type ImportedExam } from "@/features/exam-import/types";
import { AttachmentList } from "@/features/exam-attachments/AttachmentList";
import { MODES } from "@/features/practice/config/modes";
import { AnswerPendingBanner } from "@/features/practice/components/quiz/AnswerPendingBanner";
import { useExamAnswersLive } from "@/features/practice/hooks/useExamAnswersLive";
import { useExamQuestionsLive } from "@/features/practice/hooks/useExamQuestionsLive";
import { useImageZoom } from "@/features/practice/hooks/useImageZoom";
import { useKeydown } from "@/features/practice/hooks/useKeydown";
import type { AnswerSource, Question } from "@/features/practice/types";
import { savedApi } from "@/features/saved/saved.api";
import { ApiError } from "@/shared/api/client";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { SiteHeader } from "@/shared/layout/SiteHeader";
import { IconButton, buttonClass } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { ExpandableText } from "@/shared/ui/ExpandableText";
import { Empty, Loading, Spinner } from "@/shared/ui/Feedback";
import { QueryBoundary } from "@/shared/ui/QueryBoundary";
import { formatDate } from "@/shared/utils/formatters";
import { isUuid } from "@/shared/utils/uuid";
import { ExamTimeDialog } from "./ExamTimeDialog";

const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

// Trang xem đề (/exam/:examId): xem từng ảnh câu hỏi như trình xem ảnh, bình luận theo câu ở bên phải; không có đáp án. Bấm "Luyện tập" hoặc "Thi" để làm bài
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

  const exam = query.data?.exam;
  if (exam && exam.id.toLowerCase() === examId.toLowerCase()) return <ExamDetail key={exam.id} exam={exam} />;
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-24 pt-6">
        <QueryBoundary query={query} loadingLabel="Đang mở đề…">
          {({ exam: stale }) =>
            stale ? (
              <Loading label="Đang mở đề…" />
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
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const [questions, setQuestions] = useState<Question[]>(exam.questions ?? []);
  const [total, setTotal] = useState(exam.totalQuestions ?? 0);
  const [status, setStatus] = useState<AnswerSource>(exam.answerStatus);
  const [failed, setFailed] = useState(false);
  const [timeAsk, setTimeAsk] = useState(false); // hộp chọn thời gian trước khi thi
  const closeTimeAsk = useCallback(() => setTimeAsk(false), []); // ổn định để Modal không giành lại tiêu điểm mỗi lần vẽ lại

  const hasAnswers = status === "AI" || status === "MANUAL";
  const fetching = !failed && questions.length < total;
  const items = questions.filter((q) => !q.isReference); // tài liệu tham khảo không phải câu hỏi: không hiện trong trình xem
  const attachments = exam.attachments ?? [];
  const hasQuestions = !isFilesOnly(exam) && (total > 0 || items.length > 0);

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

  // AI đang phân tích đáp án: xong thì mở hai nút làm bài và tách các trang tài liệu tham khảo khỏi danh sách câu
  useExamAnswersLive(exam.id, hasQuestions && status === "PENDING", (r: ExamAnswersPayload) => {
    if (r.status === "PENDING") return;
    if (r.status === "FAILED" || r.status === "DEFAULT") return setStatus("FAILED");
    const refs = new Set(r.references ?? []);
    if (refs.size > 0) setQuestions((prev) => prev.map((q) => (refs.has(q.number) ? { ...q, isReference: true } : q)));
    setStatus(r.status);
    toast.success("Đáp án đã sẵn sàng, bạn có thể làm bài");
  });

  // Quay lại trang trước; mở thẳng từ liên kết thì về kho đề của môn
  const back = () => {
    if (location.key !== "default") navigate(-1);
    else navigate(exam.subjectCode ? `/kho-de?subject=${encodeURIComponent(exam.subjectCode)}` : "/account/exams");
  };

  const kind = examKind(exam);
  const lockedReason = hasAnswers ? null : status === "PENDING" ? "Mở khi đáp án sẵn sàng" : "Đề chưa có đáp án";
  const start = hasQuestions ? (
    <StartButtons examId={exam.id} lockedReason={lockedReason} onExam={() => setTimeAsk(true)} />
  ) : null;

  // Đáp án đang chuẩn bị hoặc lỗi: dải thông báo có nút "Thử lại" như trang cũ
  const banner = status === "PENDING" || status === "FAILED" || status === "DEFAULT" ? <AnswerPendingBanner source={status} examId={exam.id} onRetry={() => setStatus("PENDING")} /> : null;

  const info =
    exam.description || attachments.length > 0 ? (
      <>
        {exam.description && <ExpandableText text={exam.description} lines={6} className="md-body-medium text-on-surface" />}
        {attachments.length > 0 && (
          <section className="mt-3 space-y-2">
            <h2 className="md-title-small text-on-surface">Tệp đính kèm</h2>
            <AttachmentList attachments={attachments} />
          </section>
        )}
      </>
    ) : null;

  return (
    <div className="flex min-h-dvh flex-col bg-surface lg:h-dvh lg:overflow-hidden">
      <header className="sticky top-0 z-30 flex min-h-16 shrink-0 items-center gap-2 border-b border-outline-variant bg-surface/95 px-2 py-2 backdrop-blur sm:px-4">
        <IconButton label="Quay lại" onClick={back}>
          <ArrowLeft size={22} />
        </IconButton>
        <div className="min-w-0 flex-1">
          <h1 className="md-title-medium truncate text-on-surface" title={exam.title}>
            {exam.title}
          </h1>
          <div className="mt-0.5 flex min-w-0 items-center gap-2">
            <ExamKindBadge kind={kind} />
            {exam.subjectCode && (
              <Link to={`/kho-de?subject=${encodeURIComponent(exam.subjectCode)}`} className="md-label-medium text-primary hover:underline">
                {exam.subjectCode}
              </Link>
            )}
            {exam.postedAt && <span className="md-body-small hidden truncate text-on-surface-variant sm:inline">Đăng ngày {formatDate(exam.postedAt)}</span>}
          </div>
        </div>
        {start && <div className="hidden lg:block">{start}</div>}
      </header>

      {hasQuestions ? (
        <>
          <Viewer examId={exam.id} items={items} loading={fetching} total={total} params={params} setParams={setParams} paused={timeAsk} info={info} banner={banner} />
          {/* Điện thoại: hai nút làm bài luôn hiện ở đáy màn hình */}
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-outline-variant bg-surface/95 px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-m3-2 backdrop-blur lg:hidden">{start}</div>
        </>
      ) : (
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-6 lg:overflow-y-auto">
          {exam.description && (
            <Card className="mb-4 p-4">
              <ExpandableText text={exam.description} lines={6} className="md-body-medium text-on-surface" />
            </Card>
          )}
          {attachments.length > 0 ? (
            <section className="space-y-2">
              <h2 className="md-title-medium text-on-surface">Tệp đính kèm</h2>
              <p className="md-body-medium text-on-surface-variant">Đề này chỉ có tệp đính kèm, không có câu hỏi để làm trên web. Xem hoặc tải tệp bên dưới.</p>
              <AttachmentList attachments={attachments} />
            </section>
          ) : (
            !exam.description && <Empty icon={FileSearch} title="Đề này chưa có nội dung để xem" />
          )}
        </main>
      )}

      {timeAsk && <ExamTimeDialog onCancel={closeTimeAsk} onStart={(m) => navigate(`/exam/${exam.id}/practice?mode=exam${m > 0 ? `&limit=${m}` : ""}`)} />}
    </div>
  );
}

// Hai nút làm bài cỡ lớn: Luyện tập (chính, màu vàng) và Thi (nền tối). Chưa có đáp án thì khoá kèm lý do
function StartButtons({ examId, lockedReason, onExam }: { examId: string; lockedReason: string | null; onExam: () => void }) {
  const [practice, exam] = MODES;
  const big = "md-state md-motion relative inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-m3-lg px-3 shadow-m3-1 sm:gap-3 sm:px-5 disabled:pointer-events-none disabled:bg-on-surface/12 disabled:text-on-surface/38 disabled:shadow-none lg:flex-none";
  const label = (title: string, sub: string) => (
    <span className="flex flex-col items-start text-left leading-tight">
      <span className="md-title-small">{title}</span>
      <span className="text-xs opacity-80">{sub}</span>
    </span>
  );
  return (
    <div className="flex flex-col gap-1 lg:flex-row-reverse lg:items-center lg:gap-3">
      <div className="flex gap-2 lg:gap-3">
        {lockedReason ? (
          <button type="button" disabled className={`${big} bg-primary text-on-primary`}>
            <practice.Icon size={22} aria-hidden /> {label(practice.label, "xem đáp án ngay")}
          </button>
        ) : (
          <Link to={`/exam/${examId}/practice?mode=practice`} className={`${big} bg-primary text-on-primary`}>
            <practice.Icon size={22} aria-hidden /> {label(practice.label, "xem đáp án ngay")}
          </Link>
        )}
        <button type="button" disabled={!!lockedReason} onClick={onExam} className={`${big} bg-inverse-surface text-inverse-on-surface`}>
          <exam.Icon size={22} aria-hidden /> {label(exam.label, "tính giờ, chấm điểm")}
        </button>
      </div>
      {lockedReason && <p className="md-body-small text-center text-on-surface-variant lg:text-right">{lockedReason}</p>}
    </div>
  );
}

interface ViewerProps {
  examId: string;
  items: Question[];
  loading: boolean; // các câu sau còn đang được lấy về
  total: number;
  params: URLSearchParams;
  setParams: ReturnType<typeof useSearchParams>[1];
  banner: ReactNode; // thông báo đáp án đang chuẩn bị / lỗi
  paused: boolean; // có hộp thoại: không nhận phím
  info: ReactNode;
}

// Trình xem: trái là ảnh từng câu (phóng to, mũi tên trước/sau, dải ảnh nhỏ), phải là bình luận của câu đang xem
function Viewer({ examId, items, loading, total, params, setParams, paused, info, banner }: ViewerProps) {
  const { user } = useAuth();
  const toast = useToast();
  const zoom = useImageZoom(); // giữ mức phóng khi đổi câu
  const stage = useRef<HTMLElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(false);

  // ?q=N là câu đang xem (trang "Câu đã lưu" mở thẳng tới câu); số không có trong đề thì về câu đầu
  const asked = Number(params.get("q"));
  const index = Math.max(0, items.findIndex((q) => q.number === asked));
  const q = items[index] as Question | undefined;
  const go = (i: number) => {
    const target = items[Math.min(items.length - 1, Math.max(0, i))];
    if (target && target.number !== q?.number)
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("q", String(target.number));
          return next;
        },
        { replace: true },
      );
  };

  useKeydown((e) => {
    const t = e.target instanceof Element ? e.target : null;
    if (typing(t) || t?.closest('[role="dialog"]')) return; // đang gõ bình luận hoặc phím thuộc về hộp thoại (Esc đóng hộp)
    const panning = zoom.zoom > 1 && !!t && !!zoom.scrollRef.current?.contains(t); // đang phóng to và đứng trong khung ảnh: mũi tên để cuộn ảnh
    if (e.key === "ArrowLeft" && !panning) go(index - 1);
    else if (e.key === "ArrowRight" && !panning) go(index + 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(items.length - 1);
    else if (e.key === "Escape" && zoom.zoom !== 1) zoom.reset();
    else return;
    e.preventDefault();
  }, !paused);

  // Tải trước ảnh câu kế tiếp để bấm "tiếp" là thấy ngay
  const nextUrl = items[index + 1]?.imageUrl;
  useEffect(() => {
    if (nextUrl) new Image().src = nextUrl;
  }, [nextUrl]);

  // Giữ ảnh nhỏ của câu đang xem trong tầm nhìn (chỉ cuộn dải ảnh, không cuộn trang)
  useEffect(() => {
    const box = strip.current;
    const el = box?.querySelector<HTMLElement>('[aria-current="true"]');
    if (box && el) box.scrollTo({ left: el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2, behavior: "smooth" });
  }, [index]);

  useEffect(() => {
    const onChange = () => setFull(document.fullscreenElement === stage.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  const toggleFull = () => (document.fullscreenElement ? void document.exitFullscreen() : void stage.current?.requestFullscreen().catch(() => undefined));

  // Số bình luận đã duyệt theo câu: tải một lần cho cả đề
  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    examCommentApi
      .counts(examId)
      .then((r) => setCounts(r?.counts ?? {}))
      .catch(() => undefined); // chỉ là con số phụ: lỗi thì không hiện
  }, [examId]);
  const onApprovedDelta = useCallback((n: number, d: number) => setCounts((c) => ({ ...c, [n]: Math.max(0, (c[n] ?? 0) + d) })), []);

  // Lưu câu (giữ như trang cũ): đã đăng nhập mới có nút
  const savedOfExam = useApi(() => (user ? savedApi.ofExam(examId) : Promise.resolve(null)), [user?.id, examId]);
  const [savedChanged, setSavedChanged] = useState<Record<number, boolean>>({});
  const isSaved = (n: number) => savedChanged[n] ?? (Array.isArray(savedOfExam.data) && savedOfExam.data.includes(n));
  const saving = useRef(new Set<number>()); // câu đang chờ máy chủ: bỏ qua lần bấm tiếp theo
  const toggleSave = async (n: number) => {
    if (saving.current.has(n)) return;
    saving.current.add(n);
    const next = !isSaved(n);
    try {
      await (next ? savedApi.save(examId, n) : savedApi.remove(examId, n));
      setSavedChanged((prev) => ({ ...prev, [n]: next }));
      toast.success(next ? `Đã lưu câu ${n}` : `Đã bỏ lưu câu ${n}`);
    } catch (err) {
      toast.error(errorMessage(err, next ? "Chưa lưu được câu này" : "Chưa bỏ lưu được câu này"));
    } finally {
      saving.current.delete(n);
    }
  };

  const arrow = "absolute top-1/2 z-10 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-scrim/60 text-white shadow-m3-2 outline-none hover:bg-scrim/80 focus-visible:ring-2 focus-visible:ring-white disabled:hidden sm:h-14 sm:w-14";

  const tool = "inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-200 outline-none hover:bg-surface-container-lowest/10 focus-visible:ring-2 focus-visible:ring-white disabled:opacity-30";
  const details = info && (
    <details className="border-b border-outline-variant py-3">
      <summary className="md-label-large cursor-pointer text-on-surface">Thông tin đề</summary>
      <div className="mt-3">{info}</div>
    </details>
  );

  return (
    <div className="flex flex-col pb-[calc(8.5rem+env(safe-area-inset-bottom))] lg:min-h-0 lg:flex-1 lg:flex-row lg:pb-0">
      {banner && <div className="px-3 pt-3 lg:hidden">{banner}</div>}
      <section ref={stage} aria-label="Ảnh câu hỏi" className="flex h-[70svh] min-h-[22rem] flex-col bg-scrim text-white lg:h-auto lg:min-h-0 lg:min-w-0 lg:flex-1">
        <div className="flex h-12 shrink-0 items-center justify-between gap-2 px-3 sm:px-4">
          <p aria-live="polite" className="md-title-medium tabular-nums">
            {q ? `${index + 1} / ${items.length}` : ""}
            {loading && <span className="md-body-small ml-2 text-white/70">(đang tải thêm, {total} câu)</span>}
          </p>
          {/* Nút phóng riêng (không có nút đóng): trang này chỉ rời đi bằng nút Quay lại */}
          <div className="flex items-center gap-1">
            <button type="button" onClick={zoom.zoomOut} disabled={!zoom.canZoomOut} aria-label="Thu nhỏ" title="Thu nhỏ" className={tool}>
              <ZoomOut size={18} />
            </button>
            <button type="button" onClick={zoom.reset} title="Đặt lại" aria-label={`Mức phóng ${Math.round(zoom.zoom * 100)}%, bấm để đặt lại`} className={`${tool} !w-14 text-sm tabular-nums`}>
              {Math.round(zoom.zoom * 100)}%
            </button>
            <button type="button" onClick={zoom.zoomIn} disabled={!zoom.canZoomIn} aria-label="Phóng to" title="Phóng to" className={tool}>
              <ZoomIn size={18} />
            </button>
            {document.fullscreenEnabled && (
              <button type="button" onClick={toggleFull} aria-label={full ? "Thoát toàn màn hình" : "Toàn màn hình"} title={full ? "Thoát toàn màn hình" : "Toàn màn hình"} className={tool}>
                {full ? <Minimize size={18} /> : <Maximize size={18} />}
              </button>
            )}
          </div>
        </div>

        <div className="relative min-h-0 flex-1 px-2 sm:px-4">
          {q ? (
            <>
              <div ref={zoom.scrollRef} onScroll={zoom.onScroll} tabIndex={0} aria-label={`Khung ảnh câu ${q.number}`} className="outline-none focus-visible:ring-2 focus-visible:ring-primary-container isolate h-full overflow-auto rounded-xl bg-surface-container-lowest p-2 sm:p-4">
                {/* m-auto: ảnh nhỏ nằm giữa, ảnh tràn khung vẫn cuộn tới được mọi phía */}
                <div className="flex min-h-full min-w-full">
                  <img
                    ref={zoom.imgRef}
                    src={q.imageUrl}
                    alt={`Câu ${q.number}`}
                    onClick={zoom.toggleAt}
                    onLoad={zoom.onImageLoad}
                    title={zoom.zoom <= 1 ? "Bấm để phóng to" : "Bấm để thu nhỏ"}
                    className={`m-auto shrink-0 ${zoom.zoom <= 1 ? "cursor-zoom-in" : "cursor-zoom-out"}`}
                    style={{ width: `${zoom.zoom * 100}%`, maxWidth: "none" }}
                  />
                </div>
              </div>
              <button type="button" className={`${arrow} left-3 sm:left-6`} onClick={() => go(index - 1)} disabled={index === 0} aria-label="Câu trước">
                <ChevronLeft size={30} />
              </button>
              <button type="button" className={`${arrow} right-3 sm:right-6`} onClick={() => go(index + 1)} disabled={index >= items.length - 1} aria-label="Câu sau">
                <ChevronRight size={30} />
              </button>
            </>
          ) : (
            <div className="md-body-medium flex h-full items-center justify-center gap-3 text-white/80">
              {loading ? (
                <>
                  <Spinner /> Đang tải câu hỏi…
                </>
              ) : (
                "Đề chưa có câu hỏi để xem"
              )}
            </div>
          )}
        </div>

        {items.length > 1 && (
          <div ref={strip} role="group" aria-label="Chọn câu" className="relative flex h-20 shrink-0 gap-2 overflow-x-auto px-3 py-2 sm:h-24 sm:px-4">
            {items.map((x, i) => {
              const c = counts[x.number] ?? 0;
              return (
                <button
                  key={x.number}
                  type="button"
                  aria-current={i === index ? "true" : undefined}
                  aria-label={`Câu ${x.number}${c ? `, ${c} bình luận` : ""}`}
                  onClick={() => go(i)}
                  className={`relative h-full w-20 shrink-0 overflow-hidden rounded-m3-sm bg-surface-container-lowest outline-none focus-visible:ring-2 focus-visible:ring-white sm:w-28 ${i === index ? "ring-2 ring-primary-container" : "opacity-60 hover:opacity-100"}`}
                >
                  <img src={x.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover object-left-top" />
                  <span className="md-label-small absolute bottom-0.5 left-0.5 rounded bg-scrim/70 px-1 tabular-nums text-white">{x.number}</span>
                  {c > 0 && (
                    <span className="md-label-small absolute right-0.5 top-0.5 inline-flex items-center gap-0.5 rounded-full bg-primary px-1.5 tabular-nums text-on-primary">
                      <MessageSquare size={10} aria-hidden /> {c}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <aside aria-label="Bình luận" className="flex flex-col bg-surface lg:min-h-0 lg:w-[clamp(340px,33%,440px)] lg:shrink-0 lg:border-l lg:border-outline-variant">
        <div className="flex min-h-14 shrink-0 items-center gap-2 border-b border-outline-variant px-4">
          <h2 className="md-title-medium flex-1 text-on-surface">
            {q ? `Câu ${q.number}` : "Bình luận"}
            {q && (counts[q.number] ?? 0) > 0 && <span className="md-body-small ml-2 text-on-surface-variant">{counts[q.number]} bình luận</span>}
          </h2>
          {user && q && (
            <IconButton label={isSaved(q.number) ? `Bỏ lưu câu ${q.number}` : `Lưu câu ${q.number}`} selected={isSaved(q.number)} onClick={() => void toggleSave(q.number)}>
              {isSaved(q.number) ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
            </IconButton>
          )}
        </div>
        {banner && <div className="hidden px-4 pt-3 lg:block">{banner}</div>}
        {q ? (
          <CommentsPanel examId={examId} question={q.number} onApprovedDelta={onApprovedDelta}>
            {details}
          </CommentsPanel>
        ) : (
          details && <div className="px-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">{details}</div>
        )}
      </aside>
    </div>
  );
}
