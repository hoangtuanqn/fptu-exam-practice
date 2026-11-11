import {
  MATERIAL_EST_TOKENS_BASE,
  MATERIAL_EST_TOKENS_PER_FIGURE,
  MATERIAL_EST_TOKENS_PER_PAGE,
  MATERIAL_FIGURE_AREA_RATIO,
  MATERIAL_PAGE_TEXT_MAX,
  MATERIAL_PDF_MAGIC_WINDOW,
  MATERIAL_SCANNED_MIN_CHARS,
  MATERIAL_TITLE_MAX,
  type PageKind,
} from "../constants/materials";

// Các phép tính thuần của tính năng phân tích slide (test được không cần DB hay PDF thật).

const PDF_MAGIC = Buffer.from("%PDF-", "ascii");

/** Kiểm tra byte đầu tệp (không tin mimetype trình duyệt gửi): "%PDF-" phải nằm trong MATERIAL_PDF_MAGIC_WINDOW byte đầu. */
export const isPdfBuffer = (buf: Uint8Array) => {
  const head = Buffer.from(buf.buffer, buf.byteOffset, Math.min(buf.byteLength, MATERIAL_PDF_MAGIC_WINDOW));
  return head.indexOf(PDF_MAGIC) !== -1;
};

/** Gọn khoảng trắng và cắt theo MATERIAL_PAGE_TEXT_MAX ký tự. */
export const cleanPageText = (raw: string) =>
  raw
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim()
    .slice(0, MATERIAL_PAGE_TEXT_MAX);

/** Trang hình: ảnh lớn (hơn MATERIAL_FIGURE_AREA_RATIO diện tích). Trang scan: gần như không có chữ. Còn lại: trang chữ. */
export const classifyPage = (text: string, imageAreaRatio: number): PageKind => {
  if (text.trim().length < MATERIAL_SCANNED_MIN_CHARS) return "scanned";
  if (imageAreaRatio > MATERIAL_FIGURE_AREA_RATIO) return "figure";
  return "text";
};

export const needsVision = (kind: PageKind | string) => kind === "figure" || kind === "scanned";

/** Ước lượng token cả lượt phân tích (để từ chối sớm, không phải số chính xác). */
export const estimateTokens = ({ figurePages, pages }: { figurePages: number; pages: number }) =>
  figurePages * MATERIAL_EST_TOKENS_PER_FIGURE + pages * MATERIAL_EST_TOKENS_PER_PAGE + MATERIAL_EST_TOKENS_BASE;

/** [3,4,5,9,11,12] -> "3-5, 9, 11-12" (số trang tăng dần, bỏ trùng). */
export function pageRanges(pages: readonly number[]): string {
  const sorted = [...new Set(pages)].sort((a, b) => a - b);
  const parts: string[] = [];
  for (let i = 0; i < sorted.length; ) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j]! + 1) j++;
    parts.push(i === j ? `${sorted[i]}` : `${sorted[i]}-${sorted[j]}`);
    i = j + 1;
  }
  return parts.join(", ");
}

/** Các đoạn trang liên tiếp cùng chương (trang chưa xếp được chương = null). */
export function groupSections(pages: readonly { pageNo: number; chapterNumber: number | null }[]) {
  const sorted = [...pages].sort((a, b) => a.pageNo - b.pageNo);
  const sections: { chapterNumber: number | null; from: number; to: number }[] = [];
  for (const p of sorted) {
    const last = sections.at(-1);
    if (last && last.chapterNumber === p.chapterNumber && last.to === p.pageNo - 1) last.to = p.pageNo;
    else sections.push({ chapterNumber: p.chapterNumber, from: p.pageNo, to: p.pageNo });
  }
  return sections;
}

export const chunk = <T>(items: readonly T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

/** Tên tệp multer đọc theo latin1: đổi về UTF-8, bỏ đuôi .pdf, gọn khoảng trắng, cắt độ dài. */
export function titleFromFilename(original: string | undefined) {
  let name = original ?? "";
  try {
    const decoded = Buffer.from(name, "latin1").toString("utf8");
    if (!decoded.includes("�")) name = decoded;
  } catch {
    /* giữ nguyên */
  }
  name = name
    .replace(/\.pdf$/i, "")
    .replace(/[\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return (name || "Tài liệu").slice(0, MATERIAL_TITLE_MAX);
}

/** Chạy `worker` cho từng phần tử với tối đa `limit` việc cùng lúc. Lỗi đầu tiên dừng việc nhận phần tử mới và được ném ra. */
export async function runPool<T>(items: readonly T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  let failed: unknown = null;
  let hasFailed = false;
  const lane = async () => {
    while (!hasFailed && next < items.length) {
      const item = items[next++]!;
      try {
        await worker(item);
      } catch (err) {
        if (!hasFailed) {
          hasFailed = true;
          failed = err;
        }
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, lane));
  if (hasFailed) throw failed;
}
