import { materialJobService } from "../services/material-job.service";

let draining = false;

// Phân tích slide: lấy từng tài liệu đang chờ ra chạy, MỘT tài liệu một lúc (máy chủ 1 nhân, ít RAM).
// Chạy nền trong tiến trình server; job lỗi được đánh dấu FAILED bên trong process(), không dừng các job sau.
const drain = async () => {
  if (draining) return;
  draining = true;
  try {
    for (let job = await materialJobService.claimNext(); job; job = await materialJobService.claimNext()) {
      try {
        const outcome = await materialJobService.process(job.id);
        console.log(`[material] upload ${job.id}: ${outcome}`); // chỉ số đếm/trạng thái, không ghi nội dung tài liệu
      } catch (err) {
        console.error(`[material] upload ${job.id} lỗi ngoài dự kiến: ${(err as Error).message}`);
      }
    }
  } catch (err) {
    console.error("[material] hàng đợi lỗi:", (err as Error).message);
  } finally {
    draining = false;
  }
};

// Gọi một lần khi khởi động: job đang chạy dở do lần tắt trước được xếp lại (các bước bỏ qua phần đã làm), rồi chạy mỗi khi có job mới
export const startMaterialWorker = async () => {
  materialJobService.onEnqueued(() => void drain());
  const n = await materialJobService.requeueRunning();
  if (n > 0) console.log(`[material] xếp lại ${n} tài liệu đang phân tích dở`);
  void drain();
};
