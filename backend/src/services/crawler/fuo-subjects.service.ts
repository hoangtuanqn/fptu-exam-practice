import * as cheerio from "cheerio";
import { prisma } from "../../configs/prisma";
import { FUO_HOST } from "../../constants/crawler";

/**
 * Kỳ học của từng môn, lấy từ mục "TÀI LIỆU CÁC MÔN HỌC" của FuOverflow (/categories/subjects/, trang công khai, không cần cookie).
 * Trang chia môn theo "Kỳ 0" đến "Kỳ 9" (/categories/semester-N/) và nhóm "Tổng hợp - Chưa rõ kỳ"; môn nằm trong nhóm sau thì chưa rõ kỳ.
 * Chỉ đọc đúng một trang, nhẹ và lịch sự (có User-Agent riêng). Kết quả ghi vào subjects.semester của các môn đã có trong hệ thống.
 */
const URL_SUBJECTS = `https://${FUO_HOST}/categories/subjects/`;
const UA = "Mozilla/5.0 (compatible; FEPassBot/1.0; +https://fepass.top)";
const SEMESTER_HREF = /\/categories\/semester-(\d)\/?$/;
const SUBJECT_CODE = /^[A-Za-z]{2,4}\d{3}[A-Za-z]?$/;

export interface SubjectSemesters {
  semesters: Map<string, number>; // mã môn -> kỳ 0-9 (môn xuất hiện ở nhiều kỳ lấy kỳ nhỏ nhất)
  unknown: string[]; // môn nằm ở nhóm "chưa rõ kỳ"
  multi: string[]; // môn xuất hiện ở nhiều kỳ
}

/** Đọc trang HTML thành danh sách môn theo kỳ. Thuần, không gọi mạng. */
export function parseSubjectSemesters(html: string): SubjectSemesters {
  const $ = cheerio.load(html);
  const semesters = new Map<string, number>();
  const unknown = new Set<string>();
  const multi = new Set<string>();

  $(".node-main").each((_, el) => {
    const node = $(el);
    const href = node.children(".node-title").find("a").first().attr("href") ?? "";
    const m = href.match(SEMESTER_HREF);
    const semester = m ? Number(m[1]) : null;
    node.find(".node-subNodeFlatList a.subNodeLink--forum").each((__, a) => {
      const code = $(a).text().replace(/\s+/g, "").toUpperCase();
      if (!SUBJECT_CODE.test(code)) return; // bỏ "Quy Định", "Hướng Dẫn..."
      if (semester === null) return void unknown.add(code);
      const prev = semesters.get(code);
      if (prev !== undefined) multi.add(code);
      if (prev === undefined || semester < prev) semesters.set(code, semester);
    });
  });
  for (const code of semesters.keys()) unknown.delete(code);
  return { semesters, unknown: [...unknown], multi: [...multi] };
}

export async function fetchSubjectSemesters(): Promise<SubjectSemesters> {
  const res = await fetch(URL_SUBJECTS, { headers: { "user-agent": UA, "accept-language": "vi,en;q=0.8" }, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`FuOverflow trả HTTP ${res.status}`);
  const data = parseSubjectSemesters(await res.text());
  // Trang đổi giao diện thì không đọc được gì: báo lỗi chứ không coi như "không có môn nào"
  if (data.semesters.size < 20) throw new Error(`Chỉ đọc được ${data.semesters.size} môn, có thể FuOverflow đã đổi giao diện trang`);
  return data;
}

export interface SyncResult {
  found: number; // môn có kỳ trên FuOverflow
  updated: number;
  unchanged: number;
  notInSystem: number; // có trên FuOverflow nhưng chưa có trong bảng subjects
  conflicts: number; // đã có kỳ khác (do admin đặt) và không ghi đè
}

/** Ghi kỳ vào subjects.semester. Mặc định chỉ điền môn chưa có kỳ (không đè giá trị admin đã đặt); `overwrite` thì đè. */
export async function syncSubjectSemesters(opts: { dryRun?: boolean; overwrite?: boolean } = {}): Promise<SyncResult & { sample: string[] }> {
  const { semesters } = await fetchSubjectSemesters();
  const rows = await prisma.subject.findMany({ where: { code: { in: [...semesters.keys()] } }, select: { code: true, semester: true } });
  const have = new Map(rows.map((r) => [r.code, r.semester]));
  const result: SyncResult = { found: semesters.size, updated: 0, unchanged: 0, notInSystem: 0, conflicts: 0 };
  const sample: string[] = [];
  for (const [code, semester] of semesters) {
    if (!have.has(code)) {
      result.notInSystem++;
      continue;
    }
    const cur = have.get(code) ?? null;
    if (cur === semester) result.unchanged++;
    else if (cur !== null && !opts.overwrite) result.conflicts++;
    else {
      if (!opts.dryRun) await prisma.subject.update({ where: { code }, data: { semester } });
      result.updated++;
      if (sample.length < 8) sample.push(`${code}: ${cur ?? "-"} -> ${semester}`);
    }
  }
  return { ...result, sample };
}
