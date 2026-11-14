import { z } from "zod";
import { EXAM_VIOLATION_MAX_SEC, EXAM_VIOLATIONS_MAX } from "../../constants/exam";

const sec = z.number().int().min(0).max(EXAM_VIOLATION_MAX_SEC);

// Mỗi lần rời toàn màn hình/tab khi thi thử: at = giây kể từ lúc bắt đầu, sec = số giây ở ngoài. Chỉ ghi nhận, không chặn.
export const violations = z.array(z.object({ at: sec, sec })).max(EXAM_VIOLATIONS_MAX);

export type Violation = z.infer<typeof violations>[number];
