import {
  createContext,
  Fragment,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { useApi } from "@/shared/hooks/useApi";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { useSlow } from "@/shared/hooks/useSlow";
import { IconButton } from "@/shared/ui/Button";
import { Kbd } from "@/shared/ui/Kbd";
import { Modal } from "@/shared/ui/Modal";
import { SearchStatusIcon } from "@/shared/ui/SearchStatusIcon";
import { SkeletonList } from "@/shared/ui/Skeleton";
import { searchApi, type SearchResult } from "./search.api";

// Tìm kiếm chung kiểu palette: ô nhỏ trên header (hoặc Ctrl+K / ⌘K) mở popup ở phía trên, gõ để tìm môn, đề, flashcard.
const SearchContext = createContext<{ open: () => void } | null>(null);

const MIN_CHARS = 2; // ít hơn thì chưa gọi máy chủ
const PER_GROUP = 5; // số mục tối đa mỗi nhóm máy chủ trả về (backend search.service)
const MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform);
const KEY = MAC ? "⌘K" : "Ctrl K";

export function SearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const value = useMemo(() => ({ open: () => setOpen(true) }), []);
  return (
    <SearchContext.Provider value={value}>
      {children}
      {open && <SearchDialog onClose={() => setOpen(false)} />}
    </SearchContext.Provider>
  );
}

// Ô nhỏ đặt trên header, trông như ô nhập nhưng bấm vào là mở popup. Điện thoại header chật nên chỉ còn biểu tượng.
export function SearchTrigger() {
  const open = useContext(SearchContext)?.open;
  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label={`Tìm kiếm (${KEY})`}
        className="site-search-field md-motion"
      >
        <Search size={18} aria-hidden className="shrink-0" />
        <span className="flex-1 truncate text-left">Tìm kiếm…</span>
        <span className="hidden 2xl:block">
          <Kbd>{KEY}</Kbd>
        </span>
      </button>
      {/* Dưới 1280px header chật: chỉ còn biểu tượng */}
      <IconButton label="Tìm kiếm" onClick={open} className="xl:hidden">
        <Search size={20} />
      </IconButton>
    </>
  );
}

interface Option {
  key: string;
  group: string;
  label: string;
  hint: string;
  to: string;
}

function SearchDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [text, setText] = useState("");
  const typed = text.trim(); // chữ đang gõ: quyết định thông báo hiện ra ngay
  const q = useDebounce(typed, 250); // chờ ngừng gõ một nhịp rồi mới gọi máy chủ
  const cache = useRef(new Map<string, SearchResult>()); // kết quả đã tải khi hộp đang mở: xoá lùi là hiện ngay
  const failed = useRef<string | null>(null); // từ khoá vừa tìm lỗi: thôi quay vòng chờ
  const { data, error } = useApi(
    async (signal) => {
      if (q.length < MIN_CHARS) return null;
      failed.current = null;
      try {
        const result = cache.current.get(q) ?? (await searchApi.query(q, signal));
        cache.current.set(q, result);
        return result;
      } catch (err) {
        if (!signal.aborted) failed.current = q;
        throw err;
      }
    },
    [q],
  );
  const ready = typed.length >= MIN_CHARS;
  const fresh = cache.current.get(typed);
  const shown = ready ? (fresh ?? data) : null; // chưa có kết quả của chữ đang gõ thì tạm giữ kết quả trước (làm mờ)
  const pending = ready && !fresh && failed.current !== typed;
  const slow = useSlow(pending);
  const [active, setActive] = useState(0);

  const options = useMemo<Option[]>(() => {
    if (!shown) return [];
    return [
      ...shown.subjects.map((s) => ({
        key: `s-${s.code}`,
        group: "Môn học",
        label: s.name ? `${s.code} · ${s.name}` : s.code,
        hint: "",
        // Khách chưa có kho đề riêng: sang kho đề công khai thay vì bị đẩy tới trang đăng nhập
        to: `${user ? "/account/exams?tab=subject" : "/kho-de?"}&subject=${encodeURIComponent(s.code)}`.replace("?&", "?"),
      })),
      ...shown.exams.map((e) => ({
        key: `e-${e.examId}`,
        group: "Đề thi",
        label: e.title,
        hint: [e.subjectCode, e.questions ? `${e.questions} câu` : null]
          .filter(Boolean)
          .join(" · "),
        to: `/exam/${e.examId}`,
      })),
      ...shown.flashcards.map((f) => ({
        key: `f-${f.code}`,
        group: "Flashcard",
        label: f.name ? `${f.code} · ${f.name}` : f.code,
        hint: `${f.cardCount} thẻ`,
        to: `/flashcard/${encodeURIComponent(f.code)}`,
      })),
    ];
  }, [shown, user]);

  // Kết quả mới thì quay về mục đầu tiên
  useEffect(() => setActive(0), [shown]);
  const idx = Math.min(active, Math.max(0, options.length - 1));
  const maybeMore = !!shown && [shown.subjects, shown.exams, shown.flashcards].some((g) => g.length >= PER_GROUP);

  const go = (to: string) => {
    onClose();
    navigate(to);
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(Math.min(idx + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(Math.max(idx - 1, 0));
    } else if (e.key === "Enter" && options[idx]) {
      e.preventDefault();
      if (!pending) go(options[idx].to); // còn đang tìm: không mở nhầm kết quả của chữ cũ
    }
  };

  const note = "px-3 py-8 text-center text-sm text-on-surface-variant";
  return (
    <Modal onClose={onClose} maxWidth="max-w-2xl" top flush>
      <h2 className="sr-only">Tìm kiếm</h2>
      <div className="flex items-center gap-3 border-b border-outline-variant px-5">
        <span className="shrink-0 text-on-surface-variant">
          <SearchStatusIcon busy={pending} size={22} />
        </span>
        <input
          autoFocus
          data-search
          role="combobox"
          aria-label="Tìm môn học, tên đề, flashcard"
          aria-expanded={options.length > 0}
          aria-controls="search-results"
          aria-autocomplete="list"
          aria-activedescendant={options[idx] ? `search-opt-${idx}` : undefined}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          maxLength={60}
          placeholder="Tìm môn, đề, flashcard…"
          className="h-16 min-w-0 flex-1 bg-transparent text-lg text-on-surface outline-none placeholder:text-on-surface-variant"
        />
        <Kbd>Esc</Kbd>
      </div>

      <div className="max-h-[60vh] overflow-y-auto p-2">
        {!ready ? (
          <p className={note}>Nhập ít nhất {MIN_CHARS} ký tự để tìm</p>
        ) : pending && options.length === 0 ? (
          <SkeletonList rows={3} label="Đang tìm…" />
        ) : !shown ? (
          <p role="alert" className={`${note} !text-error`}>
            {error ?? "Chưa tìm được, bạn thử gõ lại nhé"}
          </p>
        ) : options.length === 0 ? (
          <p className={note}>Không có kết quả cho “{typed}”</p>
        ) : (
          <ul
            id="search-results"
            role="listbox"
            aria-label="Kết quả tìm kiếm"
            aria-busy={slow}
            className={`transition-opacity duration-200 ${slow ? "opacity-60" : ""}`}
          >
            {options.map((o, i) => (
              <Fragment key={o.key}>
                {(i === 0 || options[i - 1].group !== o.group) && (
                  <li
                    role="presentation"
                    className="px-3 pb-1 pt-3 text-xs font-medium uppercase tracking-wide text-on-surface-variant"
                  >
                    {o.group}
                  </li>
                )}
                <li
                  id={`search-opt-${i}`}
                  role="option"
                  aria-selected={i === idx}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(o.to)}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-m3-sm px-3 py-2.5 transition-colors duration-150 ${
                    i === idx
                      ? "bg-secondary-container text-on-secondary-container"
                      : "text-on-surface"
                  }`}
                >
                  <span className="min-w-0 truncate text-sm font-medium">
                    {o.label}
                  </span>
                  {o.hint && (
                    <span className="shrink-0 text-xs text-on-surface-variant">
                      {o.hint}
                    </span>
                  )}
                </li>
              </Fragment>
            ))}
          </ul>
        )}
        {options.length > 0 && maybeMore && <p className="px-3 pb-2 pt-3 text-center text-xs text-on-surface-variant">Còn kết quả khác, gõ cụ thể hơn để lọc.</p>}
      </div>
    </Modal>
  );
}
