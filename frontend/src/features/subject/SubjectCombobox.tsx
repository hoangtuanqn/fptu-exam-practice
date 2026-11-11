import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { BookOpen, Check, Search, X } from "lucide-react";

export interface ComboSubject {
  code: string;
  name?: string | null;
}

interface Props {
  label: string;
  subjects: ComboSubject[] | undefined; // undefined = đang tải
  value: string; // mã môn đã chọn ("" = chưa chọn)
  onChange: (code: string) => void;
  error?: string;
  placeholder?: string;
}

// Bỏ dấu tiếng Việt và viết thường để gõ "mang may tinh" vẫn ra "Mạng máy tính"
const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();

const labelOf = (s: ComboSubject) => (s.name ? `${s.code} · ${s.name}` : s.code);

/**
 * Ô chọn môn có tìm kiếm (combobox) cho form: gõ mã hoặc tên môn để lọc, mũi tên lên/xuống + Enter để chọn, Esc để đóng.
 * Môn có mã bắt đầu bằng chữ đã gõ được xếp lên trước. Danh sách cuộn được và luôn ghi rõ số môn khớp (không cắt bớt).
 */
export function SubjectCombobox({ label, subjects, value, onChange, error, placeholder = "Gõ mã hoặc tên môn, ví dụ PRO192" }: Props) {
  const id = useId();
  const listId = `${id}-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const all = useMemo(() => subjects ?? [], [subjects]);
  const selected = useMemo(() => all.find((s) => s.code === value) ?? null, [all, value]);
  const indexed = useMemo(() => all.map((s) => ({ s, code: fold(s.code), name: fold(s.name ?? "") })), [all]);

  const term = fold(query);
  const matches = useMemo(() => {
    if (!term) return all;
    const starts: ComboSubject[] = [];
    const contains: ComboSubject[] = [];
    for (const { s, code, name } of indexed) {
      if (code.startsWith(term)) starts.push(s);
      else if (code.includes(term) || name.includes(term)) contains.push(s);
    }
    return [...starts, ...contains];
  }, [all, indexed, term]);

  // Giữ ô đang sáng luôn nằm trong vùng nhìn thấy khi bấm mũi tên
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const pick = (s: ComboSubject) => {
    onChange(s.code);
    setQuery("");
    setOpen(false);
  };

  const clear = () => {
    onChange("");
    setQuery("");
    setOpen(true);
    inputRef.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return setOpen(true);
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (matches.length ? (i + step + matches.length) % matches.length : 0));
    } else if (e.key === "Enter") {
      if (open && matches[active]) {
        e.preventDefault(); // không gửi form khi đang chọn môn
        pick(matches[active]);
      }
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
      setQuery("");
    }
  };

  const loading = subjects === undefined;
  // Đang chọn môn mà không gõ gì: ô hiện tên môn đã chọn; bắt đầu gõ là tìm lại từ đầu
  const shown = open || !selected ? query : labelOf(selected);
  const showList = open && !loading;

  return (
    <div className="relative">
      <label htmlFor={id} className="md-label-large mb-1.5 block text-on-surface-variant">
        {label}
      </label>
      <div
        className={`group flex h-12 items-center gap-2 rounded-m3-md border bg-surface-container-lowest pl-3 pr-1.5 md-motion focus-within:border-primary focus-within:shadow-[inset_0_0_0_1px_var(--md-sys-color-primary),0_0_0_4px_color-mix(in_srgb,var(--md-sys-color-primary)_12%,transparent)] ${
          error ? "border-error shadow-[inset_0_0_0_1px_var(--md-sys-color-error)]" : "border-outline hover:border-on-surface"
        } ${loading ? "opacity-60" : ""}`}
      >
        <span aria-hidden className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${selected && !open ? "bg-primary-container text-on-primary-container" : "bg-surface-container-high text-on-surface-variant"}`}>
          {selected && !open ? <BookOpen size={16} /> : <Search size={16} />}
        </span>
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && matches[active] ? `${id}-opt-${active}` : undefined}
          aria-invalid={error ? true : undefined}
          autoComplete="off"
          spellCheck={false}
          disabled={loading}
          value={shown}
          placeholder={loading ? "Đang tải danh sách môn…" : selected ? labelOf(selected) : placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0); // lọc lại thì ô sáng về đầu danh sách
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onBlur={() => {
            setOpen(false);
            setQuery("");
          }}
          onKeyDown={onKeyDown}
          className={`md-body-large min-w-0 flex-1 bg-transparent text-on-surface outline-none placeholder:text-on-surface-variant disabled:cursor-wait ${selected && !open ? "font-medium" : ""}`}
        />
        {(selected || query) && !loading && (
          <button
            type="button"
            aria-label="Bỏ chọn môn"
            onMouseDown={(e) => e.preventDefault()}
            onClick={clear}
            className="md-state flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-on-surface-variant"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {showList && (
        <div className="absolute inset-x-0 top-full z-30 mt-1.5 overflow-hidden rounded-m3-md border border-outline-variant bg-surface-container-low shadow-lg">
          <p className="md-label-medium border-b border-outline-variant px-4 py-2 text-on-surface-variant" aria-live="polite">
            {term ? (matches.length ? `${matches.length} môn khớp` : "Chưa có môn nào khớp, thử mã hoặc tên khác") : `${all.length} môn · gõ để lọc`}
          </p>
          {matches.length > 0 && (
            <ul ref={listRef} id={listId} role="listbox" aria-label={label} className="max-h-72 overflow-y-auto overscroll-contain py-1">
              {matches.map((s, i) => {
                const isActive = i === active;
                const isSelected = s.code === value;
                return (
                  <li
                    key={s.code}
                    id={`${id}-opt-${i}`}
                    data-index={i}
                    role="option"
                    aria-selected={isSelected}
                    onMouseDown={(e) => e.preventDefault()} // giữ focus ở ô nhập để không đóng danh sách trước khi chọn
                    onMouseEnter={() => setActive(i)}
                    onClick={() => pick(s)}
                    className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 ${isActive ? "bg-secondary-container text-on-secondary-container" : "text-on-surface"}`}
                  >
                    <span className="md-title-small w-20 shrink-0 text-primary">{s.code}</span>
                    <span className="md-body-medium min-w-0 flex-1 truncate" title={s.name ?? undefined}>
                      {s.name || "—"}
                    </span>
                    {isSelected && <Check size={16} className="shrink-0 text-primary" />}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="md-body-small mt-1 px-4 text-error">
          {error}
        </p>
      )}
    </div>
  );
}
