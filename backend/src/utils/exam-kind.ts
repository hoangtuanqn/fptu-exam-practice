import type { ExamKind } from "@prisma/client";

export const EXAM_KINDS = ["FE", "PE", "QUIZ", "OTHER"] as const satisfies readonly ExamKind[];

// Từ khoá loại đề, không dính chữ/số hai bên (nhận cả "PRJ301_SU25_FE"). Khớp đầu tiên trong chuỗi quyết định loại.
const KIND_TOKEN = /(?<![A-Za-z0-9])(?:(FE|final[\s_-]*exam)|(PE|practical[\s_-]*exam)|(quizz?(?:es)?))(?![A-Za-z0-9])/i;

const kindOfText = (text: string | null | undefined): ExamKind | null => {
  const m = text ? KIND_TOKEN.exec(text) : null;
  if (!m) return null;
  return m[1] ? "FE" : m[2] ? "PE" : "QUIZ";
};

/** Loại bài trên FuOverflow: nhãn trước ("Đề Thi FE", "Đề Thi PE", "Quiz"...), không rõ thì đến từ khoá trong tên bài, còn lại OTHER. */
export const classifyKind = (label: string | null | undefined, title: string): ExamKind => kindOfText(label) ?? kindOfText(title) ?? "OTHER";
