import { Check } from "lucide-react";
import { Badge } from "@/shared/ui/Badge";
import type { CatalogItem } from "./catalog.api";

// Nhãn trạng thái của một đề trong danh mục: đã trong kho, hệ thống đã có sẵn đáp án, hoặc chưa lấy
export function ExamStatusBadge({ status }: { status: CatalogItem["status"] }) {
  if (status === "owned")
    return (
      <Badge tone="success">
        <Check size={13} /> Trong kho
      </Badge>
    );
  if (status === "ready") return <Badge tone="info">Sẵn sàng · có đáp án</Badge>;
  return <Badge tone="neutral">Chưa lấy</Badge>;
}
