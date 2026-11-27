import { useState, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

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

const components: Components = {
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
  a: ({ href, children }) =>
    href === "#spoiler" ? (
      <Spoiler>{children}</Spoiler>
    ) : (
      <a href={href} target="_blank" rel="nofollow noopener noreferrer" className="font-medium text-primary underline underline-offset-2">
        {children}
      </a>
    ),
};

// Nội dung bình luận (Markdown): không bao giờ chạy HTML thô, không tải ảnh từ địa chỉ ngoài
export function CommentBody({ body, className = "" }: { body: string; className?: string }) {
  return (
    <div className={`md-body-medium space-y-2 break-words text-on-surface ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} disallowedElements={["img"]}>
        {body.replace(SPOILER, "[$1](#spoiler)")}
      </ReactMarkdown>
    </div>
  );
}
