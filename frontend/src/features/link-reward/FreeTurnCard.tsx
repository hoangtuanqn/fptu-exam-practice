import { useApi } from "@/shared/hooks/useApi";
import { EarnTurnBlock } from "./EarnTurnBlock";
import { linkRewardApi } from "./link-reward.api";

// Thẻ ở Tổng quan tài khoản: còn bao nhiêu lượt giải thích miễn phí và nút vượt link nhận thêm. Tắt và không có lượt thì không hiện gì.
export function FreeTurnCard() {
  const status = useApi(() => linkRewardApi.status(), []);
  if (!status.data) return null;
  return <EarnTurnBlock status={status.data} onChange={status.reload} className="rounded-m3-lg" />;
}
