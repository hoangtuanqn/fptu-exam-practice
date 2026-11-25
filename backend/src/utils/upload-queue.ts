import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { HTTP_STATUS } from "../constants/httpStatus";
import { AppError } from "../rules/error";

/**
 * Hàng đợi tải đề chạy nền trong tiến trình: ghi tạm tệp ra đĩa (thư mục riêng), trả lời ngay, rồi xử lý LẦN LƯỢT từng lượt (một lúc một lượt).
 * shortcut: hàng đợi và lịch sử chỉ ở trong RAM, server khởi động lại giữa chừng thì lượt đang chờ mất (tệp tạm bị dọn khi khởi động); cần bền thì chuyển sang bảng job trong DB.
 */
export type UploadJobStatus = "QUEUED" | "RUNNING" | "DONE" | "FAILED";
export type StagedFile = { originalname: string; path: string };
export type UploadJobMeta = { adminId: string; kind: "create" | "update"; title: string; examId?: string };
export type UploadJobView<R> = Omit<UploadJobMeta, "adminId"> & {
  uploadId: string;
  status: UploadJobStatus;
  files: number;
  error: string | null;
  result: R | null;
  queuedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

type Job<R> = UploadJobMeta & {
  uploadId: string;
  status: UploadJobStatus;
  staged: StagedFile[];
  bytes: number;
  error: string | null;
  result: R | null;
  queuedAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  run: (files: StagedFile[]) => Promise<R>;
};

export const UPLOAD_FAILED_MESSAGE = "Không xử lý được lần tải đề này. Hãy thử lại sau.";
export const UPLOAD_QUEUE_FULL_MESSAGE = "Đang có nhiều lần tải đề chờ xử lý, hãy đợi một lúc rồi gửi tiếp.";

const iso = (d: Date | null) => (d ? d.toISOString() : null);

export function createUploadQueue<R extends { id: string }>(opts: {
  dir: string;
  maxQueued: number; // số lượt chờ (chưa chạy) tối đa
  maxStagedBytes: number; // tổng dung lượng tệp tạm của các lượt chờ + đang chạy
  keep: number; // số lượt gần nhất giữ lại để xem kết quả
  onFinish?: (adminId: string, view: UploadJobView<R>) => void;
}) {
  const jobs: Job<R>[] = []; // cũ trước, mới sau
  const waiting: Job<R>[] = [];
  let stagedBytes = 0;
  let draining = false;

  const view = (j: Job<R>): UploadJobView<R> => ({
    uploadId: j.uploadId,
    kind: j.kind,
    title: j.title,
    ...(j.examId && { examId: j.examId }),
    status: j.status,
    files: j.staged.length,
    error: j.error,
    result: j.result,
    queuedAt: j.queuedAt.toISOString(),
    startedAt: iso(j.startedAt),
    finishedAt: iso(j.finishedAt),
  });

  const trim = () => {
    while (jobs.length > opts.keep) {
      const i = jobs.findIndex((j) => j.status === "DONE" || j.status === "FAILED");
      if (i < 0) return;
      jobs.splice(i, 1);
    }
  };

  const full = (bytes = 0) => waiting.length >= opts.maxQueued || stagedBytes + bytes > opts.maxStagedBytes;

  const drain = async () => {
    if (draining) return;
    draining = true;
    try {
      for (let job = waiting.shift(); job; job = waiting.shift()) {
        job.status = "RUNNING";
        job.startedAt = new Date();
        try {
          job.result = await job.run(job.staged);
          job.examId = job.result.id;
          job.status = "DONE";
        } catch (err) {
          job.status = "FAILED";
          job.error = err instanceof AppError ? err.message : UPLOAD_FAILED_MESSAGE;
          console.error(`[exam-upload] lượt ${job.uploadId} lỗi: ${(err as Error).message}`);
        } finally {
          job.finishedAt = new Date();
          await fs.promises.rm(path.join(opts.dir, job.uploadId), { recursive: true, force: true }).catch((err: Error) => console.error(`[exam-upload] không xoá được tệp tạm: ${err.message}`));
          stagedBytes -= job.bytes;
          trim();
          try {
            opts.onFinish?.(job.adminId, view(job));
          } catch (err) {
            console.error(`[exam-upload] không báo được kết quả: ${(err as Error).message}`);
          }
        }
      }
    } finally {
      draining = false;
    }
  };

  return {
    /** Còn chỗ không (kiểm tra sớm trước khi đọc thân yêu cầu) */
    isFull: () => full(),

    /** Ghi tệp ra thư mục tạm rồi xếp hàng. Hàng đầy: 429. Lỗi ghi: xoá phần đã ghi rồi ném lại. */
    async enqueue(meta: UploadJobMeta, files: { originalname: string; buffer: Buffer }[], run: (files: StagedFile[]) => Promise<R>) {
      const bytes = files.reduce((s, f) => s + f.buffer.length, 0);
      if (full(bytes)) throw new AppError(UPLOAD_QUEUE_FULL_MESSAGE, HTTP_STATUS.TOO_MANY_REQUESTS);
      const uploadId = randomUUID();
      const dir = path.join(opts.dir, uploadId);
      stagedBytes += bytes; // giữ chỗ ngay để hai yêu cầu cùng lúc không cùng vượt mức
      const staged: StagedFile[] = [];
      try {
        await fs.promises.mkdir(dir, { recursive: true, mode: 0o700 });
        for (const [i, f] of files.entries()) {
          const p = path.join(dir, String(i)); // tên tệp do server đặt, tên gốc chỉ giữ trong RAM
          await fs.promises.writeFile(p, f.buffer, { mode: 0o600 });
          staged.push({ originalname: f.originalname, path: p });
        }
      } catch (err) {
        stagedBytes -= bytes;
        await fs.promises.rm(dir, { recursive: true, force: true }).catch(() => undefined);
        throw err;
      }
      const job: Job<R> = { ...meta, uploadId, status: "QUEUED", staged, bytes, error: null, result: null, queuedAt: new Date(), startedAt: null, finishedAt: null, run };
      jobs.push(job);
      waiting.push(job);
      trim();
      const queued = view(job); // ảnh chụp lúc xếp hàng (drain có thể chuyển ngay sang RUNNING)
      void drain();
      return queued;
    },

    /** Các lượt của một admin, mới nhất trước */
    list: (adminId: string) =>
      jobs
        .filter((j) => j.adminId === adminId)
        .reverse()
        .map(view),

    /** Xoá lượt đã xong/lỗi của admin (một lượt nếu có uploadId, không thì tất cả). Lượt đang chờ/chạy giữ nguyên. Trả số lượt đã xoá */
    remove: (adminId: string, uploadId?: string) => {
      let removed = 0;
      for (let i = jobs.length - 1; i >= 0; i--) {
        const j = jobs[i]!;
        if (j.adminId !== adminId || (uploadId && j.uploadId !== uploadId) || (j.status !== "DONE" && j.status !== "FAILED")) continue;
        jobs.splice(i, 1);
        removed++;
      }
      return removed;
    },

    /** Khi khởi động: hàng đợi cũ đã mất, xoá mọi tệp tạm còn sót */
    clearStaged: () => fs.rmSync(opts.dir, { recursive: true, force: true }),

    /** Chờ hàng đợi chạy hết (dùng trong test) */
    async idle() {
      while (draining || waiting.length) await new Promise((r) => setTimeout(r, 5));
    },
  };
}
