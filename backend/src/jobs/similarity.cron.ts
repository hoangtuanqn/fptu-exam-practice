import cron from "node-cron";
import { SIMILARITY_JOB_CRON, SIMILARITY_JOB_TIMEZONE } from "../constants/similarity";
import { formatSimilaritySummary, similarityJobService } from "../services/similarity-job.service";

// Mỗi đêm 04:00 (giờ Việt Nam, sau lượt sao lưu DB) cập nhật dấu vân tay, nhóm câu giống nhau và thống kê tần suất cho các môn có đề đổi
export const startSimilarityCron = () => {
  cron.schedule(
    SIMILARITY_JOB_CRON,
    async () => {
      try {
        const r = await similarityJobService.run();
        if (!r) console.log("[similarity] lượt trước chưa xong, bỏ qua");
        else if (r.eligible > 0) console.log(`[similarity] ${formatSimilaritySummary(r)}`);
      } catch (err) {
        console.error("[similarity]", (err as Error).message); // vd DB chưa sẵn sàng: đêm sau chạy lại
      }
    },
    { timezone: SIMILARITY_JOB_TIMEZONE },
  );
  console.log("[similarity] chạy 04:00 mỗi đêm (giờ Việt Nam)");
};
