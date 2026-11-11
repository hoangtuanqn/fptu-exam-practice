import cron from "node-cron";
import { syncSubjectSemesters } from "../services/crawler/fuo-subjects.service";

// Mỗi đêm 4:15 (giờ máy chủ) cập nhật kỳ học của môn từ mục "Tài liệu các môn học" của FuOverflow.
// Một lượt chỉ đọc một trang công khai; lỗi chỉ ghi log, lần sau chạy lại.
export const startSubjectSemesterSync = () => {
  cron.schedule("15 4 * * *", async () => {
    try {
      const r = await syncSubjectSemesters();
      console.log(`[subject-semester] ${r.found} môn trên FuOverflow: cập nhật ${r.updated}, giữ nguyên ${r.unchanged}, chưa có trong hệ thống ${r.notInSystem}, bỏ qua do đã đặt tay ${r.conflicts}`);
    } catch (err) {
      console.error("[subject-semester]", (err as Error).message);
    }
  });
  console.log("[subject-semester] chạy 4:15 mỗi đêm");
};
