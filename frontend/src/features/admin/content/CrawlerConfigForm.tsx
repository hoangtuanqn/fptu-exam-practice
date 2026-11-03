import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { adminApi } from "@/features/admin/api/admin.api";
import { useToast } from "@/shared/context/ToastContext";
import { useSubmit } from "@/shared/hooks/useSubmit";
import type { CrawlerAdminConfig } from "@/shared/types/api";
import { Button } from "@/shared/ui/Button";
import { Card, CardHeader } from "@/shared/ui/Card";
import { FormError } from "@/shared/ui/Feedback";
import { Input, PasswordInput } from "@/shared/ui/Input";

interface FormState {
  cookie: string;
  userAgent: string;
  referer: string;
  requestDelayMs: string;
  webpQuality: string;
  fetchPrice: string;
}

// Form cấu hình crawl: cookie đăng nhập FuOverflow, User-Agent, độ trễ giữa request, chất lượng WebP
export function CrawlerConfigForm({ initial, onSaved }: { initial: CrawlerAdminConfig; onSaved: () => void }) {
  const toast = useToast();
  const { run, loading, error, fieldErrors } = useSubmit();
  const [form, setForm] = useState<FormState>({
    cookie: "",
    userAgent: initial.userAgent,
    referer: initial.referer,
    requestDelayMs: String(initial.requestDelayMs),
    webpQuality: String(initial.webpQuality),
    fetchPrice: String(initial.fetchPrice),
  });
  const text = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await adminApi.saveCrawlerConfig({
        ...form,
        cookie: form.cookie || undefined, // để trống = giữ cookie cũ
        requestDelayMs: Number(form.requestDelayMs),
        webpQuality: Number(form.webpQuality),
        fetchPrice: Number(form.fetchPrice),
      });
      setForm((f) => ({ ...f, cookie: "" }));
      toast.success("Đã lưu cấu hình crawl");
      onSaved();
    });
  };

  return (
    <Card>
      <CardHeader title="Đăng nhập FuOverflow" description="Ảnh gốc của đề chỉ tải được khi đã đăng nhập." />
      <form onSubmit={onSubmit} className="space-y-5 p-5" noValidate>
        <FormError message={error} />

        <PasswordInput
          label="Cookie"
          autoComplete="off"
          value={form.cookie}
          onChange={text("cookie")}
          error={fieldErrors.cookie}
          placeholder={initial.hasCookie ? `Đang dùng ${initial.cookiePreview} (để trống nếu không đổi)` : "Dán chuỗi cookie"}
          hint="Trình duyệt → DevTools → Network → chuột phải một request tới fuoverflow.com → Copy as cURL, lấy phần cookie (xf_user, xf_session, xf_csrf, cf_clearance)."
        />
        <Input
          label="User-Agent"
          value={form.userAgent}
          onChange={text("userAgent")}
          error={fieldErrors.userAgent}
          hint="Phải trùng User-Agent của trình duyệt đã lấy cookie (cf_clearance gắn với IP và User-Agent)."
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Referer" value={form.referer} onChange={text("referer")} error={fieldErrors.referer} />
          <Input
            label="Nghỉ giữa request (ms)"
            inputMode="numeric"
            value={form.requestDelayMs}
            onChange={text("requestDelayMs")}
            error={fieldErrors.requestDelayMs}
            hint="Thấp quá dễ bị chặn."
          />
          <Input
            label="Chất lượng WebP (30–100)"
            inputMode="numeric"
            value={form.webpQuality}
            onChange={text("webpQuality")}
            error={fieldErrors.webpQuality}
          />
        </div>

        <Input
          label="Phí mỗi lần lấy đề (credit)"
          inputMode="numeric"
          value={form.fetchPrice}
          onChange={text("fetchPrice")}
          error={fieldErrors.fetchPrice}
          hint="Trừ vào ví của người dùng mỗi lần nhập link (kể cả đề đã có sẵn). Lấy đề lỗi thì hoàn lại. Nhập 0 để miễn phí."
        />

        <Button variant="primary" type="submit" disabled={loading}>
          {loading && <Loader2 size={16} className="animate-spin" />}
          Lưu cấu hình
        </Button>
      </form>
    </Card>
  );
}
