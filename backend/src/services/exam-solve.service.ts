import fs from "node:fs/promises";
import path from "node:path";
import { storageDir } from "../configs/env";
import { AI_REPORT_FAILED_PREFIX, aiReady, AI_RETRY_COOLDOWN_MS } from "../constants/ai";
import { EXAM_STORAGE_DIR } from "../constants/crawler";
import { realtimeHub } from "../realtime/hub";
import { compactCommentsText } from "./crawler/comments-file.service";
import { examRepository } from "../repositories/exam.repository";
import { solveExam } from "./ai/exam-solver.service";
import { topicLabelerService } from "./ai/topic-labeler.service";
import { aiSettingService } from "./ai-setting.service";

/**
 * Hàng đợi nhờ AI giải đáp án, chạy NỀN và tách khỏi việc lấy đề: lấy đề xong là người dùng làm bài được ngay
 * (đáp án hiện "đang phân tích"), còn AI xử lý song song và cập nhật đáp án khi xong.
 * Giới hạn số đề giải cùng lúc để không dồn dập gọi Claude.
 */
const MAX_CONCURRENT = 2;

const waiting: number[] = [];
const running = new Set<number>();
// Lần giải lỗi gần nhất trong lượt chạy này của server (để không tự thử lại, tránh đốt token)
const lastError = new Map<number, { message: string; at: number }>();

const pump = () => {
  while (running.size < MAX_CONCURRENT && waiting.length > 0) {
    const id = waiting.shift()!;
    running.add(id);
    void run(id).finally(() => {
      running.delete(id);
      pump();
    });
  }
};

async function run(examId: number) {
  const exam = await examRepository.findForSolve(examId);
  if (!exam) return;
  if (exam.questions.length < exam.totalQuestions) return; // đề còn đang được lấy về, chưa đủ câu để giải
  const wasPending = exam.answerSource === "PENDING";

  const t0 = Date.now();
  try {
    const ai = await aiSettingService.get();
    const dir = path.join(storageDir, EXAM_STORAGE_DIR, exam.threadId);
    const rawComments = await fs.readFile(path.join(dir, "comments.txt"), "utf-8").catch(() => null);
    const commentsText = rawComments ? compactCommentsText(rawComments) : null; // bản gọn cho AI, tệp gốc giữ nguyên
    const solved = await solveExam(ai, {
      title: exam.title,
      commentsText,
      // imagePath trong DB đúng với cả đề cũ (ảnh nằm thẳng trong thư mục) lẫn đề mới (thư mục images/)
      questions: exam.questions.map((q) => ({ number: q.number, name: q.name, file: path.join(storageDir, q.imagePath) })),
    });

    await examRepository.updateAnswers(examId, solved.answers, "AI", solved.report, solved.notQuestions);
    await fs.writeFile(path.join(dir, "ans.txt"), `${solved.answers.join("\n")}\n`, "utf-8");
    await fs.writeFile(path.join(dir, "ai-report.md"), `${solved.report}\n`, "utf-8");
    lastError.delete(examId);
    void realtimeHub.publishExam(examId);
    // Gắn chủ đề cho các câu (việc phụ, chạy nền): lỗi ở đây không ảnh hưởng đáp án vừa có
    void topicLabelerService
      .labelExam(examId)
      .then((r) => {
        if (r.labels.some((l) => l.topic)) void realtimeHub.publishExam(examId);
      })
      .catch((err) => console.error(`[ai] gắn chủ đề đề ${exam.threadId} lỗi: ${(err as Error).message}`));
    const gaps = solved.unanswered.length ? `, thiếu ${solved.unanswered.length} câu (${solved.unanswered.join(",")})` : "";
    const skipped = solved.notQuestions.length ? `, ${solved.notQuestions.length} ảnh không phải câu hỏi (${solved.notQuestions.join(",")})` : "";
    console.log(`[ai] đề ${exam.threadId} đã có đáp án (${solved.answers.length} câu${gaps}${skipped}) sau ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  } catch (err) {
    const message = (err as Error).message;
    console.error(`[ai] giải đề ${exam.threadId} lỗi: ${message}`);
    lastError.set(examId, { message, at: Date.now() });
    // Ghi log lại để tra cứu (cạnh ảnh của đề) và lưu lý do vào báo cáo để admin xem ở trang Đề thi
    const dir = path.join(storageDir, EXAM_STORAGE_DIR, exam.threadId);
    await fs.appendFile(path.join(dir, "ai-error.log"), `[${new Date().toISOString()}] ${message}
`, "utf-8").catch(() => undefined);
    // Không có đáp án giả: đề chờ AI mà lỗi thì chuyển FAILED (chỉ xem đề). Giải lại một đề đã có đáp án thì giữ đáp án cũ.
    if (wasPending) {
      await examRepository.updateAnswers(examId, exam.questions.map(() => ""), "FAILED", `${AI_REPORT_FAILED_PREFIX}${message}`);
    }
    void realtimeHub.publishExam(examId); // báo lỗi cho người đang mở đề ngay lập tức
  }
}

export const examSolveService = {
  isBusy: (examId: number) => running.has(examId) || waiting.includes(examId),
  lastError: (examId: number) => lastError.get(examId)?.message ?? null,

  // Xếp đề vào hàng đợi giải. Trả về false nếu đề đã đang chờ hoặc đang giải.
  enqueue(examId: number) {
    if (this.isBusy(examId)) return false;
    lastError.delete(examId);
    waiting.push(examId);
    pump();
    return true;
  },

  /**
   * Đề cũ còn đáp án tạm (lấy lúc AI chưa bật): lần đầu có người mở thì nhờ AI giải, dùng ảnh và bình luận đã lưu
   * nên không cần lấy lại từ FuOverflow. Tiết kiệm token: chỉ giải khi có người mở, mỗi đề một lần (lỗi rồi thì
   * không tự thử lại cho tới khi khởi động lại server hoặc admin bấm giải lại). Trả về true nếu đề vừa chuyển sang chờ AI.
   */
  async upgradeIfNeeded(examId: number) {
    if (this.isBusy(examId) || lastError.has(examId)) return false;
    const exam = await examRepository.findAnswerSource(examId);
    if (exam?.answerSource !== "DEFAULT" && exam?.answerSource !== "FAILED") return false;
    const ai = await aiSettingService.get();
    if (!aiReady(ai)) return false;
    await examRepository.markPending(examId);
    void realtimeHub.publishExam(examId);
    this.enqueue(examId);
    return true;
  },

  // Người dùng bấm "Thử lại" trên đề FAILED. Mỗi đề chờ tối thiểu AI_RETRY_COOLDOWN_MS giữa hai lần.
  async retry(examId: number): Promise<"started" | "busy" | "cooldown" | "not-needed"> {
    if (this.isBusy(examId)) return "busy";
    const exam = await examRepository.findAnswerSource(examId);
    if (exam?.answerSource !== "DEFAULT" && exam?.answerSource !== "FAILED") return "not-needed";
    const last = lastError.get(examId);
    if (last && Date.now() - last.at < AI_RETRY_COOLDOWN_MS) return "cooldown";
    const ai = await aiSettingService.get();
    if (!aiReady(ai)) return "not-needed";
    await examRepository.markPending(examId);
    void realtimeHub.publishExam(examId);
    this.enqueue(examId);
    return "started";
  },

  // Khởi động lại server giữa chừng thì các đề đang chờ AI được xếp lại hàng
  async recoverPending() {
    const ids = await examRepository.findPendingIds();
    for (const id of ids) this.enqueue(id);
    return ids.length;
  },
};
