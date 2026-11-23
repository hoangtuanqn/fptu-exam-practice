import { createContext, Fragment, useContext, useEffect, useMemo, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useApi } from "@/shared/hooks/useApi";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { IconButton } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { SkeletonList } from "@/shared/ui/Skeleton";
import { searchApi } from "./search.api";

// Ô tìm kiếm chung: nút kính lúp trên header mở hộp thoại, Ctrl+K (⌘K) mở từ bất cứ đâu.
const SearchContext = createContext<{ open: () => void } | null>(null);

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

// Nút kính lúp đặt trên header (trang panel và trang công khai)
export function SearchButton() {
  const ctx = useContext(SearchContext);
  return (
    <IconButton label="Tìm kiếm (Ctrl+K)" onClick={() => ctx?.open()}>
      <Search size={20} />
    </IconButton>
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
  const [text, setText] = useState("");
  const q = useDebounce(text.trim(), 250); // chờ ngừng gõ một nhịp rồi mới gọi máy chủ
  const { data, error, loading } = useApi(() => (q ? searchApi.query(q) : Promise.resolve(null)), [q]);
  const [active, setActive] = useState(0);

  const options = useMemo<Option[]>(() => {
    if (!data) return [];
    return [
      ...data.subjects.map((s) => ({
        key: `s-${s.code}`,
        group: "Môn học",
        label: s.name ? `${s.code} · ${s.name}` : s.code,
        hint: "",
        to: `/account/exams?tab=subject&subject=${encodeURIComponent(s.code)}`,
      })),
      ...data.exams.map((e) => ({
        key: `e-${e.examId}`,
        group: "Đề thi",
        label: e.title,
        hint: [e.subjectCode, e.questions != null ? `${e.questions} câu` : null].filter(Boolean).join(" · "),
        to: `/exam/${e.examId}/preview`,
      })),
      ...data.flashcards.map((f) => ({
        key: `f-${f.code}`,
        group: "Flashcard",
        label: f.name ? `${f.code} · ${f.name}` : f.code,
        hint: `${f.cardCount} thẻ`,
        to: `/flashcard/${encodeURIComponent(f.code)}`,
      })),
    ];
  }, [data]);

  // Kết quả mới thì quay về mục đầu tiên
  useEffect(() => setActive(0), [data]);
  const idx = Math.min(active, Math.max(0, options.length - 1));

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

  return (
    <Modal onClose={onClose} maxWidth="40rem">
      <div className="p-4 sm:p-5">
        <h2 className="sr-only">Tìm kiếm</h2>
        <label className="relative block">
          <Search size={20} aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
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
            placeholder="Tìm môn, tên đề, flashcard…"
            className="h-12 w-full rounded-full border border-outline-variant bg-surface-container-low pl-12 pr-4 text-base outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-on-surface-variant focus:border-primary focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--md-sys-color-primary)_18%,transparent)]"
          />
        </label>

        <div className="mt-3 max-h-[60vh] overflow-y-auto">
          {!q ? (
            <p className="px-3 py-6 text-center text-sm text-on-surface-variant">Gõ mã môn (ví dụ PRO192), tên đề hoặc tên flashcard.</p>
          ) : error && !data ? (
            <p role="alert" className="px-3 py-6 text-center text-sm text-error">{error}</p>
          ) : loading && !data ? (
            <SkeletonList rows={3} label="Đang tìm…" />
          ) : data && options.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-on-surface-variant">Không có kết quả cho “{q}”.</p>
          ) : (
            <ul id="search-results" role="listbox" aria-label="Kết quả tìm kiếm" className={`transition-opacity duration-200 ${loading ? "opacity-60" : ""}`}>
              {options.map((o, i) => (
                <Fragment key={o.key}>
                  {(i === 0 || options[i - 1].group !== o.group) && (
                    <li role="presentation" className="px-3 pb-1 pt-3 text-xs font-medium uppercase tracking-wide text-on-surface-variant">
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
                      i === idx ? "bg-secondary-container text-on-secondary-container" : "text-on-surface"
                    }`}
                  >
                    <span className="min-w-0 truncate text-sm font-medium">{o.label}</span>
                    {o.hint && <span className="shrink-0 text-xs text-on-surface-variant">{o.hint}</span>}
                  </li>
                </Fragment>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
