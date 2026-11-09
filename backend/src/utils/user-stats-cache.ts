import type { SubjectReadiness } from "../services/readiness.service";
import type { SubjectStats } from "../services/topic-stats.service";
import { TtlCache } from "./ttl-cache";

// Báo cáo theo chủ đề và mức sẵn sàng phải đọc cột `details` của hàng trăm bài làm, nên giữ kết quả ngắn hạn theo người dùng.
// Nộp bài mới thì xoá ngay (xem examAttemptRepository.create); chủ đề do AI gán thêm thì chậm tối đa bằng TTL.
const STATS_CACHE_MS = 60_000;
const topics = new TtlCache<number, SubjectStats[]>(STATS_CACHE_MS, 2000);
const readiness = new TtlCache<number, SubjectReadiness[]>(STATS_CACHE_MS, 2000);

export const userStatsCache = {
  topics,
  readiness,
  invalidate(userId: number) {
    topics.delete(userId);
    readiness.delete(userId);
  },
};
