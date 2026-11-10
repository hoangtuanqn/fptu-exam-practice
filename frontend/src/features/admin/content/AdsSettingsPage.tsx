import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { adminApi } from "@/features/admin/api/admin.api";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { useSubmit } from "@/shared/hooks/useSubmit";
import type { AdsSettings } from "@/shared/types/api";
import { Button } from "@/shared/ui/Button";
import { Card, CardHeader, PageHeader } from "@/shared/ui/Card";
import { ErrorBox, FormError, Loading } from "@/shared/ui/Feedback";
import { Input } from "@/shared/ui/Input";
import { Switch } from "@/shared/ui/Switch";

function Row({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="md-title-small text-on-surface">{title}</p>
        <p className="md-body-small text-on-surface-variant">{hint}</p>
      </div>
      {children}
    </div>
  );
}

function AdsForm({ initial, onSaved }: { initial: AdsSettings; onSaved: () => void }) {
  const toast = useToast();
  const { run, loading, error, fieldErrors } = useSubmit();
  const [form, setForm] = useState<AdsSettings>(initial);
  const set = <K extends keyof AdsSettings>(key: K, value: AdsSettings[K]) => setForm((f) => ({ ...f, [key]: value }));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await adminApi.saveAdsSettings(form);
      toast.success("Đã lưu cấu hình quảng cáo");
      onSaved();
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <FormError message={error} />

      <Card>
        <CardHeader title="Công tắc chung" description="Mặc định TẮT: chưa bật thì web không nạp bất kỳ script quảng cáo nào. Tắt công tắc này là tắt khẩn cấp mọi quảng cáo." />
        <div className="space-y-5 p-5">
          <Row title="Bật quảng cáo" hint="Có hiệu lực ở lần tải trang kế tiếp của người dùng.">
            <Switch checked={form.enabled} onChange={(v) => set("enabled", v)} label="Bật quảng cáo" />
          </Row>
          <Row title="Cho khách chưa đăng nhập xem" hint="Tắt thì chỉ thành viên đăng nhập (không phải Pro) thấy quảng cáo.">
            <Switch checked={form.guests} onChange={(v) => set("guests", v)} label="Cho khách xem quảng cáo" />
          </Row>
          <p className="md-body-small rounded-m3-md bg-surface-container px-4 py-3 text-on-surface-variant">
            Quảng cáo <b>chỉ</b> hiện ở: trang môn công khai, Kho đề, Lịch sử làm bài / kết quả, trang Tính năng, Có gì mới và Tổng quan tài khoản. <b>Không bao giờ</b> hiện ở: trang làm bài, admin, đăng nhập, nạp tiền, Điểm FAP, hồ sơ, gói Pro. Gói Pro và tài khoản admin không thấy quảng cáo.
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader title="Vignette (Monetag)" description="Banner dạng thẻ nổi, tự hiện theo lịch của Monetag. Tần suất và danh mục quảng cáo chỉnh trong cài đặt của vùng quảng cáo trên Monetag." />
        <div className="space-y-4 p-5">
          <Row title="Dùng Vignette" hint="Cần điền mã vùng bên dưới.">
            <Switch checked={form.vignette} onChange={(v) => set("vignette", v)} label="Dùng Vignette" />
          </Row>
          <Input label="Mã vùng (zone)" inputMode="numeric" value={form.vignetteZone} onChange={(e) => set("vignetteZone", e.target.value.replace(/\D/g, "").slice(0, 12))} error={fieldErrors.vignetteZone} />
        </div>
      </Card>

      <Card>
        <CardHeader title="In-Page Push (Monetag)" description="Thông báo dạng banner nhỏ trong trang, không xin quyền thông báo của trình duyệt." />
        <div className="space-y-4 p-5">
          <Row title="Dùng In-Page Push" hint="Cần điền mã vùng bên dưới.">
            <Switch checked={form.inpage} onChange={(v) => set("inpage", v)} label="Dùng In-Page Push" />
          </Row>
          <Input label="Mã vùng (zone)" inputMode="numeric" value={form.inpageZone} onChange={(e) => set("inpageZone", e.target.value.replace(/\D/g, "").slice(0, 12))} error={fieldErrors.inpageZone} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Direct Link (Monetag)" description="Liên kết chỉ mở khi người dùng tự bấm (dùng cho nút “Xem quảng cáo” sau này). Chưa dùng ở đâu cho tới khi có nút đó." />
        <div className="space-y-4 p-5">
          <Input label="Liên kết" value={form.directLink} onChange={(e) => set("directLink", e.target.value.trim())} error={fieldErrors.directLink} hint="Bắt đầu bằng https://. Để trống nếu chưa dùng." />
        </div>
      </Card>

      <Button variant="primary" type="submit" disabled={loading}>
        {loading && <Loader2 size={16} className="animate-spin" />}
        Lưu cấu hình
      </Button>
    </form>
  );
}

// Cấu hình quảng cáo Monetag: công tắc tổng, từng loại, mã vùng
export default function AdsSettingsPage() {
  const settings = useApi(() => adminApi.adsSettings(), []);
  return (
    <>
      <PageHeader eyebrow="Quản trị" title="Quảng cáo" description="Bật tắt và chọn loại quảng cáo. Web chỉ nạp script quảng cáo ở các trang cho phép." />
      {settings.data ? (
        <AdsForm key={JSON.stringify(settings.data)} initial={settings.data} onSaved={settings.reload} />
      ) : settings.loading ? (
        <Loading />
      ) : (
        <ErrorBox message={settings.error ?? "Không tải được cấu hình"} onRetry={settings.reload} />
      )}
    </>
  );
}
