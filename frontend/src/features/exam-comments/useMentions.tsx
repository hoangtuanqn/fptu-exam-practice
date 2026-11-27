import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { ApiError } from "@/shared/api/client";
import { UserAvatar } from "@/shared/ui/UserAvatar";
import { commentApi, type MentionCandidate } from "./exam-comments.api";
import { mentionAt } from "./format";

const DEBOUNCE_MS = 250;
export const MAX_MENTIONS = 5;

// Gợi ý người để nhắc (@Tên) trong ô viết: gõ "@" là mở, phím mũi tên chọn, Enter / Tab để chèn, Esc để đóng.
// Máy chủ cũ chưa có (404) thì tắt hẳn, ô viết ẩn nút "@".
export function useMentions(examId: string | undefined, onPick: (start: number, end: number, name: string) => boolean) {
  const [token, setToken] = useState<{ start: number; end: number; query: string } | null>(null);
  const [items, setItems] = useState<MentionCandidate[]>([]);
  const [active, setActive] = useState(0);
  const [off, setOff] = useState(!examId);
  const [picked, setPicked] = useState<MentionCandidate[]>([]);
  const seq = useRef(0);
  const listId = useId();
  const query = token?.query ?? null;

  useEffect(() => {
    const n = ++seq.current; // câu trả lời của lần gõ cũ về sau thì bỏ
    if (query === null || off || !examId) return;
    const t = setTimeout(() => {
      commentApi.mentions(examId, query).then(
        (list) => {
          if (n !== seq.current) return;
          setItems(Array.isArray(list) ? list : []);
          setActive(0);
        },
        (err: unknown) => {
          if (err instanceof ApiError && err.status === 404) setOff(true);
          if (n === seq.current) setItems([]);
        },
      );
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query, off, examId]);

  const close = () => {
    setToken(null);
    setItems([]);
  };
  const open = !off && token !== null && items.length > 0;

  // Gọi sau mỗi lần gõ / dời con trỏ
  const detect = (value: string, caret: number) => {
    if (off) return;
    const at = mentionAt(value, caret);
    if (!at) return close();
    setToken({ start: at.start, end: caret, query: at.query });
  };

  const pick = (c: MentionCandidate) => {
    if (!token) return;
    close();
    if (onPick(token.start, token.end, c.name)) setPicked((p) => (p.some((x) => x.ref === c.ref) ? p : [...p, c]));
  };

  // Phím trong ô viết khi danh sách đang mở; trả true nếu đã xử lý
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!open || e.nativeEvent.isComposing) return false;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") setActive((a) => (a + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length);
    else if (e.key === "Enter" || e.key === "Tab") pick(items[active] ?? items[0]!);
    else if (e.key === "Escape") {
      e.stopPropagation(); // Esc chỉ đóng gợi ý, không huỷ trả lời / đóng trình xem ảnh
      close();
    } else return false;
    e.preventDefault();
    return true;
  };

  // ref của những người còn "@Tên" trong nội dung lúc gửi
  const refsIn = (body: string) => [...new Set(picked.filter((c) => body.includes(`@${c.name}`)).map((c) => c.ref))].slice(0, MAX_MENTIONS);
  const namesIn = (body: string) => picked.filter((c) => body.includes(`@${c.name}`)).map((c) => c.name);
  const reset = () => setPicked([]);

  const optionId = (i: number) => `${listId}-${i}`;
  const textareaProps = { role: "combobox" as const, "aria-expanded": open, "aria-controls": open ? listId : undefined, "aria-activedescendant": open ? optionId(active) : undefined, "aria-autocomplete": "list" as const };

  const list = open ? (
    <ul id={listId} role="listbox" aria-label="Gợi ý người để nhắc" className="absolute left-2 z-20 max-h-64 w-72 max-w-full overflow-y-auto rounded-m3-md bg-surface-container p-1 shadow-m3-2 ring-1 ring-outline-variant/50">
      {items.map((c, i) => (
        <li
          key={c.ref}
          id={optionId(i)}
          role="option"
          aria-selected={i === active}
          onMouseDown={(e) => e.preventDefault()} // giữ focus trong ô viết
          onClick={() => pick(c)}
          onMouseEnter={() => setActive(i)}
          className={`md-body-medium flex min-h-10 cursor-pointer items-center gap-2.5 rounded-m3-sm px-2.5 text-on-surface ${i === active ? "bg-surface-container-highest" : ""}`}
        >
          <UserAvatar src={c.avatarUrl} alt="" className="h-7 w-7" />
          <span className="truncate">{c.name}</span>
        </li>
      ))}
    </ul>
  ) : null;

  return { off, detect, onKey, refsIn, namesIn, reset, count: (body: string) => refsIn(body).length, list, textareaProps };
}
