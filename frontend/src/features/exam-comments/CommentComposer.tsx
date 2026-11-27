import { useContext, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { ArrowUp, AtSign, Eye, EyeOff, Hash, ImagePlus, Loader2, Paperclip, Sigma, Smile, X } from "lucide-react";
import { ApiError } from "@/shared/api/client";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { Button } from "@/shared/ui/Button";
import { addFiles, KINDS, MAX_FILES, PendingFiles, type FileKind } from "./CommentAttachments";
import { CommentBody, QuestionLinks } from "./CommentBody";
import { COMMENT_MAX_LENGTH, type CommentInput } from "./exam-comments.api";
import { applyFormat, type Format } from "./format";
import { FormatToolbar, TOOL } from "./FormatToolbar";
import { MAX_MENTIONS, useMentions } from "./useMentions";

const EMOJI = ["😀", "😂", "🤣", "😊", "😍", "🥰", "😎", "🤔", "😅", "😭", "😢", "😡", "👍", "👎", "👏", "🙏", "💪", "🔥", "💯", "🎉", "❤️", "✅", "❌", "❓"];
const SYMBOLS = ["∑", "∏", "√", "∫", "∞", "≈", "≠", "≤", "≥", "±", "×", "÷", "→", "⇒", "⇔", "∈", "∉", "⊂", "∪", "∩", "∀", "∃", "∅", "ℕ", "ℤ", "ℚ", "ℝ", "α", "β", "θ", "λ", "μ", "π", "σ", "Δ", "Ω"];
const MAX_HEIGHT = 160;

// Ô viết bình luận / phản hồi: khung chữ ở trên, thanh công cụ (emoji, gợi ý, nút gửi) ở dưới. Gửi lỗi thì giữ nguyên bản nháp.
// Mặc định Enter để gửi, Shift+Enter xuống dòng. `roomy` (khu trao đổi cuối trang): thanh định dạng, xem trước, ảnh / tệp đính kèm, Ctrl + Enter để gửi.
// Gõ "@" để nhắc tên (cần `examId`); nút "#" chèn số câu của đề (danh sách lấy từ QuestionLinks của trang).
interface Props {
  onSend: (input: CommentInput) => Promise<void>;
  examId?: string;
  hint: boolean;
  label?: string;
  autoFocus?: boolean;
  onCancel?: () => void;
  roomy?: boolean;
}

export function CommentComposer({ onSend, examId, hint, label = "Viết bình luận", autoFocus, onCancel, roomy }: Props) {
  const toast = useToast();
  const [draft, setDraft] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picker, setPicker] = useState<"emoji" | "math" | "question" | null>(null);
  const [preview, setPreview] = useState(false);
  const box = useRef<HTMLTextAreaElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const questions = useContext(QuestionLinks)?.numbers ?? [];
  const mentions = useMentions(examId, (start, end, name) => {
    if (mentions.count(draft) >= MAX_MENTIONS) {
      toast.error(`Mỗi bình luận nhắc tối đa ${MAX_MENTIONS} người`);
      return false;
    }
    const text = `@${name} `;
    edit(draft.slice(0, start) + text + draft.slice(end), start + text.length, start + text.length);
    return true;
  });

  // Tự giãn chiều cao theo nội dung (tối đa vài dòng rồi cuộn)
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, roomy ? MAX_HEIGHT * 2 : MAX_HEIGHT)}px`;
  }, [draft, preview]);

  // Bấm ra ngoài thì đóng bảng emoji
  useEffect(() => {
    if (!picker) return;
    const onDown = (e: MouseEvent) => !wrap.current?.contains(e.target as Node) && setPicker(null);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [picker]);

  const send = async () => {
    const body = draft.trim();
    if (!body || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSend({ body, files, mentions: mentions.refsIn(body) });
      setDraft("");
      setFiles([]);
      mentions.reset();
      setPreview(false);
    } catch (err) {
      const field = err instanceof ApiError ? (err.errors?.files ?? err.errors?.body) : undefined;
      if (field) setError(field);
      else toast.error(errorMessage(err, "Chưa gửi được bình luận"));
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentions.onKey(e)) return;
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

  // Đổi nội dung rồi đặt lại con trỏ / vùng chọn
  const edit = (value: string, start: number, end: number) => {
    setDraft(value.slice(0, COMMENT_MAX_LENGTH));
    setPicker(null);
    requestAnimationFrame(() => {
      box.current?.focus();
      box.current?.setSelectionRange(start, end);
      if (box.current) mentions.detect(box.current.value, end);
    });
  };
  const selection = () => {
    const start = box.current?.selectionStart ?? draft.length;
    return [start, box.current?.selectionEnd ?? start] as const;
  };
  const insert = (text: string) => {
    const [start, end] = selection();
    edit(draft.slice(0, start) + text + draft.slice(end), start + text.length, start + text.length);
  };
  const format = (kind: Format) => {
    const r = applyFormat(draft, ...selection(), kind);
    edit(r.value, r.start, r.end);
  };
  // "@" / "#12" đứng riêng một từ: thêm dấu cách nếu ngay trước con trỏ là chữ
  const insertWord = (text: string) => {
    const [start] = selection();
    insert(start > 0 && !/\s/.test(draft[start - 1] ?? "") ? ` ${text}` : text);
  };
  const pickFiles = (kind: FileKind, list: FileList | null) => {
    const r = addFiles(files, [...(list ?? [])], kind);
    setFiles(r.files);
    setError(r.error);
  };
  const fileButton = (kind: FileKind) => {
    const label = kind === "image" ? "Chèn ảnh" : "Đính kèm tệp";
    const input = kind === "image" ? imageInput : fileInput;
    return (
      <>
        <button type="button" onClick={() => input.current?.click()} disabled={preview || files.length >= MAX_FILES} aria-label={label} title={label} className={TOOL}>
          {kind === "image" ? <ImagePlus size={17} /> : <Paperclip size={17} />}
        </button>
        <input
          ref={input}
          type="file"
          multiple
          accept={KINDS[kind].accept}
          hidden
          tabIndex={-1}
          onChange={(e) => {
            pickFiles(kind, e.target.files);
            e.target.value = ""; // chọn lại đúng tệp vừa gỡ vẫn nhận
          }}
        />
      </>
    );
  };

  const counter = draft.length > COMMENT_MAX_LENGTH - 100 ? `${draft.length}/${COMMENT_MAX_LENGTH}` : null;
  const tip = roomy ? "Ctrl + Enter để gửi" : hint ? "Mở đầu bằng chữ đáp án (vd. “A vì…”) để tự chọn." : null;

  return (
    <div ref={wrap} className="relative">
      <div className={`rounded-m3-lg border bg-surface-container-lowest transition-colors focus-within:border-outline ${error ? "border-error" : "border-outline-variant"}`}>
        {roomy && (
          <FormatToolbar disabled={preview} onFormat={format}>
            {!mentions.off && (
              <button type="button" onClick={() => insertWord("@")} disabled={preview} aria-label="Nhắc tên một người" title="Nhắc tên" className={TOOL}>
                <AtSign size={17} />
              </button>
            )}
            <button
              type="button"
              onClick={() => (questions.length ? setPicker((p) => (p === "question" ? null : "question")) : insertWord("#"))}
              disabled={preview}
              aria-label="Dẫn tới một câu của đề"
              title="Dẫn tới câu"
              aria-expanded={questions.length ? picker === "question" : undefined}
              className={TOOL}
            >
              <Hash size={17} />
            </button>
            {fileButton("image")}
            {fileButton("file")}
            <button type="button" onClick={() => setPicker((p) => (p === "math" ? null : "math"))} disabled={preview} aria-label="Chèn ký hiệu toán" title="Ký hiệu toán" aria-expanded={picker === "math"} className={TOOL}>
              <Sigma size={17} />
            </button>
            <button type="button" onClick={() => setPreview((p) => !p)} disabled={!draft.trim()} aria-pressed={preview} className={`${TOOL} md-label-medium ml-auto w-auto gap-1.5 px-3`}>
              {preview ? <EyeOff size={17} /> : <Eye size={17} />} {preview ? "Soạn tiếp" : "Xem trước"}
            </button>
          </FormatToolbar>
        )}
        {/* Gợi ý nhắc tên: ô viết gọn nằm sát đáy khung nên mở lên trên ô; ô rộng thì mở ngay dưới chữ */}
        {!roomy && <div className="relative [&>ul]:bottom-1">{mentions.list}</div>}
        {preview && <CommentBody body={draft} mentions={mentions.namesIn(draft)} className="min-h-20 px-3 pt-3" />}
        <textarea
          ref={box}
          hidden={preview}
          rows={roomy ? 2 : 1}
          value={draft}
          maxLength={COMMENT_MAX_LENGTH}
          onChange={(e) => {
            setDraft(e.target.value);
            mentions.detect(e.target.value, e.target.selectionStart);
            if (error) setError(null);
          }}
          onSelect={(e) => mentions.detect(e.currentTarget.value, e.currentTarget.selectionStart)}
          onBlur={() => mentions.detect("", 0)}
          onKeyDown={onKeyDown}
          {...mentions.textareaProps}
          placeholder={roomy && !onCancel ? "Bạn nghĩ gì về đề này? Chia sẻ cách giải hoặc hỏi mọi người…" : `${label}…`}
          aria-label={label}
          autoFocus={autoFocus}
          aria-describedby={hintId}
          aria-invalid={!!error}
          className={`md-body-medium ${preview ? "hidden" : "block"} w-full resize-none bg-transparent px-3 pt-3 text-on-surface outline-none placeholder:text-on-surface-variant focus-visible:outline-none ${roomy ? "min-h-28" : "min-h-11"}`}
        />
        {roomy && <div className="relative [&>ul]:top-0">{mentions.list}</div>}
        <PendingFiles files={files} disabled={busy} onRemove={(f) => setFiles((l) => l.filter((x) => x !== f))} />
        <div className="flex items-center gap-1 px-1.5 pb-1.5">
          <button type="button" onClick={() => setPicker((p) => (p === "emoji" ? null : "emoji"))} disabled={preview} aria-label="Chèn biểu tượng cảm xúc" aria-expanded={picker === "emoji"} className="md-state flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant">
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
          {roomy ? (
            <Button size="sm" variant="filled" onClick={() => void send()} disabled={busy || !draft.trim()}>
              {busy && <Loader2 size={16} className="animate-spin" />} {onCancel ? "Trả lời" : "Gửi bình luận"}
            </Button>
          ) : (
            <button
              type="button"
              onClick={() => void send()}
              disabled={busy || !draft.trim()}
              aria-label={onCancel ? "Gửi trả lời" : "Gửi bình luận"}
              className="md-state flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface disabled:text-on-surface/38"
            >
              {busy ? <Loader2 size={18} className="animate-spin" /> : <ArrowUp size={18} />}
            </button>
          )}
        </div>
      </div>
      {picker && (
        <div
          role="group"
          aria-label={picker === "emoji" ? "Biểu tượng cảm xúc" : picker === "math" ? "Ký hiệu toán" : "Chọn câu để dẫn tới"}
          onKeyDown={(e) => {
            if (e.key !== "Escape") return;
            e.stopPropagation(); // Esc chỉ đóng bảng emoji, không đóng trình xem ảnh
            setPicker(null);
          }}
          className={`absolute left-0 z-10 grid grid-cols-6 gap-1 rounded-m3-lg bg-surface-container-highest p-2 shadow-m3-2 ${picker !== "emoji" ? "top-12" : roomy ? "top-full mt-1" : "bottom-14"} ${picker === "question" ? "max-h-72 overflow-y-auto" : ""}`}
        >
          {picker === "question"
            ? questions.map((n) => (
                <button key={n} type="button" onClick={() => insertWord(`#${n} `)} aria-label={`Dẫn tới câu ${n}`} className="md-state md-label-large flex h-10 w-10 items-center justify-center rounded-full tabular-nums text-on-surface">
                  {n}
                </button>
              ))
            : (picker === "emoji" ? EMOJI : SYMBOLS).map((e) => (
                <button key={e} type="button" onClick={() => insert(e)} aria-label={`Chèn ${e}`} className="md-state flex h-10 w-10 items-center justify-center rounded-full text-xl">
                  {e}
                </button>
              ))}
        </div>
      )}
    </div>
  );
}
