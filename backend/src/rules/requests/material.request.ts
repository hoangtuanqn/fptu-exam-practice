import { z } from "zod";
import { subjectCodeSchema } from "./subject.request";

// POST /materials (multipart): tệp ở field "file" do multer đọc, field chữ subjectCode
export const materialUploadBody = z.object({ subjectCode: subjectCodeSchema.transform((s) => s.toUpperCase()) });
export const materialIdParam = z.object({ id: z.coerce.number().int().positive() });

export type MaterialUploadBody = z.infer<typeof materialUploadBody>;
export type MaterialIdParam = z.infer<typeof materialIdParam>;
