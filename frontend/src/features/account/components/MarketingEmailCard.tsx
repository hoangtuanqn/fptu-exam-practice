import { useState } from "react";
import { userApi } from "@/features/account/api/user.api";
import { useAuth } from "@/features/auth/AuthContext";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { Card } from "@/shared/ui/Card";
import { Switch } from "@/shared/ui/Switch";

const LABEL = "Nhận thư gợi ý và ưu đãi";

// Bật/tắt thư gợi ý (marketing). Thư về tài khoản và giao dịch luôn được gửi.
export function MarketingEmailCard() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  if (!user || user.marketingOptOut === undefined) return null; // backend cũ chưa có tuỳ chọn này

  const change = async (on: boolean) => {
    setSaving(true);
    try {
      setUser(await userApi.updateProfile({ marketingOptOut: !on }));
      toast.success(on ? "Đã bật thư gợi ý" : "Đã tắt thư gợi ý");
    } catch (err) {
      toast.error(errorMessage(err, "Chưa lưu được cài đặt"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="flex items-start justify-between gap-4 p-5">
      <div>
        <p className="md-title-small text-on-surface">{LABEL}</p>
        <p className="md-body-medium mt-1 text-on-surface-variant">Gợi ý ôn tập, nhắc gia hạn Pro. Thư về tài khoản và giao dịch vẫn được gửi.</p>
      </div>
      <Switch label={LABEL} checked={!user.marketingOptOut} disabled={saving} onChange={(v) => void change(v)} />
    </Card>
  );
}
