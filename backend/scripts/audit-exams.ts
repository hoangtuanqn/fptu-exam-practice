/**
 * Kiểm tra kho đề: mỗi đề có bao nhiêu ảnh, bao nhiêu câu, bao nhiêu đáp án, bao nhiêu lời giải thích, và chỉ ra chỗ lệch.
 * CHỈ ĐỌC (DB + thư mục storage), không sửa gì, chạy được cả trên VPS.
 *
 *   npm run audit:exams                 kiểm tra mọi đề, in bảng tổng hợp + danh sách vấn đề
 *   npm run audit:exams -- --exam 51    chỉ một đề (id trong DB)
 *   npm run audit:exams -- --problems   chỉ in đề có vấn đề
 *   npm run audit:exams -- --json       in JSON (để lưu hoặc so sánh)
 *   npm run audit:exams -- --no-hash    bỏ bước so trùng ảnh (nhanh hơn)
 *   thoát với mã 1 nếu có lỗi mức ERROR (dùng được trong CI hoặc trước khi deploy)
 *
 * ERROR = người dùng sẽ gặp lỗi thật (thiếu ảnh, câu không có đáp án, đề chưa giải xong...).
 * WARN  = nên xem lại (ảnh thừa, đáp án lệch số đông bình luận...).
 * INFO  = thông tin (câu tài liệu tham khảo, độ phủ lời giải thích...).
 */
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "../src/configs/prisma";
import { storageDir } from "../src/configs/env";
import { EXAM_IMAGES_DIR, EXAM_STORAGE_DIR } from "../src/constants/crawler";
import { answersInComment } from "../src/services/ai/comment-tally";

type Level = "ERROR" | "WARN" | "INFO";
interface Issue {
  level: Level;
  code: string;
  message: string;
}

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const onlyExam = Number(args[args.indexOf("--exam") + 1]) || 0;

const ANSWER_FORMAT = /^[A-Z]( [A-Z]){0,7}$/; // "C" hoặc "A C D"; cho phép tối đa 8 đáp án
const SOLVED = new Set(["AI", "MANUAL"]); // nguồn đáp án dùng được; DEFAULT/FAILED/PENDING là chưa có đáp án thật
const MIN_IMAGE_BYTES = 500;
const CONSENSUS_MIN_VOTES = 3;
const CONSENSUS_MIN_SHARE = 0.7;

const list = (nums: number[], max = 12) => (nums.length > max ? `${nums.slice(0, max).join(", ")}… (+${nums.length - max})` : nums.join(", "));
const norm = (a: string) => a.trim().toUpperCase().split(/[^A-Z]+/).filter(Boolean).sort().join(" ");

// Bình luận theo từng câu trong comments.txt: "## Q12  (5 bình luận)" rồi mỗi bình luận một dòng "[...] tác giả (#id): nội dung"
function parseComments(text: string) {
  const byName = new Map<string, string[]>();
  for (const part of text.split(/^## /m).slice(1)) {
    const lines = part.split("\n");
    const name = lines[0]!.trim().split(/\s+/)[0]!;
    const bodies: string[] = [];
    for (const l of lines.slice(1)) {
      const m = l.match(/^\[[^\]]*\] .*? \(#\d+\): ?(.*)$/);
      if (m) bodies.push(m[1]!);
    }
    byName.set(name, bodies);
  }
  return byName;
}

const readText = (p: string) => fs.readFile(p, "utf-8").catch(() => null);

async function checkImage(file: string) {
  const buf = await fs.readFile(file).catch(() => null);
  if (!buf) return { ok: false as const, why: "không đọc được" };
  if (buf.length < MIN_IMAGE_BYTES) return { ok: false as const, why: `quá nhỏ (${buf.length} byte)` };
  const webp = buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP";
  if (!webp) return { ok: false as const, why: "không phải file WebP (hỏng hoặc tải dở)" };
  return { ok: true as const, hash: crypto.createHash("sha1").update(buf).digest("hex") };
}

async function main() {
  const exams = await prisma.exam.findMany({
    where: onlyExam ? { id: onlyExam } : {},
    orderBy: { id: "asc" },
    select: {
      id: true,
      threadId: true,
      title: true,
      totalQuestions: true,
      answerSource: true,
      aiReport: true,
      questions: { orderBy: { number: "asc" }, select: { number: true, name: true, imagePath: true, answer: true, isReference: true } },
    },
  });
  if (onlyExam && exams.length === 0) throw new Error(`Không có đề id ${onlyExam}`);

  const expl = await prisma.questionExplanation.findMany({
    where: onlyExam ? { examId: onlyExam } : {},
    select: { examId: true, questionNumber: true, content: true },
  });
  const explOf = new Map<number, { number: number; content: string }[]>();
  for (const e of expl) (explOf.get(e.examId) ?? explOf.set(e.examId, []).get(e.examId)!).push({ number: e.questionNumber, content: e.content });

  const rows: Record<string, unknown>[] = [];
  const report: { id: number; title: string; issues: Issue[] }[] = [];

  for (const exam of exams) {
    const issues: Issue[] = [];
    const add = (level: Level, code: string, message: string) => issues.push({ level, code, message });
    const qs = exam.questions;
    const dir = path.join(storageDir, EXAM_STORAGE_DIR, exam.threadId);
    const imagesDir = path.join(dir, EXAM_IMAGES_DIR);

    // ---- Ảnh và số câu
    const onDisk = (await fs.readdir(imagesDir).catch(() => null)) ?? [];
    if (onDisk.length === 0) add("ERROR", "IMG_DIR", `Thư mục ảnh trống hoặc không có (${EXAM_STORAGE_DIR}/${exam.threadId}/${EXAM_IMAGES_DIR})`);
    const referenced = new Set(qs.map((q) => path.basename(q.imagePath)));
    const orphans = onDisk.filter((f) => !referenced.has(f)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const missing: number[] = [];
    const broken: string[] = [];
    const hashes = new Map<string, number[]>();
    for (const q of qs) {
      const file = path.join(imagesDir, path.basename(q.imagePath));
      if (!onDisk.includes(path.basename(q.imagePath))) {
        missing.push(q.number);
        continue;
      }
      const r = await checkImage(file);
      if (!r.ok) broken.push(`câu ${q.number}: ${r.why}`);
      else if (!flag("no-hash")) (hashes.get(r.hash) ?? hashes.set(r.hash, []).get(r.hash)!).push(q.number);
    }

    if (qs.length < exam.totalQuestions) add("ERROR", "ROWS_LESS", `Đề khai báo ${exam.totalQuestions} câu nhưng DB chỉ có ${qs.length} (lấy đề dở dang)`);
    if (qs.length > exam.totalQuestions) add("WARN", "ROWS_MORE", `DB có ${qs.length} câu, nhiều hơn số câu khai báo ${exam.totalQuestions}`);
    const gaps: number[] = [];
    for (let n = 1; n <= qs.length; n++) if (qs[n - 1]!.number !== n) gaps.push(n);
    if (gaps.length) add("ERROR", "NUMBERING", `Số câu không liên tục từ 1 đến ${qs.length} (lệch từ vị trí ${list(gaps, 5)})`);
    if (missing.length) add("ERROR", "IMG_MISSING", `Câu ${list(missing)} có trong DB nhưng thiếu file ảnh`);
    if (broken.length) add("ERROR", "IMG_BROKEN", `Ảnh hỏng: ${broken.slice(0, 6).join("; ")}${broken.length > 6 ? "…" : ""}`);
    if (orphans.length) {
      const ext = onDisk.length - orphans.length;
      add("WARN", "IMG_EXTRA", `Trên đĩa có ${onDisk.length} ảnh nhưng DB chỉ dùng ${ext}; ảnh thừa: ${orphans.slice(0, 8).join(", ")}${orphans.length > 8 ? "…" : ""}`);
    }
    for (const nums of hashes.values()) if (nums.length > 1) add("WARN", "IMG_DUP", `Các câu ${list(nums)} dùng cùng một ảnh (có thể tải trùng)`);

    // ---- Đáp án
    const refs = qs.filter((q) => q.isReference);
    const graded = qs.filter((q) => !q.isReference);
    const blank = graded.filter((q) => q.answer.trim() === "");
    const answered = graded.filter((q) => q.answer.trim() !== "");
    if (!SOLVED.has(exam.answerSource)) {
      const why = exam.answerSource === "PENDING" ? "AI đang giải hoặc bị kẹt giữa chừng" : exam.answerSource === "FAILED" ? "AI giải thất bại" : "chưa có đáp án thật";
      add("ERROR", "SOURCE", `Nguồn đáp án là ${exam.answerSource} (${why}): người dùng chỉ xem được đề, không chấm được`);
    }
    if (blank.length) add("ERROR", "ANS_BLANK", `${blank.length}/${graded.length} câu không có đáp án (câu ${list(blank.map((q) => q.number))}); các câu này không chấm điểm và không giải thích được`);
    const badFormat = answered.filter((q) => !ANSWER_FORMAT.test(q.answer.trim()));
    if (badFormat.length) add("ERROR", "ANS_FORMAT", `Đáp án sai định dạng ở câu ${list(badFormat.map((q) => q.number))} (ví dụ "${badFormat[0]!.answer}")`);
    if (answered.length >= 10 && new Set(answered.map((q) => norm(q.answer))).size === 1) add("WARN", "ANS_SAME", `Mọi câu đều có cùng đáp án "${norm(answered[0]!.answer)}" (giống đáp án giữ chỗ)`);
    const refWithAnswer = refs.filter((q) => q.answer.trim() !== "");
    if (refWithAnswer.length) add("WARN", "REF_ANS", `Câu tài liệu tham khảo ${list(refWithAnswer.map((q) => q.number))} lại có đáp án`);
    if (refs.length) add("INFO", "REF", `${refs.length} câu là tài liệu tham khảo, không chấm (câu ${list(refs.map((q) => q.number))})`);

    // Báo cáo của AI: câu AI không chắc, câu AI cho là không phải câu hỏi, so với DB
    const report_ = exam.aiReport ?? "";
    const unsure = /marked these questions as unsure: ([^\n]*?)\./.exec(report_)?.[1];
    if (unsure) add("WARN", "AI_UNSURE", `AI ghi nhận chưa chắc ở câu: ${unsure}`);
    const noAns = /No usable answer was obtained for questions: ([^\n]*?)\./.exec(report_)?.[1];
    if (noAns && blank.length === 0) add("WARN", "AI_STALE", `Báo cáo AI nói có câu thiếu đáp án (${noAns}) nhưng DB đã có đủ (có thể đã sửa tay)`);

    // ---- Đối chiếu với bình luận trên FuOverflow (số đông bình luận nêu cùng một đáp án nhưng khác DB)
    const commentsText = await readText(path.join(dir, "comments.txt"));
    if (commentsText === null) add("WARN", "NO_COMMENTS", "Không có comments.txt (không đối chiếu được với bình luận)");
    else {
      const byName = parseComments(commentsText);
      const odd: string[] = [];
      for (const q of answered) {
        const votes = new Map<string, number>();
        let n = 0;
        for (const body of byName.get(q.name) ?? []) {
          const letters = answersInComment(body);
          if (!letters) continue;
          n++;
          const k = letters.join(" ");
          votes.set(k, (votes.get(k) ?? 0) + 1);
        }
        const top = [...votes.entries()].sort((a, b) => b[1] - a[1])[0];
        if (top && n >= CONSENSUS_MIN_VOTES && top[1] / n >= CONSENSUS_MIN_SHARE && top[0] !== norm(q.answer)) {
          odd.push(`câu ${q.number}: DB ${norm(q.answer)}, bình luận ${top[0]} (${top[1]}/${n})`);
        }
      }
      if (odd.length) add("WARN", "ANS_VS_COMMENTS", `${odd.length} câu có đáp án lệch số đông bình luận: ${odd.slice(0, 6).join("; ")}${odd.length > 6 ? "…" : ""}`);
    }

    // ---- ans.txt (bản đáp án lưu cạnh ảnh): chỉ so để biết, nguồn đúng là DB
    const ansTxt = await readText(path.join(dir, "ans.txt"));
    if (ansTxt !== null) {
      const lines = ansTxt.split(/\r?\n/).filter((l, i, a) => l.trim() !== "" || i < a.length - 1);
      const diff = qs.filter((q, i) => lines[i] !== undefined && norm(lines[i]!) !== norm(q.answer)).map((q) => q.number);
      if (lines.length !== qs.length) add("INFO", "ANS_TXT_COUNT", `ans.txt có ${lines.length} dòng, DB có ${qs.length} câu`);
      else if (diff.length) add("INFO", "ANS_TXT_DIFF", `ans.txt khác DB ở ${diff.length} câu (${list(diff)}); DB là nguồn dùng thật`);
    }

    // ---- Lời giải thích AI
    const ex = explOf.get(exam.id) ?? [];
    const gradedNums = new Set(graded.map((q) => q.number));
    const blankNums = new Set(blank.map((q) => q.number));
    const stray = ex.filter((e) => !gradedNums.has(e.number));
    if (stray.length) add("WARN", "EXPL_STRAY", `Có lời giải thích cho câu không tồn tại hoặc là tài liệu tham khảo: ${list(stray.map((e) => e.number))}`);
    const noAnswerExpl = ex.filter((e) => blankNums.has(e.number));
    if (noAnswerExpl.length) add("WARN", "EXPL_NO_ANS", `Câu ${list(noAnswerExpl.map((e) => e.number))} có lời giải thích nhưng câu không có đáp án`);
    const empty = ex.filter((e) => e.content.trim().length < 30);
    if (empty.length) add("ERROR", "EXPL_EMPTY", `Lời giải thích rỗng hoặc quá ngắn ở câu ${list(empty.map((e) => e.number))}`);
    const letters = ex.filter((e) => gradedNums.has(e.number));
    add("INFO", "EXPL_COVER", `Lời giải thích đã có: ${letters.length}/${graded.length} câu (sinh khi có người mở khoá)`);

    rows.push({
      id: exam.id,
      de: exam.title.slice(0, 34),
      nguon: exam.answerSource,
      "anh tren dia": onDisk.length,
      "cau trong DB": qs.length,
      "khai bao": exam.totalQuestions,
      "tai lieu": refs.length,
      "can cham": graded.length,
      "co dap an": answered.length,
      "thieu dap an": blank.length,
      "giai thich": letters.length,
      loi: issues.filter((i) => i.level === "ERROR").length,
      "can xem": issues.filter((i) => i.level === "WARN").length,
    });
    report.push({ id: exam.id, title: exam.title, issues });
  }

  if (flag("json")) {
    console.log(JSON.stringify({ rows, report }, null, 2));
  } else {
    console.log(`\nKiểm tra ${exams.length} đề (storage: ${storageDir})\n`);
    console.table(rows);
    const colour = { ERROR: "\x1b[31m", WARN: "\x1b[33m", INFO: "\x1b[36m" } as const;
    for (const r of report) {
      const shown = r.issues.filter((i) => !flag("problems") || i.level !== "INFO");
      if (flag("problems") && !shown.some((i) => i.level !== "INFO")) continue;
      console.log(`\n#${r.id}  ${r.title}`);
      for (const i of shown) console.log(`  ${colour[i.level]}${i.level.padEnd(5)}\x1b[0m ${i.code.padEnd(15)} ${i.message}`);
    }
  }

  const errors = report.flatMap((r) => r.issues).filter((i) => i.level === "ERROR").length;
  const warns = report.flatMap((r) => r.issues).filter((i) => i.level === "WARN").length;
  const badExams = report.filter((r) => r.issues.some((i) => i.level === "ERROR")).length;
  if (!flag("json")) {
    console.log(`\nTổng: ${exams.length} đề, ${badExams} đề có lỗi (${errors} lỗi), ${warns} cảnh báo cần xem.`);
  }
  await prisma.$disconnect();
  process.exit(errors > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(2);
});
