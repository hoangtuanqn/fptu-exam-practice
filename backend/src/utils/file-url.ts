import { env } from "../configs/env";

// Ảnh đề được phục vụ tĩnh tại /api/v1/files (xem app.ts).
// API_URL để trống (dev, cùng origin qua proxy của Vite) thì trả đường dẫn tương đối; khi web và API khác domain thì trả URL đầy đủ.
export const fileUrlOf = (imagePath: string) => `${env.API_URL}/api/v1/files/${imagePath}`;

// Tệp đính kèm (pdf, zip...) không phục vụ tĩnh mà qua endpoint riêng để đặt Content-Type/Content-Disposition an toàn
export const attachmentUrlOf = (examId: number, attachmentId: number) => `${env.API_URL}/api/v1/exams/${examId}/attachments/${attachmentId}`;
