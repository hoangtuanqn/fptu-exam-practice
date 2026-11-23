import {
  createContext,
  Fragment,
  useContext,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { useApi } from "@/shared/hooks/useApi";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { Kbd } from "@/shared/ui/Kbd";
import { Modal } from "@/shared/ui/Modal";
import { SkeletonList } from "@/shared/ui/Skeleton";
import { searchApi } from "./search.api";

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
        className="md-motion hidden h-10 w-44 items-center gap-2 rounded-full border border-outline-variant bg-surface-container-low px-3.5 text-sm text-on-surface-variant hover:border-on-surface/60 sm:flex lg:w-60"
      >
        <Search size={18} aria-hidden className="shrink-0" />
        <span className="flex-1 truncate text-left">Tìm kiếm…</span>
        <span className="hidden lg:block">
          <Kbd>{KEY}</Kbd>
        </span>
      </button>
      <button
        type="button"
        onClick={open}
        aria-label="Tìm kiếm"
        className="md-state md-motion flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant sm:hidden"
      >
        <Search size={20} />
      </button>
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
  const q = useDebounce(text.trim(), 250); // chờ ngừng gõ một nhịp rồi mới gọi máy chủ
  const ready = q.length >= MIN_CHARS;
  const { data, error, loading } = useApi(
    () => (ready ? searchApi.query(q) : Promise.resolve(null)),
    [q],
  );
  const [active, setActive] = useState(0);

  const options = useMemo<Option[]>(() => {
    if (!ready || !data) return [];
    return [
      ...data.subjects.map((s) => ({
        key: `s-${s.code}`,
        group: "Môn học",
        label: s.name ? `${s.code} · ${s.name}` : s.code,
        hint: "",
        // Khách chưa có kho đề riêng: sang kho đề công khai thay vì bị đẩy tới trang đăng nhập
        to: `${user ? "/account/exams?tab=subject" : "/kho-de?"}&subject=${encodeURIComponent(s.code)}`.replace("?&", "?"),
      })),
      ...data.exams.map((e) => ({
        key: `e-${e.examId}`,
        group: "Đề thi",
        label: e.title,
        hint: [e.subjectCode, e.questions != null ? `${e.questions} câu` : null]
          .filter(Boolean)
          .join(" · "),
        to: `/exam/${e.examId}`,
      })),
      ...data.flashcards.map((f) => ({
        key: `f-${f.code}`,
        group: "Flashcard",
        label: f.name ? `${f.code} · ${f.name}` : f.code,
        hint: `${f.cardCount} thẻ`,
        to: `/flashcard/${encodeURIComponent(f.code)}`,
      })),
    ];
  }, [data, ready, user]);

  // Kết quả mới thì quay về mục đầu tiên
  useEffect(() => setActive(0), [data]);
  const idx = Math.min(active, Math.max(0, options.length - 1));
  const maybeMore = !!data && [data.subjects, data.exams, data.flashcards].some((g) => g.length >= PER_GROUP);

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
      go(options[idx].to);
    }
  };

  const note = "px-3 py-8 text-center text-sm text-on-surface-variant";
  return (
    <Modal onClose={onClose} maxWidth="max-w-2xl" top flush>
      <h2 className="sr-only">Tìm kiếm</h2>
      <div className="flex items-center gap-3 border-b border-outline-variant px-5">
        <Search
          size={22}
          aria-hidden
          className="shrink-0 text-on-surface-variant"
        />
        <input
          autoFocus
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
        ) : error && !data ? (
          <p role="alert" className={`${note} !text-error`}>
            {error}
          </p>
        ) : loading && !data ? (
          <SkeletonList rows={3} label="Đang tìm…" />
        ) : data && options.length === 0 ? (
          <p className={note}>Không có kết quả cho “{q}”</p>
        ) : (
          <ul
            id="search-results"
            role="listbox"
            aria-label="Kết quả tìm kiếm"
            className={`transition-opacity duration-200 ${loading ? "opacity-60" : ""}`}
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
