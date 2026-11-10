import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { adminApi } from "@/features/admin/api/admin.api";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { useSubmit } from "@/shared/hooks/useSubmit";
import type { LinkRewardAdmin } from "@/shared/types/api";
import { Button } from "@/shared/ui/Button";
import { Card, CardHeader, PageHeader } from "@/shared/ui/Card";
import { ErrorBox, FormError, Loading } from "@/shared/ui/Feedback";
import { Input } from "@/shared/ui/Input";
import { Switch } from "@/shared/ui/Switch";

const digits = (v: string, max: number) => v.replace(/\D/g, "").slice(0, max);

function Form({ initial, onSaved }: { initial: LinkRewardAdmin; onSaved: () => void }) {
  const toast = useToast();
  const { run, loading, error, fieldErrors } = useSubmit();
  const [enabled, setEnabled] = useState(initial.enabled);
  const [link4mEnabled, setLink4mEnabled] = useState(initial.link4mEnabled);
  const [apiToken, setApiToken] = useState("");
  const [dailyLimit, setDailyLimit] = useState(String(initial.dailyLimit));
  const [shrinkmeEnabled, setShrinkmeEnabled] = useState(initial.shrinkmeEnabled);
  const [shrinkmeToken, setShrinkmeToken] = useState("");
  const [shrinkmeDailyLimit, setShrinkmeDailyLimit] = useState(String(initial.shrinkmeDailyLimit));
  const [validDays, setValidDays] = useState(String(initial.validDays));
  const [minSeconds, setMinSeconds] = useState(String(initial.minSeconds));
  const s = initial.stats;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await adminApi.saveLinkRewardSettings({
        enabled,
        link4mEnabled,
        ...(apiToken.trim() && { apiToken: apiToken.trim() }),
        dailyLimit: Number(dailyLimit),
        shrinkmeEnabled,
        ...(shrinkmeToken.trim() && { shrinkmeToken: shrinkmeToken.trim() }),
        shrinkmeDailyLimit: Number(shrinkmeDailyLimit),
        validDays: Number(validDays),
        minSeconds: Number(minSeconds),
      });
      toast.success("Đã lưu cấu hình vượt link");
      setApiToken("");
      setShrinkmeToken("");
      onSaved();
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Số liệu" description="Lượt người dùng đã tạo và nhận qua các dịch vụ vượt link." />
        <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-5">
          {[
            ["Link tạo 24 giờ", s.issued24h],
            ["Đã nhận 24 giờ", s.claimed24h],
            ["Tổng lượt đã nhận", s.claimedTotal],
            ["Lượt đang còn", s.activeTurns],
            ["Lượt đã dùng", s.usedTotal],
          ].map(([label, value]) => (
            <div key={label as string}>
              <p className="md-headline-small tabular-nums text-on-surface">{value as number}</p>
              <p className="md-body-small text-on-surface-variant">{label}</p>
            </div>
          ))}
        </div>
        <div className="overflow-x-auto px-5 pb-5">
          <table className="w-full text-left text-sm">
            <thead className="text-on-surface-variant">
              <tr>
                <th className="py-2 pr-4 font-medium">Dịch vụ</th>
                <th className="py-2 pr-4 font-medium">Link tạo 24 giờ</th>
                <th className="py-2 pr-4 font-medium">Đã nhận 24 giờ</th>
                <th className="py-2 pr-4 font-medium">Tổng đã nhận</th>
                <th className="py-2 font-medium">Tỷ lệ hoàn thành 24 giờ</th>
              </tr>
            </thead>
            <tbody>
              {s.byProvider.map((p) => (
                <tr key={p.provider} className="border-t border-outline-variant text-on-surface">
                  <td className="py-2 pr-4">{p.label}</td>
                  <td className="py-2 pr-4 tabular-nums">{p.issued24h}</td>
                  <td className="py-2 pr-4 tabular-nums">{p.claimed24h}</td>
                  <td className="py-2 pr-4 tabular-nums">{p.claimedTotal}</td>
                  <td className="py-2 tabular-nums">{p.issued24h > 0 ? `${Math.round((p.claimed24h / p.issued24h) * 100)}%` : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <form onSubmit={onSubmit} noValidate>
        <Card>
          <CardHeader title="Vượt link nhận lượt giải thích AI" description="Thành viên vượt link để nhận lượt giải thích miễn phí. Mặc định TẮT. Hệ thống ưu tiên Link4M, hết lượt của dịch vụ đó trong ngày thì chuyển sang dịch vụ kế tiếp." />
          <div className="space-y-5 p-5">
            <FormError message={error} />
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="md-title-small text-on-surface">Bật tính năng</p>
                <p className="md-body-small text-on-surface-variant">Tắt là người dùng không tạo được link mới. Lượt đã nhận vẫn dùng được.</p>
              </div>
              <Switch checked={enabled} onChange={setEnabled} label="Bật vượt link" />
            </div>
            <div className="space-y-4 rounded-m3-lg border border-outline-variant p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="md-title-small text-on-surface">Link4M</p>
                <Switch checked={link4mEnabled} onChange={setLink4mEnabled} label="Dùng Link4M" />
              </div>
              <Input
                label="Token API Link4M"
                type="password"
                autoComplete="off"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                error={fieldErrors.apiToken}
                placeholder={initial.hasToken ? "Đã lưu token (để trống nếu giữ nguyên)" : "Dán token vào đây"}
                hint="Chỉ lưu ở máy chủ, không bao giờ hiện lại. Chỉ gồm chữ, số và gạch."
              />
              <Input label="Số lần nhận tối đa mỗi người mỗi ngày (Link4M)" inputMode="numeric" value={dailyLimit} onChange={(e) => setDailyLimit(digits(e.target.value, 2))} error={fieldErrors.dailyLimit} hint="Link4M chỉ tính 2 lượt xem mỗi IP trong 24 giờ, nên nên để 2." />
            </div>
            <div className="space-y-4 rounded-m3-lg border border-outline-variant p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="md-title-small text-on-surface">ShrinkMe</p>
                <Switch checked={shrinkmeEnabled} onChange={setShrinkmeEnabled} label="Dùng ShrinkMe" />
              </div>
              <Input
                label="Token API ShrinkMe"
                type="password"
                autoComplete="off"
                value={shrinkmeToken}
                onChange={(e) => setShrinkmeToken(e.target.value)}
                error={fieldErrors.shrinkmeToken}
                placeholder={initial.hasShrinkmeToken ? "Đã lưu token (để trống nếu giữ nguyên)" : "Dán token vào đây"}
                hint="Chỉ lưu ở máy chủ, không bao giờ hiện lại. Chỉ gồm chữ, số và gạch."
              />
              <Input
                label="Số lần nhận tối đa mỗi người mỗi ngày (ShrinkMe)"
                inputMode="numeric"
                value={shrinkmeDailyLimit}
                onChange={(e) => setShrinkmeDailyLimit(digits(e.target.value, 2))}
                error={fieldErrors.shrinkmeDailyLimit}
                hint="ShrinkMe chỉ tính 1 lượt xem duy nhất trong 24 giờ, nên nên để 1."
              />
            </div>
            <Input label="Lượt miễn phí giữ được (ngày)" inputMode="numeric" value={validDays} onChange={(e) => setValidDays(digits(e.target.value, 2))} error={fieldErrors.validDays} hint="Sau số ngày này lượt chưa dùng sẽ hết hạn." />
            <Input
              label="Thời gian tối thiểu từ lúc bấm đến lúc nhận (giây)"
              inputMode="numeric"
              value={minSeconds}
              onChange={(e) => setMinSeconds(digits(e.target.value, 3))}
              error={fieldErrors.minSeconds}
              hint="Quá nhanh thì bị từ chối (chặn công cụ vượt link tự động). Gợi ý 25 giây."
            />
            <Button variant="primary" type="submit" disabled={loading || (enabled && !((link4mEnabled && (initial.hasToken || apiToken.trim())) || (shrinkmeEnabled && (initial.hasShrinkmeToken || shrinkmeToken.trim()))))}>
              {loading && <Loader2 size={16} className="animate-spin" />}
              Lưu cấu hình
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}

// Cấu hình và số liệu của tính năng vượt link Link4M
export default function LinkRewardSettingsPage() {
  const settings = useApi(() => adminApi.linkRewardSettings(), []);
  return (
    <>
      <PageHeader eyebrow="Quản trị" title="Vượt link" description="Cho thành viên vượt link để nhận lượt giải thích AI miễn phí." />
      {settings.data ? (
        <Form key={JSON.stringify(settings.data)} initial={settings.data} onSaved={settings.reload} />
      ) : settings.loading ? (
        <Loading />
      ) : (
        <ErrorBox message={settings.error ?? "Không tải được cấu hình"} onRetry={settings.reload} />
      )}
    </>
  );
}
