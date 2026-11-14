import { useState } from "react";
import { userApi } from "@/features/account/api/user.api";
import { useAuth } from "@/features/auth/AuthContext";
import { MARKETING_TOPICS } from "@/features/marketing/marketing.api";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { formatDate } from "@/shared/utils/formatters";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Switch } from "@/shared/ui/Switch";

const LABEL = "Nhận thư gợi ý và ưu đãi";

// Bật/tắt thư gợi ý (marketing). Thư về tài khoản và giao dịch luôn được gửi.
export function MarketingEmailCard() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  if (!user || user.marketingOptOut === undefined) return null; // backend cũ chưa có tuỳ chọn này

  const save = async (body: Parameters<typeof userApi.updateProfile>[0], done: string) => {
    setSaving(true);
    try {
      setUser(await userApi.updateProfile(body));
      toast.success(done);
    } catch (err) {
      toast.error(errorMessage(err, "Chưa lưu được cài đặt"));
    } finally {
      setSaving(false);
    }
  };

  const muted = user.marketingMutedTopics;
  const pausedUntil = user.marketingMutedUntil && new Date(user.marketingMutedUntil).getTime() > Date.now() ? user.marketingMutedUntil : null;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="md-title-small text-on-surface">{LABEL}</p>
          <p className="md-body-medium mt-1 text-on-surface-variant">Gợi ý ôn tập, nhắc gia hạn Pro. Thư về tài khoản và giao dịch vẫn được gửi.</p>
        </div>
        <Switch label={LABEL} checked={!user.marketingOptOut} disabled={saving} onChange={(on) => void save({ marketingOptOut: !on }, on ? "Đã bật thư gợi ý" : "Đã tắt thư gợi ý")} />
      </div>
      {/* Tuỳ chọn theo loại thư: chỉ hiện khi backend đã gửi trường mới */}
      {!user.marketingOptOut && muted !== undefined && (
        <div className="mt-4 space-y-1 border-t border-outline-variant pt-3">
          {MARKETING_TOPICS.map((t) => (
            <div key={t.key} className="flex min-h-12 items-center justify-between gap-4">
              <span className="md-body-large text-on-surface">{t.label}</span>
              <Switch
                label={t.label}
                checked={(muted & t.bit) === 0}
                disabled={saving}
                onChange={(on) => void save({ marketingMutedTopics: on ? muted & ~t.bit : muted | t.bit }, on ? `Đã bật "${t.label}"` : `Đã tắt "${t.label}"`)}
              />
            </div>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
            <p className="md-body-medium text-on-surface">{pausedUntil ? `Đang tạm dừng đến ${formatDate(pausedUntil)}` : "Tạm nghỉ nhận thư gợi ý một thời gian"}</p>
            {pausedUntil ? (
              <Button size="sm" disabled={saving} onClick={() => void save({ pauseMarketingDays: 0 }, "Đã bật lại thư gợi ý")}>
                Bật lại
              </Button>
            ) : (
              <Button size="sm" disabled={saving} onClick={() => void save({ pauseMarketingDays: 30 }, "Đã tạm dừng 30 ngày")}>
                Tạm dừng 30 ngày
              </Button>
            )}
          </div>
          <p className="md-body-small text-on-surface-variant">Khi tạm dừng, thư nhắc hết hạn Pro vẫn được gửi. Tắt "Nhắc gia hạn Pro" nếu không muốn nhận.</p>
        </div>
      )}
    </Card>
  );
}
