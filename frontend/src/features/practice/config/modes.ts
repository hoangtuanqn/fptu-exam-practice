import { ClipboardCheck, Dumbbell, type LucideIcon } from "lucide-react";
import type { Mode } from "@/features/practice/types.ts";

export interface ModeConfig {
  value: Mode;
  label: string;
  desc: string;
  Icon: LucideIcon;
}

export const MODES: ModeConfig[] = [
  {
    value: "practice",
    label: "Luyện tập",
    desc: "Chọn đáp án và xác nhận, kết quả từng câu hiện ngay để học.",
    Icon: Dumbbell,
  },
  {
    value: "exam",
    label: "Thi",
    desc: "Làm hết các câu, nộp bài mới chấm điểm. Không xem đúng sai trong lúc làm.",
    Icon: ClipboardCheck,
  },
];

export function getModeConfig(mode: Mode): ModeConfig {
  return MODES.find((m) => m.value === mode) ?? MODES[0];
}
