import { env } from "../configs/env";
import { attachmentKind } from "./attachment";

// Ảnh đề được phục vụ tĩnh tại /api/v1/files (xem app.ts).
// API_URL để trống (dev, cùng origin qua proxy của Vite) thì trả đường dẫn tương đối; khi web và API khác domain thì trả URL đầy đủ.
export const fileUrlOf = (imagePath: string) => `${env.API_URL}/api/v1/files/${imagePath}`;

// Tệp đính kèm (pdf, zip...) không phục vụ tĩnh mà qua endpoint riêng để đặt Content-Type/Content-Disposition an toàn
export const attachmentUrlOf = (examId: string, attachmentId: number) => `${env.API_URL}/api/v1/exams/${examId}/attachments/${attachmentId}`;

// Tệp đính kèm trả cho giao diện: dùng chung cho GET đề và sự kiện socket để hai bên luôn cùng dạng
export const toAttachmentDto = (examId: string, a: { id: number; name: string; filePath: string; mime: string; sizeBytes: number }) => ({
  id: a.id,
  name: a.name,
  mime: a.mime,
  sizeBytes: a.sizeBytes,
  kind: attachmentKind(a.filePath),
  url: attachmentUrlOf(examId, a.id),
});
