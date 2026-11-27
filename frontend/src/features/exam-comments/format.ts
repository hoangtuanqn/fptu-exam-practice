// Chèn cú pháp định dạng (Markdown) vào ô bình luận. Không import gì để scripts/check-comment-format.mjs chạy thẳng bằng node.
export type Format = "bold" | "italic" | "strike" | "code" | "link" | "heading" | "bullet" | "number" | "quote" | "codeblock" | "spoiler" | "table";

export interface Edit {
  value: string;
  start: number; // vùng chọn sau khi chèn
  end: number;
}

const WRAP: Partial<Record<Format, [string, string, string]>> = {
  bold: ["**", "**", "chữ đậm"],
  italic: ["*", "*", "chữ nghiêng"],
  strike: ["~~", "~~", "chữ gạch"],
  code: ["`", "`", "mã"],
  spoiler: ["||", "||", "nội dung ẩn"],
};
const LINE: Partial<Record<Format, (n: number) => string>> = {
  heading: () => "## ",
  bullet: () => "- ",
  number: (n) => `${n + 1}. `,
  quote: () => "> ",
};
const TABLE = "| Cột 1 | Cột 2 |\n| --- | --- |\n| ô | ô |";

export function applyFormat(value: string, start: number, end: number, format: Format): Edit {
  const selected = value.slice(start, end);
  const splice = (from: number, to: number, text: string, selFrom: number, selLength: number): Edit => ({
    value: value.slice(0, from) + text + value.slice(to),
    start: from + selFrom,
    end: from + selFrom + selLength,
  });

  const wrap = WRAP[format];
  if (wrap) {
    const [open, close, sample] = wrap;
    const inner = selected || sample;
    return splice(start, end, open + inner + close, open.length, inner.length);
  }
  if (format === "link") {
    const inner = selected || "tên liên kết";
    const url = "https://";
    return splice(start, end, `[${inner}](${url})`, inner.length + 3, url.length);
  }

  // Định dạng theo dòng và theo khối bắt đầu ở đầu dòng
  const from = value.lastIndexOf("\n", start - 1) + 1;
  const prefix = LINE[format];
  if (prefix) {
    const nextBreak = value.indexOf("\n", end);
    const to = nextBreak < 0 ? value.length : nextBreak;
    const text = value
      .slice(from, to)
      .split("\n")
      .map((line, n) => prefix(n) + line)
      .join("\n");
    return splice(from, to, text, text.length, 0);
  }
  const lead = start > 0 && value[start - 1] !== "\n" ? "\n" : "";
  if (format === "table") return splice(start, end, `${lead}${TABLE}\n`, lead.length + 2, 5);
  const inner = selected || "mã của bạn";
  return splice(start, end, `${lead}\`\`\`\n${inner}\n\`\`\`\n`, lead.length + 4, inner.length);
}

// ----- Nhắc tên (@Tên) và liên kết câu hỏi (#12) khi hiển thị
// Khối mã (```...```), mã trong dòng (`...`) và chữ che (||...||) giữ nguyên: liên kết lồng trong liên kết giả của chữ che sẽ làm lộ nội dung.
// shortcut: không nhận khối mã thụt lề 4 dấu cách; thêm nếu có người dùng kiểu đó.
const CODE = /```[\s\S]*?(?:```|$)|`[^`\n]+`|\|\|(?=\S)[^|\n]+?\|\|/g;
const QUESTION_REF = /(^|[\s(])#(\d{1,4})(?![\p{L}\p{N}_])/gu;
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const escapeMarkdown = (s: string) => s.replace(/[\\[\]*_~`|]/g, "\\$&");

// Đánh dấu trong Markdown: "@Tên" -> [@Tên](#mention), "#12" (câu có trong đề) -> [#12](#q-12); CommentBody vẽ hai loại liên kết giả này
export function markRefs(body: string, questions: ReadonlySet<number>, names: readonly string[]): string {
  const sorted = [...new Set(names)].filter(Boolean).sort((a, b) => b.length - a.length); // tên dài trước để "@An Nhiên" không bị "@An" ăn mất
  const mention = sorted.length ? new RegExp(`(^|[\\s(])@(${sorted.map(escapeRegex).join("|")})(?![\\p{L}\\p{N}_])`, "gu") : null;
  const text = (s: string) => {
    const named = mention ? s.replace(mention, (_, pre: string, name: string) => `${pre}[@${escapeMarkdown(name)}](#mention)`) : s;
    return named.replace(QUESTION_REF, (all, pre: string, n: string) => (questions.has(Number(n)) ? `${pre}[#${n}](#q-${n})` : all));
  };
  let out = "";
  let last = 0;
  for (const m of body.matchAll(CODE)) {
    const at = m.index ?? 0;
    out += text(body.slice(last, at)) + m[0];
    last = at + m[0].length;
  }
  return out + text(body.slice(last));
}

// Từ "@..." đang gõ ngay trước con trỏ: vị trí dấu @ và phần chữ sau nó; không có thì null
export function mentionAt(value: string, caret: number): { start: number; query: string } | null {
  const m = /(?:^|[\s(])@([^\s@]{0,30})$/u.exec(value.slice(0, caret));
  return m ? { start: caret - m[1]!.length - 1, query: m[1]! } : null;
}
