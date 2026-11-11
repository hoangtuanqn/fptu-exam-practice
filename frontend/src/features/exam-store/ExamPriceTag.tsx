import { Badge } from "@/shared/ui/Badge";
import { formatCredit } from "@/shared/utils/formatters";
import type { CatalogItem } from "./catalog.api";

// Nhãn cho biết trước mở đề này có mất credit không: đã có trong kho, miễn phí, hay phải trả phí (đề chưa có sẵn thì lấy từ FuOverflow)
export function ExamPriceTag({ item, price }: { item: Pick<CatalogItem, "status" | "free">; price: number }) {
  if (item.status === "owned") return <Badge tone="neutral">Đã có trong kho</Badge>;
  if (item.free || price === 0) return <Badge tone="success">Miễn phí</Badge>;
  return <Badge tone="warning">{item.status === "ready" ? formatCredit(price) : `Lấy từ FuOverflow · ${formatCredit(price)}`}</Badge>;
}
