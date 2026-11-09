import path from "node:path";
import { prisma } from "../configs/prisma";
import { storageDir } from "../configs/env";
import { FREQUENT_CACHE_MS, FREQUENT_FREE_LIMIT, FREQUENT_MATCH_BITS, FREQUENT_MAX_ITEMS, FREQUENT_MAX_NEW_HASHES } from "../constants/frequent";
import { PRO_BENEFITS } from "../constants/plan";
import { fileUrlOf } from "../utils/file-url";
import { isProUser } from "../utils/pro";
import { hammingWithin, hashQuestionImage, toWords } from "../utils/question-hash";

// "Câu hay ra": những câu xuất hiện lặp lại ở nhiều đề của cùng một môn. Ảnh được so bằng dấu vân tay vùng chữ (xem utils/question-hash),
// dấu vân tay tính một lần cho mỗi câu rồi lưu vào DB (tính dần, mỗi lượt tối đa FREQUENT_MAX_NEW_HASHES ảnh nên lượt đầu của một môn lớn có thể báo "đang phân tích").

export interface FrequentItem {
  count: number; // số đề (khác nhau) có câu này
  examId: number;
  threadId: string;
  examTitle: string;
  number: number;
  imageUrl: string;
  answer: string[];
  topic: string | null;
  conflict: boolean; // các đề ghi đáp án khác nhau cho cùng một câu: đáng kiểm tra lại
}

interface Computed {
  totalExams: number;
  analyzed: number; // số câu đã có dấu vân tay
  total: number; // tổng số câu của môn
  items: FrequentItem[]; // đã sắp xếp: lặp nhiều nhất trước
}

const cache = new Map<string, { at: number; sig: string; data: Computed }>();

const norm = (answer: string) => answer.split(/\s+/).filter(Boolean).sort().join(" ");

async function compute(code: string): Promise<Computed> {
  const exams = await prisma.exam.findMany({
    where: { subjectCode: code, answerSource: { in: ["AI", "MANUAL"] } },
    select: { id: true, title: true, threadId: true },
  });
  if (exams.length === 0) return { totalExams: 0, analyzed: 0, total: 0, items: [] };

  const examOf = new Map(exams.map((e) => [e.id, e]));
  const rows = await prisma.examQuestion.findMany({
    where: { examId: { in: exams.map((e) => e.id) }, isReference: false },
    select: { id: true, examId: true, number: true, imagePath: true, answer: true, topic: true, imageHash: true },
  });

  // Tính dấu vân tay còn thiếu (một lượt tính tối đa một số ảnh, các lượt sau tính tiếp)
  const missing = rows.filter((r) => !r.imageHash).slice(0, FREQUENT_MAX_NEW_HASHES);
  for (let i = 0; i < missing.length; i += 8) {
    await Promise.all(
      missing.slice(i, i + 8).map(async (r) => {
        const hash = await hashQuestionImage(path.join(storageDir, r.imagePath));
        if (hash) {
          r.imageHash = hash;
          await prisma.examQuestion.update({ where: { id: r.id }, data: { imageHash: hash } });
        }
      }),
    );
  }

  const hashed = rows.filter((r) => r.imageHash);
  const words = hashed.map((r) => toWords(r.imageHash!));
  const parent = hashed.map((_, i) => i);
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x]!)));
  for (let i = 0; i < hashed.length; i++) {
    for (let j = i + 1; j < hashed.length; j++) {
      if (hashed[i]!.examId === hashed[j]!.examId) continue; // cùng một đề thì không tính là "ra lại"
      if (find(i) === find(j)) continue;
      if (hammingWithin(words[i]!, words[j]!, FREQUENT_MATCH_BITS) <= FREQUENT_MATCH_BITS) parent[find(i)] = find(j);
    }
  }

  const groups = new Map<number, number[]>();
  hashed.forEach((_, i) => (groups.get(find(i)) ?? groups.set(find(i), []).get(find(i))!).push(i));

  const items: FrequentItem[] = [];
  for (const idxs of groups.values()) {
    const members = idxs.map((i) => hashed[i]!);
    const distinct = new Set(members.map((m) => m.examId));
    if (distinct.size < 2) continue;
    const rep = members.reduce((a, b) => (b.examId > a.examId ? b : a)); // bản ở đề mới nhất
    const exam = examOf.get(rep.examId)!;
    items.push({
      count: distinct.size,
      examId: rep.examId,
      threadId: exam.threadId,
      examTitle: exam.title,
      number: rep.number,
      imageUrl: fileUrlOf(rep.imagePath),
      answer: rep.answer.split(/\s+/).filter(Boolean),
      topic: members.find((m) => m.topic)?.topic ?? null,
      conflict: new Set(members.map((m) => norm(m.answer))).size > 1,
    });
  }
  items.sort((a, b) => b.count - a.count || Number(b.conflict) - Number(a.conflict) || a.examTitle.localeCompare(b.examTitle));
  return { totalExams: exams.length, analyzed: hashed.length, total: rows.length, items: items.slice(0, FREQUENT_MAX_ITEMS) };
}

export const frequentQuestionsService = {
  /** Câu hay ra của một môn. Gói thường chỉ nhận FREQUENT_FREE_LIMIT câu đầu (khóa ở máy chủ), phần còn lại chỉ báo số lượng. */
  async forSubject(codeRaw: string, user: unknown) {
    const code = codeRaw.toUpperCase();
    // Chữ ký = số đề dùng được của môn (một truy vấn đếm theo chỉ mục, không quét bảng). Có đề mới thì tính lại ngay;
    // còn dấu vân tay tính dần thì tính tiếp khi cache hết hạn.
    const hit = cache.get(code);
    let data: Computed;
    if (hit && Date.now() - hit.at < FREQUENT_CACHE_MS && hit.sig === String(await prisma.exam.count({ where: { subjectCode: code, answerSource: { in: ["AI", "MANUAL"] } } }))) data = hit.data;
    else {
      const sig = String(await prisma.exam.count({ where: { subjectCode: code, answerSource: { in: ["AI", "MANUAL"] } } }));
      data = await compute(code);
      cache.set(code, { at: Date.now(), sig, data });
    }

    const pro = PRO_BENEFITS.frequentQuestions && isProUser(user);
    const shown = pro ? data.items : data.items.slice(0, FREQUENT_FREE_LIMIT);
    return {
      subject: code,
      totalExams: data.totalExams,
      repeated: data.items.length,
      pending: Math.max(0, data.total - data.analyzed), // câu chưa được phân tích ảnh: kết quả sẽ đầy đủ dần
      locked: !pro && data.items.length > shown.length,
      hidden: data.items.length - shown.length,
      items: shown,
    };
  },
};
