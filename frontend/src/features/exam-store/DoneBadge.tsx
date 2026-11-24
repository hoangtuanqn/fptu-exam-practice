import { Badge } from "@/shared/ui/Badge";

// Đề bạn đã nộp bài ít nhất một lần: để khỏi bấm vào làm lại nhầm
export function DoneBadge({ attempts }: { attempts?: number }) {
  return attempts ? <Badge tone="success">Đã làm{attempts > 1 ? ` ${attempts} lần` : ""}</Badge> : null;
}
