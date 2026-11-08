import { z } from "zod";

// Mã môn như PRO192, MAD101, ENW492C: một nơi duy nhất định nghĩa dạng hợp lệ để mọi API nhận mã môn dùng chung
export const subjectCodeSchema = z.string().trim().regex(/^[A-Za-z]{2,4}\d{3}[A-Za-z]?$/, "Mã môn không hợp lệ");

export const subjectCodeParam = z.object({ code: subjectCodeSchema });
export type SubjectCodeParam = z.infer<typeof subjectCodeParam>;
