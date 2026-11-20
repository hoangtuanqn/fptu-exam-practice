import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Eye, EyeOff, Layers, Maximize2, Minimize2 } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { openImageHandler, prefetchImage } from "@/shared/api/protectedImage";
import { useApi } from "@/shared/hooks/useApi";
import { useUrlState } from "@/shared/hooks/useUrlState";
import { Footer } from "@/shared/layout/Footer";
import { SiteHeader } from "@/shared/layout/SiteHeader";
import { Button, buttonClass } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Empty } from "@/shared/ui/Feedback";
import { Kbd } from "@/shared/ui/Kbd";
import { ProtectedImg } from "@/shared/ui/ProtectedImg";
import { QueryBoundary } from "@/shared/ui/QueryBoundary";
import { flashcardApi, type FlashcardResult } from "./flashcard.api";
import { LockedPanel } from "./LockedPanel";

// /flashcard/:code: xem lần lượt từng câu hỏi của môn (ảnh từ máy chủ), bấm để hiện/ẩn đáp án.
export default function FlashcardSubjectPage() {
  const code = (useParams().code ?? "").toUpperCase();
  const { user } = useAuth();
  // Tải lại khi đăng nhập/đổi tài khoản/mua Pro: máy chủ cắt thẻ theo người đang xem
  const q = useApi(() => flashcardApi.subject(code), [code, user?.id, user?.proExpiresAt]);

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-8">
        <Link to="/flashcard" className={buttonClass({ size: "sm", variant: "text" })}>
          <ArrowLeft size={15} /> Tất cả môn
        </Link>
        <QueryBoundary query={q} loadingLabel="Đang tải flashcard…">
          {(d) => <Viewer key={code} code={code} data={d} />}
        </QueryBoundary>
      </main>
      <Footer />
    </div>
  );
}

const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));
const isControl = (t: EventTarget | null) => t instanceof HTMLElement && ["BUTTON", "A"].includes(t.tagName);
const keepFocus = (e: { preventDefault: () => void }) => e.preventDefault(); // bấm chuột vào nút chuyển câu không giữ focus, để Space vẫn là "hiện/ẩn đáp án"

function Viewer({ code, data }: { code: string; data: FlashcardResult }) {
  const [url, setUrl] = useUrlState({ q: "1" }); // ?q=34: mở đúng câu, tải lại trang không mất chỗ
  const [show, setShow] = useState(false);
  const [full, setFull] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const items = data.items;
  const slots = items.length + (data.locked ? 1 : 0); // ô mời Pro là vị trí cuối
  const i = Math.min(Math.max(1, Math.floor(Number(url.q)) || 1), Math.max(1, slots)) - 1;
  const item = items[i];

  const go = (next: number) => {
    setUrl({ q: String(Math.min(Math.max(0, next), slots - 1) + 1) });
    setShow(false);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "ArrowLeft") go(i - 1);
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
  const toggleFull = () => (document.fullscreenElement ? document.exitFullscreen() : box.current?.requestFullscreen?.())?.catch(() => undefined);

  if (data.total === 0)
    return (
      <Card>
        <Empty icon={Layers} title={`Môn ${code} chưa có flashcard`}>
          Bạn quay lại sau hoặc chọn môn khác.
        </Empty>
      </Card>
    );

  return (
    <div ref={box} className={`space-y-4 ${full ? "overflow-y-auto bg-surface p-4 sm:p-8" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="md-label-large text-primary">Flashcard</p>
          <h1 className="md-headline-medium text-on-surface">{code}</h1>
        </div>
        <Button size="sm" variant="tonal" onClick={toggleFull} aria-label={full ? "Thoát toàn màn hình" : "Toàn màn hình"}>
          {full ? <Minimize2 size={15} /> : <Maximize2 size={15} />} {full ? "Thoát" : "Toàn màn hình"}
        </Button>
      </div>

      <Card className="space-y-4 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <Button variant="outlined" onClick={() => go(i - 1)} onMouseDown={keepFocus} disabled={i === 0} aria-label="Câu trước" className="!px-4">
            <ChevronLeft size={20} />
          </Button>
          <p className="md-title-small tabular-nums text-on-surface-variant" aria-live="polite">
            Câu {i + 1} / {data.total}
          </p>
          <Button variant="outlined" onClick={() => go(i + 1)} onMouseDown={keepFocus} disabled={i >= slots - 1} aria-label="Câu sau" className="!px-4">
            <ChevronRight size={20} />
          </Button>
        </div>

        {item ? (
          <>
            <a href="#" onClick={full ? (e) => e.preventDefault() : openImageHandler(item.imageUrl)} title={full ? undefined : "Mở ảnh lớn"} className="block rounded-m3-md bg-surface-container-lowest p-2">
              <ProtectedImg src={item.imageUrl} alt={`Câu hỏi ${i + 1}`} className={`mx-auto w-auto max-w-full object-contain object-top ${full ? "max-h-[65vh]" : "max-h-[60vh]"}`} />
            </a>

            <div className="flex justify-end">
              <Button onClick={() => setShow((s) => !s)} aria-pressed={show}>
                {show ? <EyeOff size={16} /> : <Eye size={16} />} {show ? "Ẩn đáp án" : "Hiện đáp án"}
              </Button>
            </div>

            {show && (
              <section aria-label="Đáp án" aria-live="polite" className="rounded-m3-md bg-primary-container px-5 py-4 text-on-primary-container">
                <p className="md-label-large">Đáp án</p>
                <p className="md-display-small mt-1 text-center font-semibold">{item.answer.length ? item.answer.join(", ") : "Chưa có đáp án"}</p>
              </section>
            )}
          </>
        ) : (
          <LockedPanel hidden={data.hidden} onClose={() => go(0)} />
        )}

        <p className="md-body-small text-center text-on-surface-variant">
          <Kbd>←</Kbd> <Kbd>→</Kbd> để chuyển câu · <Kbd>Space</Kbd> để hiện/ẩn đáp án
        </p>
      </Card>
    </div>
  );
}
