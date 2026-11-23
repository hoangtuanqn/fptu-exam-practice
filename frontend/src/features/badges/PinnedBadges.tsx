import { Link } from "react-router-dom";
import { useApi } from "@/shared/hooks/useApi";
import { badgesApi, type MyBadge } from "./badges.api";
import { BadgeMedal, medalTier, TIER_NAME } from "./BadgeMedal";

// Huy hiệu đã ghim, hiện cạnh tên người dùng. Không có huy hiệu ghim hoặc tải lỗi thì không hiện gì.
export function PinnedBadges() {
  const { data } = useApi(() => badgesApi.mine(), []);
  if (!data) return null;
  const keys = data.pinned ?? data.items.filter((b) => b.pinned).map((b) => b.key);
  const pinned = keys.map((k) => data.items.find((b) => b.key === k)).filter((b): b is MyBadge => !!b && b.tier > 0);
  if (pinned.length === 0) return null;
  return (
    <Link to="/account/badges" aria-label={`Huy hiệu đã ghim: ${pinned.map((b) => b.name).join(", ")}. Xem tất cả huy hiệu`} className="md-state mt-2 inline-flex min-h-10 items-center gap-1.5 rounded-full px-1">
      {pinned.map((b) => (
        <span key={b.key} title={`${b.name} · ${b.tiers?.find((t) => t.level === b.tier)?.label ?? TIER_NAME[b.tier]}`}>
          <BadgeMedal icon={b.icon} tier={medalTier(b)} size="sm" />
        </span>
      ))}
    </Link>
  );
}
