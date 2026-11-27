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
