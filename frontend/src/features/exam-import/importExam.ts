import { examImportApi } from "./exam-import.api";
import { waitForJob } from "./jobLive";
import type { CrawlJob, ImportedExam } from "./types";

export const GIVE_UP_MS = 10 * 60 * 1000;

const stageText = (j: CrawlJob) =>
  j.status === "QUEUED"
    ? j.ahead > 0
      ? `Đang xếp hàng, còn ${j.ahead} lượt phía trước`
      : "Sắp tới lượt"
    : (j.stage ?? "Đang xử lý");

/**
 * Lấy MỘT đề từ link FuOverflow: gửi link, chờ máy chủ lấy xong (tiến độ qua socket), rồi mở đề.
 * Đề đã có sẵn thì trả ngay. Ném lỗi khi gửi thất bại, job lỗi, quá thời gian hoặc bị hủy bằng `signal`.
 * `onStage` nhận dòng trạng thái để hiện cho người dùng.
 */
export async function importExam(url: string, subject: string | undefined, onStage: (stage: string) => void, signal: AbortSignal, captchaToken?: string): Promise<ImportedExam> {
  const result = await examImportApi.submit(url, subject, captchaToken);
  let examId: number;

  if (result.existed) {
    examId = result.examId;
  } else {
    onStage(stageText(result.job));
    // Tiến độ về qua socket, không cần hỏi liên tục
    const job = await waitForJob(result.job, (j) => onStage(stageText(j)), signal, GIVE_UP_MS);
    if (job.status === "FAILED" || job.examId === null) throw new Error(job.error ?? "Không nhập được đề này");
    examId = job.examId;
  }

  onStage("Đang mở đề");
  return examImportApi.exam(examId);
}
