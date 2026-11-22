import { Badge, type Tone } from "@/shared/ui/Badge";
import type { ContributionStatus } from "./exam-contribution.api";

const STATUS: Record<ContributionStatus, [string, Tone]> = {
  PENDING: ["Chờ duyệt", "warning"],
  APPROVED: ["Đã duyệt", "success"],
  REJECTED: ["Bị từ chối", "danger"],
};

export function ContributionStatusBadge({ value }: { value: ContributionStatus }) {
  const [label, tone] = STATUS[value] ?? STATUS.PENDING;
  return <Badge tone={tone}>{label}</Badge>;
}
