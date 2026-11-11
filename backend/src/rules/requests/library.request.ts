import { z } from "zod";
import { subjectCodeSchema } from "./subject.request";

// null = chưa phân loại
export const subjectSemesterBody = z.object({ semester: z.number("Kỳ không hợp lệ").int("Phải là số nguyên").min(0, "Kỳ từ 0 đến 9").max(9, "Kỳ từ 0 đến 9").nullable() });
export const subjectCodeOnlyParam = z.object({ code: subjectCodeSchema });

// Sửa thông tin cơ bản của môn (trang quản lý môn học): chỉ gửi trường nào cần đổi
export const updateSubjectBody = z
  .object({
    name: z.string().trim().min(1, "Tên môn không được để trống").max(200, "Tên môn tối đa 200 ký tự").optional(),
    credits: z.number("Số tín chỉ không hợp lệ").int("Phải là số nguyên").min(0, "Tín chỉ từ 0 đến 30").max(30, "Tín chỉ từ 0 đến 30").nullable().optional(),
    semester: subjectSemesterBody.shape.semester.optional(),
  })
  .refine((b) => Object.keys(b).length > 0, "Chưa có thông tin nào để lưu");

