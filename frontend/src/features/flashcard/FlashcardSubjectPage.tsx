import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Crown,
  Eye,
  EyeOff,
  Layers,
  LayoutGrid,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { useQuestionImageScale } from "@/features/practice/hooks/useQuestionImageScale";
import { prefetchImage } from "@/shared/api/protectedImage";
import { useApi } from "@/shared/hooks/useApi";
import { useUrlState } from "@/shared/hooks/useUrlState";
import { Button, buttonClass } from "@/shared/ui/Button";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import { Kbd } from "@/shared/ui/Kbd";
import { ProtectedImg } from "@/shared/ui/ProtectedImg";
import { flashcardApi, type FlashcardResult } from "./flashcard.api";
import { RotateHint } from "@/shared/ui/RotateHint";
import { LockedPanel } from "./LockedPanel";

// /flashcard/:code: bố cục như trang làm đề: thanh trên gọn, ảnh câu hỏi chiếm gần hết màn hình, thanh dưới có Trước / Hiện đáp án / Tiếp.
export default function FlashcardSubjectPage() {
  const code = (useParams().code ?? "").toUpperCase();
  const { user } = useAuth();
  // Tải lại khi đăng nhập/đổi tài khoản/mua Pro: máy chủ cắt thẻ theo người đang xem
  const q = useApi(
    () => flashcardApi.subject(code),
    [code, user?.id, user?.proExpiresAt],
  );

  return (
    // Giống trang làm đề: chiếm đúng chiều cao màn hình, ẩn thanh điều hướng dưới
    <div
      className="flex h-[calc(100dvh-var(--bottom-nav-h,0px))] flex-col bg-surface"
      data-no-bottom-nav
    >
      {q.data ? (
        <Viewer key={code} code={code} data={q.data} />
      ) : q.error ? (
        <ErrorBox message={q.error} onRetry={q.reload} />
      ) : (
        <Loading label="Đang tải flashcard…" />
      )}
    </div>
  );
}

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement &&
  (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));
const isControl = (t: EventTarget | null) =>
  t instanceof HTMLElement && ["BUTTON", "A"].includes(t.tagName);
const keepFocus = (e: { preventDefault: () => void }) => e.preventDefault(); // bấm chuột vào nút chuyển câu không giữ focus, để Space vẫn là "hiện/ẩn đáp án"

function Viewer({ code, data }: { code: string; data: FlashcardResult }) {
  const [url, setUrl] = useUrlState({ q: "1" }); // ?q=34: mở đúng câu, tải lại trang không mất chỗ
  const [show, setShow] = useState(false);
  const [full, setFull] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const zoom = useQuestionImageScale();
  const box = useRef<HTMLDivElement>(null);

  const items = data.items;
  const slots = items.length + (data.locked ? 1 : 0); // ô mời Pro là vị trí cuối
  const i =
    Math.min(Math.max(1, Math.floor(Number(url.q)) || 1), Math.max(1, slots)) -
    1;
  const item = items[i];

  const go = (next: number) => {
    setUrl({ q: String(Math.min(Math.max(0, next), slots - 1) + 1) });
    setShow(false);
    setListOpen(false);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "Escape") setListOpen(false);
      else if (e.key === "ArrowLeft") go(i - 1);
      else if (e.key === "ArrowRight") go(i + 1);
      else if (e.key === " " && !isControl(e.target) && item) {
        e.preventDefault();
        setShow((s) => !s);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Tải trước hai câu kế tiếp để chuyển câu không phải chờ ảnh
  useEffect(() => {
    for (const next of items.slice(i + 1, i + 3)) prefetchImage(next.imageUrl);
  }, [i, items]);

  useEffect(() => {
    const sync = () => setFull(document.fullscreenElement === box.current);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  const toggleFull = () =>
    (document.fullscreenElement
      ? document.exitFullscreen()
      : box.current?.requestFullscreen?.()
    )?.catch(() => undefined);

  if (data.total === 0)
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-4">
        <Empty icon={Layers} title={`Môn ${code} chưa có flashcard`}>
          Bạn quay lại sau hoặc chọn môn khác.
        </Empty>
        <Link to="/flashcard" className={buttonClass({ variant: "tonal" })}>
          <ArrowLeft size={16} /> Tất cả môn
        </Link>
      </div>
    );

  const iconBtn =
    "md-state flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant disabled:opacity-40";

  return (
    <div
      ref={box}
      className="flex min-h-0 flex-1 flex-col bg-gradient-to-b from-surface-container-low to-surface"
    >
      <RotateHint title="Xoay ngang điện thoại để học" hint="Ảnh câu hỏi sẽ to và dễ đọc hơn" dismissLabel="Vẫn học dọc" />
      <header className="relative z-20 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-outline-variant bg-surface-container-lowest px-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-1">
          <Link
            to="/flashcard"
            aria-label="Tất cả môn"
            title="Tất cả môn"
            className={iconBtn}
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="md-title-medium truncate text-on-surface">
            <span className="hidden text-primary sm:inline">Flashcard · </span>
            {code}
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setListOpen((o) => !o)}
          aria-expanded={listOpen}
          title="Danh sách câu"
          className="md-state md-label-large inline-flex shrink-0 items-center gap-1.5 rounded-full border border-outline-variant bg-secondary-container px-3.5 py-1.5 tabular-nums text-on-secondary-container"
          aria-live="polite"
        >
          <LayoutGrid size={16} />
          Câu {i + 1} / {data.total}
        </button>

        <div className="flex shrink-0 items-center">
          <button
            type="button"
            onClick={zoom.zoomOut}
            disabled={!zoom.canZoomOut}
            aria-label="Thu nhỏ ảnh"
            title="Thu nhỏ ảnh"
            className={iconBtn}
          >
            <ZoomOut size={18} />
          </button>
          <button
            type="button"
            onClick={zoom.reset}
            title="Đặt lại"
            className="md-label-medium hidden w-12 rounded-md py-1 text-center tabular-nums text-on-surface-variant hover:bg-surface-container sm:block"
          >
            {Math.round(zoom.scale * 100)}%
          </button>
          <button
            type="button"
            onClick={zoom.zoomIn}
            disabled={!zoom.canZoomIn}
            aria-label="Phóng to ảnh"
            title="Phóng to ảnh"
            className={iconBtn}
          >
            <ZoomIn size={18} />
          </button>
          <button
            type="button"
            onClick={toggleFull}
            aria-label={full ? "Thoát toàn màn hình" : "Toàn màn hình"}
            title={full ? "Thoát toàn màn hình" : "Toàn màn hình"}
            className={`${iconBtn} hidden sm:flex`}
          >
            {full ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>

        {listOpen && (
          <>
            <button
              aria-label="Đóng danh sách câu"
              onClick={() => setListOpen(false)}
              className="fixed inset-0 cursor-default"
              tabIndex={-1}
            />
            <div className="absolute left-2 right-2 top-full z-10 mt-1 max-h-[70dvh] overflow-y-auto rounded-2xl border border-outline-variant bg-surface p-3 shadow-lg sm:left-1/2 sm:right-auto sm:w-[30rem] sm:-translate-x-1/2">
              <div
                role="list"
                aria-label="Danh sách câu hỏi"
                className="grid grid-cols-6 gap-2 sm:grid-cols-8"
              >
                {Array.from({ length: slots }, (_, k) => (
                  <div role="listitem" key={k}>
                    <button
                      type="button"
                      aria-current={k === i ? "true" : undefined}
                      title={items[k] ? `Câu ${k + 1}` : "Dành cho Pro"}
                      onClick={() => go(k)}
                      className={`md-state md-label-large flex h-10 w-full items-center justify-center rounded-m3-sm border border-outline text-on-surface ${k === i ? "ring-2 ring-primary ring-offset-2 ring-offset-surface" : ""}`}
                    >
                      {items[k] ? (
                        k + 1
                      ) : (
                        <Crown size={16} className="text-[#f0a800]" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </header>
      <div
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={slots}
        aria-valuenow={i + 1}
        aria-label="Tiến độ"
        className="h-1 shrink-0 bg-surface-container-high"
      >
        <div
          className="h-full rounded-r-full bg-gradient-to-r from-[#ffc61f] to-[#e89a00] transition-[width] duration-300"
          style={{ width: `${((i + 1) / slots) * 100}%` }}
        />
      </div>

      <main className="min-h-0 flex-1 overflow-auto p-3 sm:p-4 lg:p-6">
        {item ? (
          <div
            className="mx-auto overflow-hidden rounded-3xl border border-outline-variant/70 bg-surface-container-lowest shadow-[0_2px_4px_rgba(0,0,0,0.05),0_22px_44px_-22px_rgba(70,45,0,0.4)]"
            style={{
              width: `min(${zoom.scale * 100}%, ${zoom.scale * 60}rem)`,
            }}
          >
            <div className="flex items-center justify-between border-b border-outline-variant/60 bg-gradient-to-r from-primary-container/60 to-transparent px-4 py-2">
              <span className="md-label-large text-on-primary-container">
                Câu hỏi {i + 1}
              </span>
              <span className="md-label-medium text-on-surface-variant">
                {code}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              onMouseDown={keepFocus}
              aria-label={show ? "Ẩn đáp án" : "Hiện đáp án"}
              className="block w-full cursor-pointer p-2 sm:p-3"
            >
              <ProtectedImg
                src={item.imageUrl}
                alt={`Câu hỏi ${i + 1}`}
                className="block h-auto w-full"
              />
            </button>
            {/* Luôn chiếm chỗ (min-h cố định) để bật/tắt đáp án không làm trang nhảy */}
            <section
              aria-label="Đáp án"
              aria-live="polite"
              className={`min-h-[5.75rem] border-t-2 px-4 py-3 ${show ? "border-primary bg-primary-container/40" : "border-outline-variant/60"}`}
            >
              {show ? (
                <>
                  <p className="md-label-medium uppercase tracking-wide text-on-surface-variant">
                    Đáp án đúng
                    {item.answer.length > 1 && ` · chọn ${item.answer.length} phương án`}
                  </p>
                  {item.answer.length ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {item.answer.map((a) => (
                        <span
                          key={a}
                          className="md-title-large flex h-11 w-11 items-center justify-center rounded-full bg-primary font-semibold text-on-primary"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="md-body-medium mt-1 text-on-surface-variant">
                      Câu này chưa có đáp án.
                    </p>
                  )}
                </>
              ) : (
                <p className="md-body-medium text-on-surface-variant">
                  Bấm vào ảnh hoặc nút "Hiện đáp án" để xem đáp án.
                </p>
              )}
            </section>
          </div>
        ) : (
          <div className="mx-auto max-w-xl pt-6">
            <LockedPanel hidden={data.hidden} onClose={() => go(0)} />
          </div>
        )}
      </main>

      <footer className="shrink-0 border-t border-outline-variant bg-surface-container-lowest/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_-16px_rgba(70,45,0,0.35)] backdrop-blur sm:px-4">
        <div className="mx-auto grid max-w-3xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:gap-3">
          <Button
            variant="outlined"
            onClick={() => go(i - 1)}
            onMouseDown={keepFocus}
            disabled={i === 0}
            aria-label="Câu trước"
            className="!min-h-12 !px-4"
          >
            <ChevronLeft size={20} />
          </Button>
          {item ? (
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-pressed={show}
              aria-live="polite"
              className={`md-state md-motion flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-full px-4 py-2 shadow-sm ${show ? "bg-primary-container text-on-primary-container" : "bg-primary text-on-primary"}`}
            >
              {show ? (
                <EyeOff size={18} className="shrink-0" />
              ) : (
                <Eye size={18} className="shrink-0" />
              )}
              <span className="md-label-large">
                {show ? "Ẩn đáp án" : "Hiện đáp án"}
              </span>
            </button>
          ) : (
            <span />
          )}
          <Button
            variant="outlined"
            onClick={() => go(i + 1)}
            onMouseDown={keepFocus}
            disabled={i >= slots - 1}
            aria-label="Câu sau"
            className="!min-h-12 !px-4"
          >
            <ChevronRight size={20} />
          </Button>
        </div>
        <p className="md-body-small mt-1.5 text-center text-on-surface-variant">
          <span className="hidden lg:inline">
            <Kbd>←</Kbd> <Kbd>→</Kbd> chuyển câu · <Kbd>Space</Kbd> hiện/ẩn đáp
            án
          </span>
        </p>
      </footer>
    </div>
  );
}
