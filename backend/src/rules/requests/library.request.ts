import { z } from "zod";
import { subjectCodeSchema } from "./subject.request";

// null = chưa phân loại
export const subjectSemesterBody = z.object({ semester: z.number("Kỳ không hợp lệ").int("Phải là số nguyên").min(0, "Kỳ từ 0 đến 9").max(9, "Kỳ từ 0 đến 9").nullable() });
export const subjectCodeOnlyParam = z.object({ code: subjectCodeSchema });

