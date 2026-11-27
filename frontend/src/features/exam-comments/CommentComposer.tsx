import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Loader2, SendHorizontal, Smile } from "lucide-react";
import { ApiError } from "@/shared/api/client";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { Button } from "@/shared/ui/Button";
import { COMMENT_MAX_LENGTH } from "./exam-comments.api";

const EMOJI = ["😀", "😂", "🤣", "😊", "😍", "🥰", "😎", "🤔", "😅", "😭", "😢", "😡", "👍", "👎", "👏", "🙏", "💪", "🔥", "💯", "🎉", "❤️", "✅", "❌", "❓"];
const MAX_HEIGHT = 160;

// Ô viết bình luận cố định cuối khung: Enter để gửi, Shift+Enter xuống dòng, bảng emoji nhỏ. Gửi lỗi thì giữ nguyên bản nháp.
// Dùng lại cho ô trả lời ngay dưới bình luận: label/placeholder riêng, tự focus, Esc để huỷ trả lời.
// variant "card" (bình luận chung cuối trang): thẻ có nhãn hiện rõ, ô nhiều dòng, Enter xuống dòng, Ctrl + Enter để gửi, nút Gửi.
interface Props {
  onSend: (body: string) => Promise<void>;
  hint: boolean;
  label?: string;
  autoFocus?: boolean;
  onCancel?: () => void;
  variant?: "bar" | "card";
}

export function CommentComposer({ onSend, hint, label = "Viết bình luận", autoFocus, onCancel, variant = "bar" }: Props) {
  const card = variant === "card";
  const toast = useToast();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const box = useRef<HTMLTextAreaElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const hintId = useId();
  const boxId = useId();

  // Tự giãn chiều cao theo nội dung (tối đa vài dòng rồi cuộn)
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, card ? MAX_HEIGHT * 2 : MAX_HEIGHT)}px`;
  }, [draft]);

  // Bấm ra ngoài thì đóng bảng emoji
  useEffect(() => {
    if (!emojiOpen) return;
    const onDown = (e: MouseEvent) => !wrap.current?.contains(e.target as Node) && setEmojiOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [emojiOpen]);

  const send = async () => {
    const body = draft.trim();
    if (!body || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSend(body);
      setDraft("");
    } catch (err) {
      const field = err instanceof ApiError ? err.errors?.body : undefined;
      if (field) setError(field);
      else toast.error(errorMessage(err, "Chưa gửi được bình luận"));
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Bộ gõ tiếng Việt đang ghép chữ thì Enter thuộc về bộ gõ
    const sendKey = card ? e.ctrlKey || e.metaKey : !e.shiftKey;
    if (e.key === "Enter" && sendKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send();
    } else if (e.key === "Escape" && onCancel) {
      e.stopPropagation(); // Esc chỉ huỷ trả lời, không đóng hộp thoại / trình xem ảnh
      onCancel();
    }
  };

  const insert = (emoji: string) => {
    const el = box.current;
    const start = el?.selectionStart ?? draft.length;
    const end = el?.selectionEnd ?? start;
    setDraft((d) => `${d.slice(0, start)}${emoji}${d.slice(end)}`.slice(0, COMMENT_MAX_LENGTH));
    setEmojiOpen(false);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };

  const textarea = (
    <textarea
      ref={box}
      id={boxId}
      rows={card ? 3 : 1}
      value={draft}
      maxLength={COMMENT_MAX_LENGTH}
      onChange={(e) => {
        setDraft(e.target.value);
        if (error) setError(null);
      }}
      onKeyDown={onKeyDown}
      placeholder={card ? "Chia sẻ cách giải, thắc mắc hay mẹo của bạn…" : `${label}…`}
      aria-label={card ? undefined : label}
      autoFocus={autoFocus}
      aria-describedby={hintId}
      aria-invalid={!!error}
      className={
        card
          ? "md-body-medium block min-h-24 w-full resize-none rounded-m3-md bg-surface-container-low px-3 py-2.5 text-on-surface outline-none ring-1 ring-outline-variant transition placeholder:text-on-surface-variant focus:ring-2 focus:ring-primary"
          : "md-body-medium min-h-10 flex-1 resize-none bg-transparent py-2 text-on-surface outline-none placeholder:text-on-surface-variant"
      }
    />
  );
  const emojiButton = (
    <button type="button" onClick={() => setEmojiOpen((o) => !o)} aria-label="Chèn biểu tượng cảm xúc" aria-expanded={emojiOpen} className="md-state flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant">
      <Smile size={20} />
    </button>
  );
  const counter = draft.length > COMMENT_MAX_LENGTH - 100 && ` ${draft.length}/${COMMENT_MAX_LENGTH}`;

  return (
    <div ref={wrap} className="relative">
      {card ? (
        <div className={`rounded-m3-xl bg-surface-container-lowest p-3 shadow-m3-1 ring-1 sm:p-4 ${error ? "ring-error" : "ring-outline-variant/60"}`}>
          <label htmlFor={boxId} className="md-title-small mb-2 block text-on-surface">
            {label}
          </label>
          {textarea}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p id={hintId} role={error ? "alert" : undefined} className={`md-body-small min-w-0 flex-1 ${error ? "text-error" : "text-on-surface-variant"}`}>
              {error ?? "Ctrl + Enter để gửi"}
              {!error && counter && <span className={draft.length >= COMMENT_MAX_LENGTH ? "text-error" : ""}> ·{counter}</span>}
            </p>
            {emojiButton}
            {onCancel && (
              <Button size="sm" variant="text" onClick={onCancel}>
                Huỷ
              </Button>
            )}
            <Button size="sm" variant="filled" onClick={() => void send()} disabled={busy || !draft.trim()}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <SendHorizontal size={16} />} {onCancel ? "Trả lời" : "Gửi"}
            </Button>
          </div>
        </div>
      ) : (
        <div className={`flex items-end gap-1 rounded-m3-xl bg-surface-container-high py-1 pl-4 pr-1 ${error ? "ring-1 ring-error" : ""}`}>
          {textarea}
          {emojiButton}
          <button type="button" onClick={() => void send()} disabled={busy || !draft.trim()} aria-label={onCancel ? "Gửi trả lời" : "Gửi bình luận"} className="md-state flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-primary disabled:text-on-surface/38">
            {busy ? <Loader2 size={20} className="animate-spin" /> : <SendHorizontal size={20} />}
          </button>
        </div>
      )}
      {emojiOpen && (
        <div
          role="group"
          aria-label="Biểu tượng cảm xúc"
          onKeyDown={(e) => {
            if (e.key !== "Escape") return;
            e.stopPropagation(); // Esc chỉ đóng bảng emoji, không đóng trình xem ảnh
            setEmojiOpen(false);
          }}
          className={`absolute right-0 z-10 grid grid-cols-6 gap-1 rounded-m3-lg bg-surface-container-highest p-2 shadow-m3-2 ${card ? "bottom-14 sm:bottom-16" : "bottom-full mb-2"}`}
        >
          {EMOJI.map((e) => (
            <button key={e} type="button" onClick={() => insert(e)} aria-label={`Chèn ${e}`} className="md-state flex h-10 w-10 items-center justify-center rounded-full text-xl">
              {e}
            </button>
          ))}
        </div>
      )}
      {card ? null : error ? (
        <p id={hintId} role="alert" className="md-body-small mt-1 px-4 text-error">
          {error}
        </p>
      ) : (
        <p id={hintId} className="md-body-small mt-1 px-4 text-on-surface-variant">
          {hint && "Mở đầu bằng chữ đáp án (vd. “A vì…”) để tự chọn."}
          {counter}
        </p>
      )}
    </div>
  );
}
