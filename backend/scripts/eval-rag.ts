/**
 * Đo và chỉnh pipeline RAG cho Syllabus.
 *
 *   npm run eval:rag -- ../flm-syllabus-2026-11-10.json
 *
 * Làm gì:
 *  1. Tạo bộ câu hỏi mẫu từ chính dữ liệu (tín chỉ, giáo trình, CLO, cách đánh giá, chương, mô tả, nhiệm vụ) với cách hỏi đa dạng,
 *     câu hỏi tìm môn không nêu mã, và câu hỏi KHÔNG có đáp án trong syllabus (học phí, giảng viên, lạc đề).
 *  2. So sánh các cách tìm: chỉ embedding, chỉ BM25, trộn RRF và pipeline đầy đủ (kèm xác suất), trên phần câu hỏi dành riêng để kiểm tra.
 *  3. Học hệ số xác suất (hồi quy logistic) trên phần huấn luyện và in ra để dán vào src/constants/rag.ts, cùng bảng ngưỡng.
 * Cần khoá OpenAI (biến OPENAI_API_KEY hoặc trang quản trị) để tạo vector cho câu hỏi; vector được cache vào file RAG_EVAL_CACHE (nếu đặt) để chạy lại không tốn thêm.
 */
import fs from "node:fs";
import { prisma } from "../src/configs/prisma";
import { EMBEDDING_MODEL } from "../src/constants/chat";
import { RAG_WEIGHTS, type RagWeights } from "../src/constants/rag";
import { embedDocuments } from "../src/services/ai/embedding.client";
import { chatSettingService } from "../src/services/chat-setting.service";
import { candidates, probability, type RagHit } from "../src/services/syllabus-rag.service";
import type { SyllabusSubject } from "../src/utils/syllabus-chunks";

// ---------------------------------------------------------------- dữ liệu mẫu
let seed = 42;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)]!;
const shuffle = <T,>(xs: T[]) => xs.map((x) => [rnd(), x] as const).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

interface Case {
  kind: "subject" | "cross" | "neg-subject" | "neg-cross";
  field: string;
  q: string;
  code?: string;
  mustContain?: string; // câu trả lời nằm trong đoạn chứa chuỗi này (so sánh không phân biệt hoa thường)
  split: "train" | "test";
}

function makeCases(subjects: SyllabusSubject[]): Case[] {
  const cases: Case[] = [];
  const add = (c: Omit<Case, "split">) => cases.push({ ...c, split: rnd() < 0.7 ? "train" : "test" });
  const rich = shuffle(subjects.filter((s) => s.details && (s.details.learningOutcomes ?? []).length > 0 && (s.details.assessmentDetails ?? []).length > 0));
  for (const s of rich.slice(0, 70)) {
    const code = s.code.toUpperCase();
    const d = s.details!;
    if (s.credits != null) add({ kind: "subject", field: "credits", code, q: pick([`${code} có bao nhiêu tín chỉ?`, `môn ${code} mấy tín chỉ vậy`, `cho mình hỏi số tín chỉ của ${code}`, `${code} nặng bao nhiêu chỉ`, `học ${code} được mấy chỉ`]), mustContain: `Số tín chỉ: ${s.credits}` });
    const main = (d.materials ?? []).find((m) => m.isMain && (m.description ?? "").length > 8);
    if (main) add({ kind: "subject", field: "materials", code, q: pick([`giáo trình chính của môn ${code} là gì?`, `${code} học bằng sách nào`, `tài liệu học tập của ${code}`, `phải đọc cuốn nào để học ${code}`, `${code} dùng quyển gì làm tài liệu chính`]), mustContain: main.description!.slice(0, 30) });
    const clo = (d.learningOutcomes ?? [])[0];
    if (clo?.name && (clo.details ?? "").length > 20) add({ kind: "subject", field: "clo", code, q: pick([`${clo.name} của môn ${code} là gì?`, `chuẩn đầu ra ${clo.name} môn ${code}`, `học xong ${code} thì mình làm được những gì`, `sau khóa ${code} sinh viên đạt được gì`]), mustContain: clo.details!.slice(0, 40) });
    const as = (d.assessmentDetails ?? []).find((a) => (a.category ?? "").length >= 5);
    if (as) add({ kind: "subject", field: "assessment", code, q: pick([`${code} đánh giá và chấm điểm thế nào?`, `môn ${code} tính điểm ra sao, trọng số bao nhiêu`, `cách chấm điểm ${code}`, `phải qua những bài nào mới đậu ${code}`, `${code} thi cử kiểm tra những gì`]), mustContain: as.category! });
    const ch = (s.chapters ?? []).find((c) => c.number === 2 && (c.title ?? "").length >= 6);
    if (ch) add({ kind: "subject", field: "chapters", code, q: pick([`${code} chương 2 học về gì?`, `chương 2 của môn ${code} nói về cái gì`, `bài thứ hai của ${code} là phần nào`, `${code} sau chương đầu thì học tiếp gì`]), mustContain: `Chương 2: ${ch.title.slice(0, 20)}` });
    const desc = d.info?.["Description"];
    if (desc && desc.length > 60) add({ kind: "subject", field: "overview", code, q: pick([`môn ${code} học về cái gì?`, `mô tả môn học ${code}`, `${code} là môn gì`, `${code} dạy gì vậy`, `kể sơ qua về ${code}`]), mustContain: desc.trim().slice(0, 40) });
    const tasks = d.info?.["StudentTasks"];
    if (tasks && tasks.length > 60) add({ kind: "subject", field: "tasks", code, q: pick([`sinh viên học ${code} phải làm gì?`, `yêu cầu của môn ${code} đối với sinh viên`, `mình cần chuẩn bị gì khi học ${code}`, `${code} có bắt buộc đi học đủ không`]), mustContain: tasks.trim().slice(0, 40) });
    // Không có trong syllabus: không được trả lời bừa
    add({ kind: "neg-subject", field: "no-answer", code, q: pick([`${code} học phí bao nhiêu tiền?`, `giảng viên dạy môn ${code} là ai`, `${code} thi vào ngày nào`, `địa chỉ phòng học môn ${code}`]) });
  }
  // Tìm môn theo nội dung, không nêu mã
  for (const s of shuffle(rich).slice(0, 150)) {
    const ch = (s.chapters ?? []).find((c) => (c.number ?? 0) > 0 && (c.title ?? "").length >= 18);
    if (ch) add({ kind: "cross", field: "find-subject", code: s.code.toUpperCase(), q: pick([`môn nào có chương ${ch.title}?`, `mình muốn học về ${ch.title}, môn nào dạy?`, `có môn nào học ${ch.title} không`, `${ch.title} nằm trong môn nào`]) });
  }
  for (const q of ["môn nào dạy nấu phở bò", "môn học về bitcoin giá hôm nay", "làm sao chọn môn khi lấy đề thi", "môn nào dễ qua nhất", "môn học của khoa y", "hôm nay môn gì", "môn nào có thầy đẹp trai", "chọn môn như thế nào để học tốt", "syllabus là gì", "môn nào dạy lái máy bay", "tôi muốn đổi môn trong kho đề", "môn học nào nhiều tín chỉ nhất thế giới", "lấy đề môn này mất bao nhiêu credit", "môn nào học phí rẻ nhất", "cho mình danh sách môn có thể làm đề", "môn nào có đề FE dễ", "thêm môn mới vào hệ thống ở đâu", "môn học này của trường nào", "môn nào dạy chơi guitar", "môn nào học về thời tiết hôm nay", "đăng ký môn học ở đâu", "môn nào cho điểm cao", "môn nào không có bài tập", "học môn nào để đi du học", "môn nào do thầy Nam dạy", "mình bị trượt môn thì làm sao", "chọn môn để làm bộ đề theo chương ở đâu", "môn tiếng Pháp có không", "môn nào dạy trồng cây", "cho mình hỏi môn học là gì"]) add({ kind: "neg-cross", field: "off-topic", q });
  return cases;
}

// ---------------------------------------------------------------- logistic regression
interface Ex { x: [number, number, number]; y: 0 | 1 }
const KIND_CAP = 1.5; // ý định chỉ là ưu tiên cộng thêm: không để bộ câu hỏi mẫu (viết theo đúng từ khoá) làm nó lấn át embedding và BM25
function fit(data: Ex[], useDense: boolean): { b: number; dense: number; lex: number; kind: number } {
  // chuẩn hoá từng đặc trưng (trung bình 0, độ lệch 1) để hội tụ nhanh và công bằng giữa embedding (dải hẹp) và BM25
  const cols = [0, 1, 2].map((j) => data.map((d) => d.x[j]!));
  const mean = cols.map((c) => c.reduce((a, b) => a + b, 0) / Math.max(1, c.length));
  const std = cols.map((c, j) => Math.sqrt(c.reduce((a, b) => a + (b - mean[j]!) ** 2, 0) / Math.max(1, c.length)) || 1);
  const w = [-1, useDense ? 1 : 0, 1, 0.3]; // b, dense, lex, kind (trên thang đã chuẩn hoá)
  const lr = 0.3;
  for (let it = 0; it < 3000; it++) {
    const g = [0, 0, 0, 0];
    for (const { x, y } of data) {
      const z = w[0]! + (useDense ? w[1]! * ((x[0] - mean[0]!) / std[0]!) : 0) + w[2]! * ((x[1] - mean[1]!) / std[1]!) + w[3]! * ((x[2] - mean[2]!) / std[2]!);
      const e = 1 / (1 + Math.exp(-z)) - y;
      g[0] += e;
      g[1] += useDense ? (e * (x[0] - mean[0]!)) / std[0]! : 0;
      g[2] += (e * (x[1] - mean[1]!)) / std[1]!;
      g[3] += (e * (x[2] - mean[2]!)) / std[2]!;
    }
    for (let i = 0; i < 4; i++) w[i] = w[i]! - lr * (g[i]! / data.length + 0.01 * w[i]!);
    if (!useDense) w[1] = 0;
    w[3] = Math.min(w[3]!, (KIND_CAP * std[2]!));
  }
  // về thang gốc
  const dense = w[1]! / std[0]!, lex = w[2]! / std[1]!, kind = Math.min(KIND_CAP, w[3]! / std[2]!);
  const b = w[0]! - (useDense ? (w[1]! * mean[0]!) / std[0]! : 0) - (w[2]! * mean[1]!) / std[1]! - (w[3]! * mean[2]!) / std[2]!;
  return { b, dense, lex, kind };
}

// ---------------------------------------------------------------- chạy
async function main() {
  const file = process.argv.slice(2).find((a) => !a.startsWith("--"));
  if (!file) throw new Error("Thiếu đường dẫn file JSON syllabus");
  const data = JSON.parse(fs.readFileSync(file, "utf8").replace(/^﻿/, "")) as { subjects: SyllabusSubject[] };
  const cases = makeCases(data.subjects);

  // Vector câu hỏi (cache để chạy lại không gọi API)
  const cachePath = process.env.RAG_EVAL_CACHE;
  const cache: Record<string, number[]> = cachePath && fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath, "utf8")) : {};
  const missing = [...new Set(cases.map((c) => c.q))].filter((q) => !cache[q]);
  if (missing.length) {
    const key = (await chatSettingService.get()).openaiApiKey;
    if (!key) throw new Error("Thiếu khoá OpenAI để tạo vector cho câu hỏi mẫu (đặt OPENAI_API_KEY)");
    console.log(`Tạo vector cho ${missing.length} câu hỏi mẫu (${EMBEDDING_MODEL}, khoảng ${Math.round((missing.join(" ").length / 3.2) / 1000)} nghìn token)…`);
    const vecs = await embedDocuments(key, missing);
    missing.forEach((q, i) => (cache[q] = vecs[i]!));
    if (cachePath) fs.writeFileSync(cachePath, JSON.stringify(cache));
  }

  type Row = { c: Case; dense: Awaited<ReturnType<typeof candidates>>; lex: Awaited<ReturnType<typeof candidates>> };
  const rows: Row[] = [];
  for (const c of cases) rows.push({ c, dense: await candidates(c.q, cache[c.q]!, undefined, { allContent: true }), lex: await candidates(c.q, null, undefined, { allContent: true }) });

  // nhãn của một đoạn
  const isPos = (c: Case, h: RagHit) => (c.kind === "subject" ? h.content.toLowerCase().replace(/\s+/g, " ").includes(norm(c.mustContain!)) : c.kind === "cross" ? h.subject === c.code || h.subject.startsWith(c.code!) : false);
  const usable = rows.filter((r) => (r.c.kind === "subject" ? r.dense.list.some((h) => isPos(r.c, h)) : true));
  console.log(`\nCâu hỏi mẫu: ${cases.length} (dùng được ${usable.length}); huấn luyện ${usable.filter((r) => r.c.split === "train").length}, kiểm tra ${usable.filter((r) => r.c.split === "test").length}`);
  const by = (k: Case["kind"], split?: Case["split"]) => usable.filter((r) => r.c.kind === k && (!split || r.c.split === split));

  // ---- 1. so sánh cách tìm (chỉ trên phần kiểm tra)
  const rank = (list: RagHit[], score: (h: RagHit) => number) => [...list].sort((a, b) => score(b) - score(a));
  const rrf = (list: RagHit[]) => {
    const a = rank(list, (h) => h.cos), b = rank(list, (h) => h.lex);
    const s = new Map<string, number>();
    a.forEach((h, i) => s.set(h.slug, (s.get(h.slug) ?? 0) + 1 / (60 + i + 1)));
    b.forEach((h, i) => s.set(h.slug, (s.get(h.slug) ?? 0) + 1 / (60 + i + 1)));
    return rank(list, (h) => s.get(h.slug)!);
  };
  const metrics = (rs: Row[], order: (r: Row) => RagHit[]) => {
    let h1 = 0, h3 = 0, h5 = 0, mrr = 0;
    for (const r of rs) {
      const pos = order(r).findIndex((h) => isPos(r.c, h));
      if (pos === 0) h1++;
      if (pos >= 0 && pos < 3) h3++;
      if (pos >= 0 && pos < 5) h5++;
      if (pos >= 0) mrr += 1 / (pos + 1);
    }
    const n = Math.max(1, rs.length);
    return `hit@1 ${(100 * h1 / n).toFixed(0)}%  hit@3 ${(100 * h3 / n).toFixed(0)}%  hit@5 ${(100 * h5 / n).toFixed(0)}%  MRR ${(mrr / n).toFixed(2)}`;
  };
  const crossOrder = (get: (r: Row) => RagHit[]) => (r: Row) => {
    const seen = new Set<string>();
    return get(r).filter((h) => !seen.has(h.subject) && (seen.add(h.subject), true));
  };
  const sub = by("subject", "test");
  console.log(`\n== Hỏi trong một môn (kiểm tra: ${sub.length} câu), đoạn đúng nằm ở hạng:`);
  console.log("  chỉ embedding    ", metrics(sub, (r) => rank(r.dense.list, (h) => h.cos)));
  console.log("  chỉ BM25         ", metrics(sub, (r) => rank(r.dense.list, (h) => h.lex)));
  console.log("  trộn RRF         ", metrics(sub, (r) => rrf(r.dense.list)));
  console.log("  pipeline đầy đủ  ", metrics(sub, (r) => r.dense.list), "(embedding + BM25 + ý định + xác suất)");
  console.log("  pipeline không embedding (BM25 + ý định)", metrics(sub, (r) => r.lex.list));
  console.log("  pipeline không có ý định (chỉ embedding + BM25)", metrics(sub, (r) => rank(r.dense.list, (h) => probability(RAG_WEIGHTS.subject.hybrid, { cos: h.cos, lex: h.lex, kind: false }))));
  const natural = sub.filter((r) => !/(tin chi|giao trinh|chuan dau ra|clo|danh gia|cham diem|trong so|chuong|mo ta|tai lieu)/.test(norm(r.c.q).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d")));
  console.log(`  -- riêng ${natural.length} câu hỏi tự nhiên (không chứa từ khoá ý định): đầy đủ`, metrics(natural, (r) => r.dense.list), "| chỉ embedding", metrics(natural, (r) => rank(r.dense.list, (h) => h.cos)), "| chỉ BM25", metrics(natural, (r) => rank(r.dense.list, (h) => h.lex)));
  const crs = by("cross", "test");
  console.log(`\n== Tìm môn theo nội dung, không nêu mã (kiểm tra: ${crs.length} câu), môn đúng nằm ở hạng:`);
  console.log("  chỉ embedding    ", metrics(crs, crossOrder((r) => rank(r.dense.list, (h) => h.cos))));
  console.log("  chỉ BM25         ", metrics(crs, crossOrder((r) => rank(r.dense.list, (h) => h.lex))));
  console.log("  trộn RRF         ", metrics(crs, crossOrder((r) => rrf(r.dense.list))));
  console.log("  pipeline đầy đủ  ", metrics(crs, crossOrder((r) => r.dense.list)));
  console.log("  pipeline không embedding", metrics(crs, crossOrder((r) => r.lex.list)));

  // ---- 2. học hệ số xác suất trên phần huấn luyện
  const examples = (rs: Row[], get: (r: Row) => RagHit[], dense: boolean): Ex[] =>
    rs.flatMap((r) => get(r).map((h) => ({ x: [dense ? h.cos : 0, h.lex, h.kindMatch ? 1 : 0] as [number, number, number], y: (isPos(r.c, h) ? 1 : 0) as 0 | 1 })));
  const trainSub = [...by("subject", "train"), ...by("neg-subject", "train")];
  const trainCross = [...by("cross", "train"), ...by("neg-cross", "train")];
  const fitted: Record<string, Record<string, RagWeights>> = { subject: {}, cross: {} };
  for (const [mode, rs] of [["subject", trainSub], ["cross", trainCross]] as const) {
    for (const dense of [true, false]) {
      const f = fit(examples(rs, (r) => (dense ? r.dense.list : r.lex.list), dense), dense);
      fitted[mode]![dense ? "hybrid" : "lexical"] = { ...f, include: RAG_WEIGHTS[mode][dense ? "hybrid" : "lexical"].include, answer: RAG_WEIGHTS[mode][dense ? "hybrid" : "lexical"].answer };
    }
  }

  // pipeline đầy đủ với hệ số vừa học (chỉ tính trên phần kiểm tra, không dùng dữ liệu huấn luyện)
  const refit = async (rs: Row[], mode: "subject" | "cross", dense: boolean) => Promise.all(rs.map(async (r) => ({ ...r, [dense ? "dense" : "lex"]: await candidates(r.c.q, dense ? cache[r.c.q]! : null, fitted[mode]![dense ? "hybrid" : "lexical"]!, { allContent: true }) })));
  const subFit = (await refit(sub, "subject", true)) as Row[];
  const subFitLex = (await refit(sub, "subject", false)) as Row[];
  const crsFit = (await refit(crs, "cross", true)) as Row[];
  console.log("\n== Với hệ số đã học (phần kiểm tra):");
  console.log("  hỏi trong một môn, đầy đủ         ", metrics(subFit, (r) => r.dense.list));
  console.log("  hỏi trong một môn, không embedding", metrics(subFitLex, (r) => r.lex.list));
  console.log("  tìm môn không nêu mã, đầy đủ      ", metrics(crsFit, crossOrder((r) => r.dense.list)));

  // ---- 3. bảng ngưỡng (phần kiểm tra): tỉ lệ trả lời đúng khi có đáp án và tỉ lệ trả lời bừa khi không có
  for (const [mode, pos, neg] of [["subject", by("subject", "test"), by("neg-subject", "test")], ["cross", by("cross", "test"), by("neg-cross", "test")]] as const) {
    for (const dense of [true, false]) {
      const w = fitted[mode]![dense ? "hybrid" : "lexical"]!;
      const top = (r: Row) => {
        const list = (dense ? r.dense.list : r.lex.list).map((h) => ({ h, p: probability(w, { cos: dense ? h.cos : 0, lex: h.lex, kind: h.kindMatch }) })).sort((a, b) => b.p - a.p);
        return list;
      };
      console.log(`\n== Ngưỡng "có câu trả lời" - ${mode} - ${dense ? "có embedding" : "không embedding"} (có đáp án: ${pos.length}, không có đáp án: ${neg.length})`);
      console.log("  ngưỡng | trả lời đúng ở hạng 1 | có đáp án nhưng từ chối | không có đáp án mà vẫn trả lời");
      for (const t of [0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.5]) {
        const right = pos.filter((r) => { const l = top(r); return l[0] && l[0].p >= t && (mode === "cross" ? crossOrder(() => l.map((x) => x.h))(r).slice(0, 5).some((h) => isPos(r.c, h)) : isPos(r.c, l[0].h)); }).length;
        const refused = pos.filter((r) => (top(r)[0]?.p ?? 0) < t).length;
        const bogus = neg.filter((r) => (top(r)[0]?.p ?? 0) >= t).length;
        console.log(`  ${t.toFixed(1)}    | ${(100 * right / Math.max(1, pos.length)).toFixed(0).padStart(3)}%                  | ${(100 * refused / Math.max(1, pos.length)).toFixed(0).padStart(3)}%                     | ${(100 * bogus / Math.max(1, neg.length)).toFixed(0).padStart(3)}%`);
      }
    }
  }

  const r = (x: number) => Math.round(x * 100) / 100;
  console.log("\n== Hệ số đã học (dán vào RAG_WEIGHTS trong src/constants/rag.ts, rồi chọn include/answer theo bảng ngưỡng):");
  console.log(JSON.stringify(Object.fromEntries(Object.entries(fitted).map(([m, v]) => [m, Object.fromEntries(Object.entries(v).map(([k, w]) => [k, { b: r(w.b), dense: r(w.dense), lex: r(w.lex), kind: r(w.kind) }]))])), null, 1));
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e instanceof Error ? e.message : e);
  await prisma.$disconnect();
  process.exit(1);
});
