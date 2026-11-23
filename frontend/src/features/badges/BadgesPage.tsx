import { useState } from "react";
import { Award, Pin, PinOff } from "lucide-react";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { Badge } from "@/shared/ui/Badge";
import { IconButton } from "@/shared/ui/Button";
import { Card, CardHeader, PageHeader } from "@/shared/ui/Card";
import { Empty, LinearProgress } from "@/shared/ui/Feedback";
import { QueryBoundary } from "@/shared/ui/QueryBoundary";
import { formatDate } from "@/shared/utils/formatters";
import { badgesApi, MAX_PINNED, type MyBadge, type MyBadges } from "./badges.api";
import { BadgeMedal, categoryLabel, medalTier, TIER_NAME } from "./BadgeMedal";

const pinnedKeys = (d: MyBadges) => d.pinned ?? d.items.filter((b) => b.pinned).map((b) => b.key);

// Huy hiệu của tôi: tóm tắt, hàng huy hiệu ghim, rồi toàn bộ huy hiệu chia theo nhóm
export default function BadgesPage() {
  const query = useApi(() => badgesApi.mine(), []);
  const [saved, setSaved] = useState<MyBadges | null>(null); // kết quả sau khi ghim/bỏ ghim (máy chủ trả lại đủ dữ liệu)
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const data = saved ?? query.data;

  const togglePin = async (badge: MyBadge) => {
    if (!data || busy) return;
    const current = pinnedKeys(data);
    const isPinned = current.includes(badge.key);
    if (!isPinned && current.length >= MAX_PINNED) {
      toast.error(`Bạn chỉ ghim được ${MAX_PINNED} huy hiệu. Bỏ ghim một huy hiệu khác trước nhé.`);
      return;
    }
    setBusy(true);
    try {
      setSaved(await badgesApi.pin(isPinned ? current.filter((k) => k !== badge.key) : [...current, badge.key]));
      toast.success(isPinned ? "Đã bỏ ghim" : "Đã ghim huy hiệu");
    } catch (err) {
      toast.error(errorMessage(err, "Chưa lưu được, bạn thử lại nhé"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Huy hiệu" description="Huy hiệu ghi nhận việc học đều đặn của bạn. Ghim huy hiệu yêu thích để hiện ở trang Tổng quan." />
      <QueryBoundary query={{ ...query, data }}>
        {(d) => (d.items.length === 0 ? <Empty icon={Award} title="Chưa có huy hiệu nào" /> : <BadgesView data={d} busy={busy} onPin={togglePin} />)}
      </QueryBoundary>
    </>
  );
}

function BadgesView({ data, busy, onPin }: { data: MyBadges; busy: boolean; onPin: (b: MyBadge) => void }) {
  const earned = data.items.filter((b) => b.tier > 0).length;
  const keys = pinnedKeys(data);
  const pinned = keys.map((k) => data.items.find((b) => b.key === k)).filter((b): b is MyBadge => !!b);
  const groups = new Map<string, MyBadge[]>();
  for (const b of data.items) groups.set(b.category, [...(groups.get(b.category) ?? []), b]);

  return (
    <div className="space-y-6">
      <p className="md-title-medium text-on-surface">
        Đã đạt {earned}/{data.items.length} huy hiệu
      </p>

      <Card>
        <CardHeader title="Huy hiệu ghim" description={`Ghim tối đa ${MAX_PINNED} huy hiệu bạn đã đạt.`} />
        {pinned.length === 0 ? (
          <p className="md-body-medium px-5 py-4 text-on-surface-variant">Chưa ghim huy hiệu nào. Bấm biểu tượng ghim trên một huy hiệu đã đạt.</p>
        ) : (
          <ul className="flex flex-wrap gap-3 px-5 py-4">
            {pinned.map((b) => (
              <li key={b.key} className="flex items-center gap-2 rounded-full bg-surface-container-low py-1 pl-1 pr-3">
                <BadgeMedal icon={b.icon} tier={medalTier(b)} size="sm" />
                <span className="md-label-large text-on-surface">{b.name}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {[...groups].map(([category, items]) => (
        <section key={category}>
          <h2 className="md-title-medium mb-3 text-on-surface">{categoryLabel(category)}</h2>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((b) => (
              <BadgeCard key={b.key} badge={b} pinned={keys.includes(b.key)} busy={busy} onPin={() => onPin(b)} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function BadgeCard({ badge, pinned, busy, onPin }: { badge: MyBadge; pinned: boolean; busy: boolean; onPin: () => void }) {
  const tierLabel = (level: number) => badge.tiers?.find((t) => t.level === level)?.label;
  const earned = badge.tier > 0;
  const next = badge.progress?.next ?? null;
  const current = badge.progress?.current ?? 0;
  const nextLabel = tierLabel(badge.tier + 1) ?? TIER_NAME[(badge.tier + 1) as 1 | 2 | 3];
  const goal = (badge.tiers?.length ?? 0) > 1 ? `Lên ${nextLabel}` : "Tiến độ"; // huy hiệu một bậc không có "bậc tiếp theo"

  return (
    <li className={`flex gap-3 rounded-m3-md border border-outline-variant p-4 ${earned ? "bg-surface" : "bg-surface-container-low"}`}>
      <BadgeMedal icon={badge.icon} tier={medalTier(badge)} />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="md-title-small text-on-surface">{badge.name}</h3>
            <div className="mt-1">
              <Badge tone={earned ? "warning" : "neutral"}>{earned ? (tierLabel(badge.tier) ?? TIER_NAME[badge.tier]) : TIER_NAME[0]}</Badge>
            </div>
          </div>
          <IconButton
            label={!earned ? "Đạt huy hiệu này để ghim" : "Ghim huy hiệu"}
            selected={pinned}
            disabled={!earned || busy}
            onClick={onPin}
            className="-mr-2 -mt-2"
          >
            {pinned ? <PinOff size={18} /> : <Pin size={18} />}
          </IconButton>
        </div>
        <p className="md-body-small text-on-surface-variant">{badge.description}</p>
        {next === null ? (
          earned && <p className="md-body-small font-medium text-on-surface">Đã đạt bậc cao nhất</p>
        ) : (
          <div className="space-y-1 pt-1">
            <div className="md-body-small flex justify-between gap-2 text-on-surface-variant">
              <span>{goal}</span>
              <span className="tabular-nums">
                {Math.min(current, next)} / {next}
              </span>
            </div>
            <LinearProgress value={next > 0 ? current / next : 0} label={goal} />
          </div>
        )}
        {badge.earnedAt && <p className="md-body-small text-on-surface-variant">Đạt ngày {formatDate(badge.earnedAt)}</p>}
      </div>
    </li>
  );
}
