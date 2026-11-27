import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { ArrowUp, Loader2, Smile, X } from "lucide-react";
import { ApiError } from "@/shared/api/client";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { COMMENT_MAX_LENGTH } from "./exam-comments.api";

const EMOJI = ["😀", "😂", "🤣", "😊", "😍", "🥰", "😎", "🤔", "😅", "😭", "😢", "😡", "👍", "👎", "👏", "🙏", "💪", "🔥", "💯", "🎉", "❤️", "✅", "❌", "❓"];
const MAX_HEIGHT = 160;

// Ô viết bình luận / phản hồi: khung chữ ở trên, thanh công cụ (emoji, gợi ý, nút gửi) ở dưới. Gửi lỗi thì giữ nguyên bản nháp.
// Mặc định Enter để gửi, Shift+Enter xuống dòng. `roomy` (khu trao đổi cuối trang): ô nhiều dòng, Ctrl + Enter để gửi.
interface Props {
  onSend: (body: string) => Promise<void>;
  hint: boolean;
  label?: string;
  autoFocus?: boolean;
  onCancel?: () => void;
  roomy?: boolean;
}

export function CommentComposer({ onSend, hint, label = "Viết bình luận", autoFocus, onCancel, roomy }: Props) {
  const toast = useToast();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const box = useRef<HTMLTextAreaElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const hintId = useId();

  // Tự giãn chiều cao theo nội dung (tối đa vài dòng rồi cuộn)
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, roomy ? MAX_HEIGHT * 2 : MAX_HEIGHT)}px`;
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
    const sendKey = roomy ? e.ctrlKey || e.metaKey : !e.shiftKey;
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

  const counter = draft.length > COMMENT_MAX_LENGTH - 100 ? `${draft.length}/${COMMENT_MAX_LENGTH}` : null;
  const tip = roomy ? "Ctrl + Enter để gửi" : hint ? "Mở đầu bằng chữ đáp án (vd. “A vì…”) để tự chọn." : null;

  return (
    <div ref={wrap} className="relative">
      <div className={`rounded-m3-lg border bg-surface-container-lowest transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary ${error ? "border-error" : "border-outline-variant"}`}>
        <textarea
          ref={box}
          rows={roomy ? 2 : 1}
          value={draft}
          maxLength={COMMENT_MAX_LENGTH}
          onChange={(e) => {
            setDraft(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={onKeyDown}
          placeholder={roomy && !onCancel ? "Bạn nghĩ gì về đề này? Chia sẻ cách giải hoặc hỏi mọi người…" : `${label}…`}
          aria-label={label}
          autoFocus={autoFocus}
          aria-describedby={hintId}
          aria-invalid={!!error}
          className={`md-body-medium block w-full resize-none bg-transparent px-3 pt-3 text-on-surface outline-none placeholder:text-on-surface-variant focus-visible:outline-none ${roomy ? "min-h-20" : "min-h-11"}`}
        />
        <div className="flex items-center gap-1 px-1.5 pb-1.5">
          <button type="button" onClick={() => setEmojiOpen((o) => !o)} aria-label="Chèn biểu tượng cảm xúc" aria-expanded={emojiOpen} className="md-state flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant">
            <Smile size={20} />
          </button>
          <p id={hintId} role={error ? "alert" : undefined} className={`md-body-small min-w-0 flex-1 ${error ? "text-error" : "text-on-surface-variant"}`}>
            {error ?? tip}
            {!error && counter && <span className={`ml-2 tabular-nums ${draft.length >= COMMENT_MAX_LENGTH ? "text-error" : ""}`}>{counter}</span>}
          </p>
          {onCancel && (
            <button type="button" onClick={onCancel} aria-label="Huỷ trả lời" title="Huỷ trả lời" className="md-state flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant">
              <X size={18} />
            </button>
          )}
          <button
            type="button"
            onClick={() => void send()}
            disabled={busy || !draft.trim()}
            aria-label={onCancel ? "Gửi trả lời" : "Gửi bình luận"}
            className="md-state md-motion flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary disabled:bg-on-surface/12 disabled:text-on-surface/38"
          >
            {busy ? <Loader2 size={18} className="animate-spin" /> : <ArrowUp size={18} />}
          </button>
        </div>
      </div>
      {emojiOpen && (
        <div
          role="group"
          aria-label="Biểu tượng cảm xúc"
          onKeyDown={(e) => {
            if (e.key !== "Escape") return;
            e.stopPropagation(); // Esc chỉ đóng bảng emoji, không đóng trình xem ảnh
            setEmojiOpen(false);
          }}
          className={`absolute left-0 z-10 grid grid-cols-6 gap-1 rounded-m3-lg bg-surface-container-highest p-2 shadow-m3-2 ${roomy ? "top-full mt-1" : "bottom-14"}`}
        >
          {EMOJI.map((e) => (
            <button key={e} type="button" onClick={() => insert(e)} aria-label={`Chèn ${e}`} className="md-state flex h-10 w-10 items-center justify-center rounded-full text-xl">
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
