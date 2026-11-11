import { z } from "zod";
import { subjectCodeSchema } from "./subject.request";

export const updateLibraryBody = z.object({
  enabled: z.boolean(),
  freeRuleEnabled: z.boolean(),
  newestTermsPaid: z.number("Số kỳ không hợp lệ").int("Phải là số nguyên").min(0, "Tối thiểu 0").max(20, "Tối đa 20"),
});
export type UpdateLibraryBody = z.infer<typeof updateLibraryBody>;

// null = chưa phân loại
export const subjectSemesterBody = z.object({ semester: z.number("Kỳ không hợp lệ").int("Phải là số nguyên").min(0, "Kỳ từ 0 đến 9").max(9, "Kỳ từ 0 đến 9").nullable() });
export const subjectCodeOnlyParam = z.object({ code: subjectCodeSchema });

// true = luôn miễn phí, false = luôn tính phí, null = theo quy tắc
export const examFreeBody = z.object({ free: z.boolean().nullable() });
