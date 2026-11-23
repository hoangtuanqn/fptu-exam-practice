import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";

// Ô tìm kiếm trên header: gõ rồi Enter thì sang trang /search?q=... (không mở popup).
// Điện thoại: header chật nên chỉ hiện biểu tượng dẫn tới /search; `wide` là ô đầy bề ngang đặt ngay trên trang /search.
export function HeaderSearch({ wide = false }: { wide?: boolean }) {
  const navigate = useNavigate();
  const urlQ = useSearchParams()[0].get("q") ?? "";
  const [text, setText] = useState(urlQ);
  useEffect(() => setText(urlQ), [urlQ]); // đang ở trang kết quả thì ô luôn hiện từ khoá của trang

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = text.trim();
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <>
      <form role="search" onSubmit={submit} className={wide ? "relative block w-full" : "relative hidden sm:block"}>
        <Search size={18} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
        <input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={60}
          enterKeyHint="search"
          aria-label="Tìm môn học, tên đề, flashcard"
          placeholder="Tìm môn, đề, flashcard…"
          className={`md-motion h-10 rounded-full border border-outline-variant bg-surface-container-low pl-10 pr-4 text-sm text-on-surface outline-none placeholder:text-on-surface-variant hover:border-on-surface/60 focus:border-primary focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--md-sys-color-primary)_18%,transparent)] ${
            wide ? "w-full" : "w-44 lg:w-64"
          }`}
        />
      </form>
      {!wide && (
        <Link to="/search" aria-label="Tìm kiếm" className="md-state md-motion flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant sm:hidden">
          <Search size={20} />
        </Link>
      )}
    </>
  );
}
