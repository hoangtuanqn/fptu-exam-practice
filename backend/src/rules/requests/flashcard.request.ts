import { z } from "zod";
import { FLASHCARD_FILE_RE } from "../../utils/flashcard";
import { subjectCodeSchema } from "./subject.request";

export const flashcardImageParam = z.object({ code: subjectCodeSchema, file: z.string().regex(FLASHCARD_FILE_RE, "Tên ảnh không hợp lệ") });
export type FlashcardImageParam = z.infer<typeof flashcardImageParam>;
