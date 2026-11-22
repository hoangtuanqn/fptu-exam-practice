import { examUploadTempDir } from "../configs/env";
import { EXAM_UPLOAD_JOBS_KEPT, EXAM_UPLOAD_MAX_QUEUED, EXAM_UPLOAD_MAX_STAGED_BYTES } from "../constants/exam-upload";
import { realtimeHub } from "../realtime/hub";
import type { ExamUploadResult } from "../services/admin.exam-upload.service";
import { createUploadQueue } from "../utils/upload-queue";

// Admin tải đề chạy nền (?async=1): một hàng đợi cho cả server, mỗi lúc một lượt (ảnh xử lý lần lượt để giữ RAM thấp)
export const examUploadQueue = createUploadQueue<ExamUploadResult>({
  dir: examUploadTempDir,
  maxQueued: EXAM_UPLOAD_MAX_QUEUED,
  maxStagedBytes: EXAM_UPLOAD_MAX_STAGED_BYTES,
  keep: EXAM_UPLOAD_JOBS_KEPT,
  onFinish: (adminId, job) => realtimeHub.publishExamUpload(adminId, job),
});
