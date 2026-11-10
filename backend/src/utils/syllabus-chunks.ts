import crypto from "node:crypto";

/** Một môn như trong file JSON của tiện ích FLM (chỉ các trường dùng ở đây) */
export interface SyllabusSubject {
  code: string;
  subjectName: string;
  credits?: number | null;
  minAvgMarkToPass?: number | null;
  chapters?: { number: number | null; title: string; topics: string[] }[];
  details?: {
    info?: Record<string, string>;
    materials?: { description?: string; author?: string; publisher?: string; publishedDate?: string; edition?: string; isbn?: string; isMain?: boolean; isOnline?: boolean; note?: string }[];
    learningOutcomes?: { name?: string; details?: string }[];
    sessions?: { session?: string; topics?: string[]; type?: string; lo?: string; itu?: string; materials?: string; tasks?: string }[];
    constructiveQuestions?: { session?: string; name?: string; details?: string }[];
    assessmentDetails?: Record<string, string>[];
  };
}

export interface SyllabusChunk {
  slug: string; // CSI106:overview, CSI106:sessions:2 ... (duy nhất, ổn định giữa các lần nhập)
  kind: string;
  title: string;
  content: string;
  hash: string;
}

// Mô hình embedding nhận tối đa 2048 token mỗi đoạn; tiếng Việt tốn nhiều token hơn tiếng Anh nên giữ đoạn ngắn
export const MAX_CHUNK_CHARS = 3500;

const sha = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
const clean = (s: unknown) => String(s ?? "").replace(/\s+/g, " ").trim();
const uniq = (xs: string[]) => [...new Set(xs.filter(Boolean))];

/** Gom các dòng thành các đoạn không dài quá MAX_CHUNK_CHARS (một dòng quá dài thì tự nó thành một đoạn, bị cắt bớt) */
function pack(lines: string[]): string[][] {
  const groups: string[][] = [];
  let cur: string[] = [];
  let size = 0;
  for (const raw of lines) {
    const line = raw.length > MAX_CHUNK_CHARS ? `${raw.slice(0, MAX_CHUNK_CHARS - 1)}…` : raw;
    if (cur.length > 0 && size + line.length + 1 > MAX_CHUNK_CHARS) {
      groups.push(cur);
      cur = [];
      size = 0;
    }
    cur.push(line);
    size += line.length + 1;
  }
  if (cur.length > 0) groups.push(cur);
  return groups;
}

/**
 * Chia nội dung Syllabus của một môn thành các đoạn chữ để lập chỉ mục tìm kiếm (embedding).
 * Mỗi đoạn bắt đầu bằng "Môn CODE - Tên môn" để dù lấy riêng một đoạn ra vẫn biết nó thuộc môn nào. Không bịa thêm chữ: chỉ ghép lại nội dung đã crawl.
 */
export function buildSyllabusChunks(subject: SyllabusSubject): SyllabusChunk[] {
  const code = subject.code.trim().toUpperCase();
  const head = `Môn ${code} - ${clean(subject.subjectName)}`;
  const out: SyllabusChunk[] = [];
  const add = (kind: string, n: number | null, title: string, lines: string[]) => {
    const body = lines.map((l) => l.trim()).filter(Boolean);
    if (body.length === 0) return;
    const content = `${head}\n${title}\n${body.join("\n")}`;
    out.push({ slug: `${code}:${kind}${n === null ? "" : `:${n}`}`, kind, title: `${code} - ${title}`, content, hash: sha(content) });
  };
  const addPacked = (kind: string, title: string, lines: string[]) => pack(lines).forEach((g, i, all) => add(kind, i + 1, all.length > 1 ? `${title} (phần ${i + 1}/${all.length})` : title, g));

  const d = subject.details ?? {};
  const info = d.info ?? {};
  const field = (label: string, v: unknown) => (clean(v) ? `${label}: ${clean(v)}` : "");

  // Tổng quan
  const overview = [
    field("Tên syllabus", info["Syllabus Name"]),
    subject.credits != null ? `Số tín chỉ: ${subject.credits}` : "",
    field("Trình độ", info["Degree Level"]),
    field("Phương pháp dạy và học", info["Learning-Teaching Method"]),
    field("Phân bổ thời gian", info["Time Allocation"]),
    field("Môn tiên quyết", info["Pre-Requisite"]),
    subject.minAvgMarkToPass != null ? `Điểm trung bình tối thiểu để qua môn: ${subject.minAvgMarkToPass}` : "",
    field("Quyết định", info["DecisionNo MM/dd/yyyy"]),
    info["Description"] ? `Mô tả môn học:\n${info["Description"].trim()}` : "",
  ];
  addPacked("overview", "Tổng quan môn học", overview.flatMap((l) => l.split("\n")));

  // Nhiệm vụ sinh viên và công cụ
  addPacked("tasks", "Nhiệm vụ của sinh viên và công cụ", [info["StudentTasks"] ? `Nhiệm vụ của sinh viên:\n${info["StudentTasks"].trim()}` : "", field("Công cụ", info["Tools"])].flatMap((l) => l.split("\n")));

  // Tài liệu
  addPacked(
    "materials",
    "Tài liệu học tập",
    (d.materials ?? []).map((m) => [clean(m.description), m.author && `tác giả ${clean(m.author)}`, m.publisher && `NXB ${clean(m.publisher)}`, m.publishedDate && clean(m.publishedDate), m.edition && `lần xuất bản ${clean(m.edition)}`, m.isbn && `ISBN ${clean(m.isbn)}`, m.isMain ? "(tài liệu chính)" : "", m.isOnline ? "(trực tuyến)" : "", clean(m.note)].filter(Boolean).join(", ")),
  );

  // Chuẩn đầu ra
  addPacked("clo", "Chuẩn đầu ra của môn học (CLO)", (d.learningOutcomes ?? []).map((c) => `${clean(c.name)}: ${clean(c.details)}`));

  // Các chương: tên chương và các mục (đã suy ra ở bước crawl)
  addPacked(
    "chapters",
    "Các chương và mục nội dung",
    (subject.chapters ?? [])
      .filter((c) => (c.number ?? 0) > 0 || (c.topics ?? []).length > 0)
      .map((c) => `${c.number ? `Chương ${c.number}${clean(c.title) ? `: ${clean(c.title)}` : ""}` : clean(c.title) || "Nội dung khác"} - ${uniq((c.topics ?? []).map(clean)).join("; ")}`),
  );

  // Lịch học từng buổi
  addPacked(
    "sessions",
    "Lịch học từng buổi",
    (d.sessions ?? []).map((s) => {
      const parts = [`Buổi ${clean(s.session)}: ${uniq((s.topics ?? []).map(clean)).join("; ")}`];
      const meta = [clean(s.type), s.lo && `CLO ${clean(s.lo)}`].filter(Boolean).join(", ");
      if (meta) parts.push(`(${meta})`);
      if (clean(s.materials)) parts.push(`Tài liệu: ${clean(s.materials)}`);
      if (clean(s.tasks)) parts.push(`Nhiệm vụ: ${clean(s.tasks)}`);
      return parts.join(" ");
    }),
  );

  // Câu hỏi gợi ý của syllabus
  addPacked("cq", "Câu hỏi gợi ý của syllabus", (d.constructiveQuestions ?? []).map((q) => `[Buổi ${clean(q.session)}] ${clean(q.name)}: ${clean(q.details)}`));

  // Đánh giá
  addPacked(
    "assessment",
    "Cách đánh giá và chấm điểm",
    (d.assessmentDetails ?? []).map((a) =>
      [clean(a.category), a.type && `loại ${clean(a.type)}`, a.part && `${clean(a.part)} phần`, a.weight && `trọng số ${clean(a.weight)}`, a.completionCriteria && `điều kiện ${clean(a.completionCriteria)}`, a.duration && `thời lượng ${clean(a.duration)}`, a.clo && `CLO: ${clean(a.clo)}`, a.questionType && `dạng câu hỏi ${clean(a.questionType)}`, a.noQuestion && `số câu ${clean(a.noQuestion)}`, a.knowledgeAndSkill && `kiến thức và kỹ năng: ${clean(a.knowledgeAndSkill)}`, a.gradingGuide && `hướng dẫn chấm: ${clean(a.gradingGuide)}`, clean(a.note)]
        .filter(Boolean)
        .join("; "),
    ),
  );

  return out;
}
