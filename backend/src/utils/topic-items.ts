export interface TopicItem {
  id: number; // 1..n, đánh số cho AI chọn (0 dành cho "không thuộc chủ đề nào")
  label: string; // tên chủ đề lưu vào câu hỏi: chỉ dùng đúng chữ có trong syllabus, không tự đặt
  chapter?: number; // số chương trong syllabus (nếu có), dùng để đổi nhãn cũ sang nhãn mới
  hint: string; // vài mục con để AI hiểu chủ đề này gồm gì
}

interface ChapterInput {
  number: number;
  title: string;
  topics: string[];
}

// Dòng không phải nội dung kiến thức: bài lab, ôn tập, kiểm tra, thuyết trình...
const NOISE = /\b(review|revision|workshop|lab|progress test|midterm|final|exam|practical|presentation|project|assignment|quiz|test|ôn tập|kiểm tra|thực hành|bài tập lớn)\b/i;
const SESSION_HEADER = /^(?:tiết|buổi|session|week|tuần)\s*\d+\s*:?$/i;
const MAX_FLAT_ITEMS = 80;

/** Syllabus có tên cho ít nhất 2 chương có số? Chỉ khi đó mới đủ căn cứ để chia đề theo chương (không tự đặt tên chương). */
export const hasNamedChapters = (chapters: { number: number; title: string }[]) => chapters.filter((c) => c.number > 0 && c.title.trim()).length >= 2;

const clean = (s: string) => s.replace(/^[\s*+\-•(*)]+/, "").replace(/\s+/g, " ").trim();
// Syllabus có dòng viết thường ("7.1 translation"): chỉ viết hoa chữ cái đầu cho dễ đọc, không đổi nội dung
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const MAX_SUBS_IN_LABEL = 2;

/**
 * Danh sách chủ đề để AI chọn cho một môn.
 * - Môn có từ 2 chương có số trở lên: mỗi chương là một chủ đề (tên chương), kèm vài mục con làm gợi ý.
 *   Tên chương luôn là chữ trong syllabus. Nhiều môn (FLM) chỉ có số chương và các mục "2.1 ...", không có tên chương:
 *   khi đó nhãn là "Chương N: " và vài mục đầu của chương (đúng chữ trong syllabus), để các chương khác nhau không trùng tên.
 * - Môn không chia được chương (syllabus liệt kê theo buổi): mỗi mục nội dung là một chủ đề, bỏ dòng lab/ôn tập/kiểm tra.
 */
export function buildTopicItems(chapters: ChapterInput[]): TopicItem[] {
  // Không bao giờ để hai chủ đề cùng tên (so không phân biệt hoa thường, dấu câu): AI và người dùng sẽ không phân biệt được
  const seen = new Set<string>();
  return buildRaw(chapters)
    .filter((t) => {
      const key = t.label.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((t, i) => ({ ...t, id: i + 1 }));
}

function buildRaw(chapters: ChapterInput[]): TopicItem[] {
  const real = chapters.filter((c) => c.number > 0 && c.title.trim());
  if (real.length >= 2) {
    return real.map((c, i) => ({
      id: i + 1,
      chapter: c.number,
      label: cap(clean(c.title)).slice(0, 255),
      hint: c.topics.map(clean).filter((t) => t && !NOISE.test(t)).slice(0, 8).join("; "),
    }));
  }
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const raw of chapters.flatMap((c) => c.topics)) {
    const line = clean(raw);
    const key = line.toLowerCase();
    if (line.length < 4 || NOISE.test(line) || SESSION_HEADER.test(line) || seen.has(key)) continue;
    seen.add(key);
    lines.push(cap(line).slice(0, 255));
  }
  // Phần lớn dòng đánh số kiểu "3.2 ..." thì gom theo số đầu (3) thành các phần, thay vì mỗi dòng một chủ đề (quá vụn để thống kê)
  const numbered = lines.filter((l) => /^\d+\.\d+/.test(l));
  if (numbered.length >= lines.length * 0.6) {
    const groups = new Map<number, { header: string | null; subs: string[] }>();
    for (const l of lines) {
      const m = l.match(/^(\d+)(?:\.\d+)*\.?\s*(.*)$/);
      if (!m) continue;
      const n = Number(m[1]);
      const g = groups.get(n) ?? { header: null, subs: [] };
      if (/^\d+\.\s*[^\d\s]/.test(l)) g.header = m[2]!.trim(); // dòng "3. Tên chương" (nhận cả "3.Tên chương" không có dấu cách)
      else g.subs.push(m[2]!.trim() || l);
      groups.set(n, g);
    }
    const parts = [...groups.entries()].filter(([n]) => n > 0).sort((a, b) => a[0] - b[0]);
    if (parts.length >= 2) {
      return parts.map(([n, g], i) => {
        const subs = [...new Set(g.subs.map(cap).filter(Boolean))];
        const named = g.header ? cap(g.header) : subs.slice(0, MAX_SUBS_IN_LABEL).join("; ") + (subs.length > MAX_SUBS_IN_LABEL ? "; ..." : "");
        return { id: i + 1, chapter: n, label: `Chương ${n}: ${named}`.slice(0, 255), hint: subs.slice(0, 8).join("; ") };
      });
    }
  }
  return lines.slice(0, MAX_FLAT_ITEMS).map((label, i) => ({ id: i + 1, label, hint: "" }));
}
