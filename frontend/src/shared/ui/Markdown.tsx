import { Children, isValidElement, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { DotGraph } from "./DotGraph";

// Khối mã ```dot / ```graphviz là một đồ thị: trả về nguồn DOT để vẽ thành hình (xem DotGraph), ngược lại null
function dotSourceOf(children: ReactNode): string | null {
  const child = Children.toArray(children)[0];
  if (!isValidElement(child)) return null;
  const props = child.props as { className?: string; children?: ReactNode };
  const isDot = (props.className ?? "").split(" ").some((c) => c === "language-dot" || c === "language-graphviz");
  if (!isDot) return null;
  return String(props.children ?? "").trimEnd();
}

// Kiểu chữ cho từng thành phần markdown (in đậm, nghiêng, danh sách, mã, trích dẫn...). Cùng một font Inter với toàn trang.
const components: Components = {
  p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  h1: ({ children }) => <h3 className="mb-2 mt-4 text-base font-semibold text-slate-900 first:mt-0">{children}</h3>,
  h2: ({ children }) => <h3 className="mb-2 mt-4 text-base font-semibold text-slate-900 first:mt-0">{children}</h3>,
  h3: ({ children }) => <h4 className="mb-1.5 mt-3 text-sm font-semibold uppercase tracking-wide text-slate-500 first:mt-0">{children}</h4>,
  ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="pl-0.5">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="mb-3 rounded-r-lg border-l-4 border-amber-400 bg-amber-50 px-3 py-2 text-amber-900 last:mb-0 [&>p]:mb-0">{children}</blockquote>
  ),
  hr: () => <hr className="my-4 border-slate-200" />,
  // Bảng (GFM): cuộn ngang trong khung khi hẹp, ô gọn, hàng tiêu đề nổi và kẻ dòng để dễ đọc
  table: ({ children }) => (
    <div className="mb-3 overflow-x-auto rounded-lg border border-slate-200 last:mb-0">
      <table className="w-full border-collapse text-left text-[13px] leading-snug">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-slate-100 text-slate-700">{children}</thead>,
  th: ({ children }) => <th className="whitespace-nowrap px-2.5 py-1.5 font-semibold">{children}</th>,
  td: ({ children }) => <td className="border-t border-slate-200 px-2.5 py-1.5 align-top">{children}</td>,
  a: ({ href, children }) => (
    <a href={href} {...(href?.startsWith("/") ? {} : { target: "_blank", rel: "noreferrer" })} className="font-medium text-brand-700 underline underline-offset-2">
      {children}
    </a>
  ),
  // Mã trong dòng: nền nhạt. Khối mã (nằm trong <pre>): nền tối, cuộn ngang khi dài. Không dùng font đơn cách (toàn trang là Inter).
  code: ({ className, children }) =>
    className?.startsWith("language-") ? (
      <code className={className}>{children}</code>
    ) : (
      <code className="rounded bg-slate-200/70 px-1.5 py-0.5 text-[0.9em] font-medium text-slate-900">{children}</code>
    ),
  pre: ({ children }) => {
    const dot = dotSourceOf(children);
    if (dot !== null) return <DotGraph source={dot} />;
    return (
    <pre className="mb-3 overflow-x-auto whitespace-pre rounded-lg bg-surface-container-highest p-3 text-[13px] leading-relaxed text-on-surface last:mb-0 [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-on-surface">
      {children}
    </pre>
    );
  },
};

// Hiển thị nội dung markdown an toàn (không cho HTML thô). Dùng cho lời giải thích của AI.
export function Markdown({ children }: { children: string }) {
  return (
    <div className="text-sm leading-relaxed text-slate-700">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{children}</ReactMarkdown>
    </div>
  );
}
