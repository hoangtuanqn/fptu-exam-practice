import type { Tone } from "@/shared/ui/Badge";
import type { StatsConfidence } from "./frequent.api";

// Nhãn độ tin của thống kê theo chương: dùng chung cho "Chương hay ra" và trang phân tích slide
export const CONFIDENCE: Record<StatsConfidence, { label: string; tone: Tone }> = {
  low: { label: "Ít dữ liệu", tone: "warning" },
  medium: { label: "Tạm tin được", tone: "neutral" },
  high: { label: "Đủ dữ liệu", tone: "success" },
};

export const confidenceOf = (value: unknown) => (typeof value === "string" && value in CONFIDENCE ? CONFIDENCE[value as StatsConfidence] : null);
