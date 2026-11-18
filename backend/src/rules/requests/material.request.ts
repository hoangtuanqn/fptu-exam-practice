import { z } from "zod";
import { uuidParam } from "./admin.request";
import { subjectCodeSchema } from "./subject.request";

// POST /materials (multipart): tệp ở field "file" do multer đọc, field chữ subjectCode
export const materialUploadBody = z.object({ subjectCode: subjectCodeSchema.transform((s) => s.toUpperCase()) });
export const materialIdParam = uuidParam;

export type MaterialUploadBody = z.infer<typeof materialUploadBody>;
export type MaterialIdParam = z.infer<typeof materialIdParam>;
