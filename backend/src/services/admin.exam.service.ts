import fs from "node:fs/promises";
import path from "node:path";
import { storageDir } from "../configs/env";
import { EXAM_STORAGE_DIR } from "../constants/crawler";
import { examRepository } from "../repositories/exam.repository";
import { AppError } from "../rules/error";
import { toMeta, type PaginationQuery } from "../utils/pagination";
import { solveExam } from "./ai/exam-solver.service";
import { aiSettingService } from "./ai-setting.service";

// Các đề đang được AI giải (trong tiến trình này). Chặn bấm "giải lại" hai lần liên tiếp tốn tiền API.
const solving = new Map<number, { startedAt: number; error?: string }>();

const solveInBackground = async (examId: number) => {
  try {
    const exam = await examRepository.findForSolve(examId);
    if (!exam) throw new Error("Không tìm thấy đề");
    const ai = await aiSettingService.get();

    const dir = path.join(storageDir, EXAM_STORAGE_DIR, exam.threadId);
    const commentsText = await fs.readFile(path.join(dir, "comments.txt"), "utf-8").catch(() => null);
    const solved = await solveExam(ai, {
      title: exam.title,
      commentsText,
      // imagePath trong DB đúng với cả đề cũ (ảnh nằm thẳng trong thư mục) lẫn đề mới (thư mục images/)
      questions: exam.questions.map((q) => ({ name: q.name, file: path.join(storageDir, q.imagePath) })),
    });

    await examRepository.updateAnswers(examId, solved.answers, "AI", solved.report);
    await fs.writeFile(path.join(dir, "ans.txt"), `${solved.answers.join("\n")}\n`, "utf-8");
    await fs.writeFile(path.join(dir, "ai-report.md"), `${solved.report}\n`, "utf-8");
    solving.delete(examId);
  } catch (err) {
    console.error(`[ai] giải lại đề ${examId} lỗi: ${(err as Error).message}`);
    solving.set(examId, { startedAt: Date.now(), error: (err as Error).message }); // giữ lỗi để admin thấy
  }
};

export const adminExamService = {
  async list(query: PaginationQuery) {
    const { items, total } = await examRepository.listAll(query);
    return {
      items: items.map((e) => ({
        ...e,
        solving: solving.has(e.id) && !solving.get(e.id)?.error,
        solveError: solving.get(e.id)?.error ?? null,
      })),
      meta: toMeta(query, total),
    };
  },

  // Bắt đầu nhờ AI giải lại và trả về ngay (việc này có thể mất vài phút); admin theo dõi ở danh sách
  async solve(id: number) {
    const ai = await aiSettingService.get();
    if (!ai.apiKey) throw new AppError("Chưa cấu hình khóa Gemini ở Quản trị → Cấu hình crawl");
    const running = solving.get(id);
    if (running && !running.error) throw AppError.conflict("Đề này đang được AI giải");
    if (!(await examRepository.findByThreadIdOfId(id))) throw AppError.notFound("Không tìm thấy đề");

    solving.set(id, { startedAt: Date.now() });
    void solveInBackground(id);
  },

  async report(id: number) {
    const exam = await examRepository.findReport(id);
    if (!exam) throw AppError.notFound("Không tìm thấy đề");
    return exam;
  },
};
