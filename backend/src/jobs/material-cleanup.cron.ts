import cron from "node-cron";
import { MATERIAL_CLEANUP_CRON, MATERIAL_CLEANUP_TIMEZONE } from "../constants/materials";
import { materialJobService } from "../services/material-job.service";

// Mỗi ngày 04:30 (giờ Việt Nam): xoá tài liệu slide đã quá hạn lưu, tệp PDF tạm mồ côi và dòng sổ token đã quá cửa sổ
export const startMaterialCleanupCron = () => {
  cron.schedule(
    MATERIAL_CLEANUP_CRON,
    async () => {
      try {
        const r = await materialJobService.cleanup();
        if (r.expired || r.orphanFiles || r.usageRows) console.log(`[material] dọn: ${r.expired} tài liệu hết hạn, ${r.orphanFiles} tệp tạm, ${r.usageRows} dòng sổ token cũ`);
      } catch (err) {
        console.error("[material] dọn lỗi:", (err as Error).message); // vd DB chưa sẵn sàng: hôm sau chạy lại
      }
    },
    { timezone: MATERIAL_CLEANUP_TIMEZONE },
  );
  console.log("[material] dọn tài liệu hết hạn 04:30 mỗi ngày (giờ Việt Nam)");
};
