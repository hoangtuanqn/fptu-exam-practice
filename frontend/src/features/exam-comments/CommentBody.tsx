import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import { Link } from "react-router-dom";
import remarkGfm from "remark-gfm";
import { markRefs } from "./format";

// Trang đề cung cấp số các câu của đề để "#12" trong bình luận thành liên kết mở câu đó (và để nút "#" của ô viết có danh sách chọn)
export const QuestionLinks = createContext<{ examId: string; numbers: readonly number[] } | null>(null);

// ||chữ|| -> liên kết giả "#spoiler" để vẽ thành chữ che.
// shortcut: đổi cả trong khối mã; viết plugin remark nếu có người cần "||" nguyên văn trong mã.
const SPOILER = /\|\|(?=\S)([^|\n]+?)\|\|/g;

function Spoiler({ children }: { children: ReactNode }) {
  const [shown, setShown] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setShown((s) => !s)}
      aria-pressed={shown}
      title={shown ? "Che lại" : "Bấm để xem"}
      className={`rounded-m3-xs px-1 text-left transition-colors ${shown ? "bg-surface-container-high" : "bg-on-surface-variant text-transparent select-none"}`}
    >
      <span aria-hidden={!shown}>{children}</span>
      {!shown && <span className="sr-only">Nội dung bị che, bấm để xem</span>}
    </button>
  );
}

const base: Components = {
  p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
  h1: ({ children }) => <h3 className="md-title-medium">{children}</h3>,
  h2: ({ children }) => <h3 className="md-title-medium">{children}</h3>,
  h3: ({ children }) => <h4 className="md-title-small">{children}</h4>,
  ul: ({ children }) => <ul className="list-disc pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5">{children}</ol>,
  blockquote: ({ children }) => <blockquote className="border-l-4 border-primary-container pl-3 text-on-surface-variant">{children}</blockquote>,
  hr: () => <hr className="border-outline-variant" />,
  table: ({ children }) => (
    <div className="overflow-x-auto">
      <table className="border-collapse text-left [&_td]:border [&_td]:border-outline-variant [&_td]:px-2.5 [&_td]:py-1 [&_th]:border [&_th]:border-outline-variant [&_th]:bg-surface-container-high [&_th]:px-2.5 [&_th]:py-1">{children}</table>
    </div>
  ),
  pre: ({ children }) => <pre className="overflow-x-auto rounded-m3-sm bg-surface-container-highest p-3 text-[13px] leading-relaxed [&_code]:bg-transparent [&_code]:p-0">{children}</pre>,
  code: ({ children }) => <code className="rounded-m3-xs bg-surface-container-highest px-1 py-0.5 font-mono text-[0.9em]">{children}</code>,
};

// Liên kết giả do SPOILER / markRefs tạo: chữ che, tên được nhắc (đậm), câu hỏi (liên kết trong app)
const withLinks = (examId: string | undefined, mentions: readonly string[]): Components => ({
  ...base,
  a: ({ href, children }) => {
    if (href === "#spoiler") return <Spoiler>{children}</Spoiler>;
    // người viết tự gõ [@X](#mention) thì chỉ là chữ thường
    if (href === "#mention") return mentions.some((n) => `@${n}` === [children].flat().join("")) ? <strong className="font-semibold">{children}</strong> : <>{children}</>;
    const question = href?.match(/^#q-(\d+)$/)?.[1];
    if (question && examId)
      return (
        <Link to={`/exam/${examId}/preview?target=${question}`} className="font-medium text-primary underline underline-offset-2">
          {children}
        </Link>
      );
    return (
      <a href={href} target="_blank" rel="nofollow noopener noreferrer" className="font-medium text-primary underline underline-offset-2">
        {children}
      </a>
    );
  },
});

// Nội dung bình luận (Markdown): không bao giờ chạy HTML thô, không tải ảnh từ địa chỉ ngoài. `mentions`: tên được nhắc để tô đậm
export function CommentBody({ body, mentions, className = "" }: { body: string; mentions?: readonly string[]; className?: string }) {
  const links = useContext(QuestionLinks);
  const numbers = useMemo(() => new Set(links?.numbers), [links]);
  const components = useMemo(() => withLinks(links?.examId, mentions ?? []), [links?.examId, mentions]);
  return (
    <div className={`md-body-medium space-y-2 break-words text-on-surface ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} disallowedElements={["img"]}>
        {markRefs(body, numbers, mentions ?? []).replace(SPOILER, "[$1](#spoiler)")}
      </ReactMarkdown>
    </div>
  );
}
