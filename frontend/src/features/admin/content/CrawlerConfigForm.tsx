import { useState, type FormEvent } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { adminApi } from "@/features/admin/api/admin.api";
import { useToast } from "@/shared/context/ToastContext";
import { useSubmit } from "@/shared/hooks/useSubmit";
import { formatDateTime } from "@/shared/utils/formatters";
import type { CrawlerAdminConfig } from "@/shared/types/api";
import { Button } from "@/shared/ui/Button";
import { Card, CardHeader } from "@/shared/ui/Card";
import { FormError } from "@/shared/ui/Feedback";
import { Input, PasswordInput } from "@/shared/ui/Input";

interface FormState {
  cookie: string;
  loginEmail: string;
  loginPassword: string;
  userAgent: string;
  referer: string;
  requestDelayMs: string;
  concurrency: string;
  webpQuality: string;
  fetchPrice: string;
}

// Form cấu hình crawl: cookie đăng nhập FuOverflow, User-Agent, độ trễ giữa request, chất lượng WebP
export function CrawlerConfigForm({ initial, onSaved }: { initial: CrawlerAdminConfig; onSaved: () => void }) {
  const toast = useToast();
  const { run, loading, error, fieldErrors } = useSubmit();
  const [form, setForm] = useState<FormState>({
    cookie: "",
    loginEmail: initial.loginEmail,
    loginPassword: "",
    userAgent: initial.userAgent,
    referer: initial.referer,
    requestDelayMs: String(initial.requestDelayMs),
    concurrency: String(initial.concurrency),
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
        loginPassword: form.loginPassword || undefined, // để trống = giữ mật khẩu cũ
        requestDelayMs: Number(form.requestDelayMs),
        concurrency: Number(form.concurrency),
        webpQuality: Number(form.webpQuality),
        fetchPrice: Number(form.fetchPrice),
      });
      setForm((f) => ({ ...f, cookie: "", loginPassword: "" }));
      toast.success("Đã lưu cấu hình crawl");
      onSaved();
    });
  };

  // Đăng nhập thử ngay bằng tài khoản đã lưu (cần bấm "Lưu cấu hình" trước nếu vừa đổi email/mật khẩu)
  const [loggingIn, setLoggingIn] = useState(false);
  const loginNow = async () => {
    setLoggingIn(true);
    try {
      await adminApi.crawlerLogin();
      toast.success("Đã đăng nhập FuOverflow và làm mới cookie");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Đăng nhập thất bại");
    } finally {
      setLoggingIn(false);
    }
  };
  const canLogin = initial.loginEmail !== "" && initial.hasLoginPassword;

  return (
    <Card>
      <CardHeader title="Đăng nhập FuOverflow" description="Ảnh gốc của đề chỉ tải được khi đã đăng nhập." />
      <form onSubmit={onSubmit} className="space-y-5 p-5" noValidate>
        <FormError message={error} />

        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="text-sm font-semibold text-slate-900">Tự đăng nhập khi cookie hết hạn</div>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Lưu tài khoản FuOverflow để hệ thống tự lấy cookie mới khi phiên hết hạn, không phải chờ dán lại. Nếu Cloudflare chặn đăng nhập tự động, dán cookie có <b>cf_clearance</b> (cùng User-Agent) ở mục Nâng cao bên dưới một lần; hệ thống giữ nó và chỉ làm mới phiên
            đăng nhập. Không dùng được nếu tài khoản bật xác thực 2 bước.
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Input label="Email FuOverflow" autoComplete="off" value={form.loginEmail} onChange={text("loginEmail")} error={fieldErrors.loginEmail} />
            <PasswordInput
              label="Mật khẩu"
              autoComplete="new-password"
              value={form.loginPassword}
              onChange={text("loginPassword")}
              error={fieldErrors.loginPassword}
              placeholder={initial.hasLoginPassword ? "Đã lưu (để trống nếu không đổi)" : "Nhập mật khẩu"}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button type="button" onClick={() => void loginNow()} disabled={!canLogin || loggingIn || loading}>
              {loggingIn ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
              Đăng nhập ngay
            </Button>
            {initial.loginLastAt && (
              <span className={`text-xs ${initial.loginLastError ? "text-rose-600" : "text-emerald-700"}`}>
                {initial.loginLastError ? `Lần gần nhất (${formatDateTime(initial.loginLastAt)}) lỗi: ${initial.loginLastError}` : `Đăng nhập thành công lúc ${formatDateTime(initial.loginLastAt)}`}
              </span>
            )}
          </div>
        </div>

        <details className="group rounded-xl border border-slate-200 p-4" open={!initial.hasLoginPassword}>
          <summary className="cursor-pointer text-sm font-medium text-slate-700">Nâng cao: cookie và User-Agent (dán thủ công)</summary>
          <div className="mt-4 space-y-5">
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
          </div>
        </details>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input label="Referer" value={form.referer} onChange={text("referer")} error={fieldErrors.referer} />
          <Input
            label="Số request cùng lúc (1–8)"
            inputMode="numeric"
            value={form.concurrency}
            onChange={text("concurrency")}
            error={fieldErrors.concurrency}
            hint="Cao hơn thì lấy đề nhanh hơn nhưng dễ bị FuOverflow chặn. Khuyên dùng 3–4."
          />
          <Input
            label="Nghỉ giữa request (ms)"
            inputMode="numeric"
            value={form.requestDelayMs}
            onChange={text("requestDelayMs")}
            error={fieldErrors.requestDelayMs}
            hint="Mỗi luồng nghỉ chừng này giữa hai request. Thấp quá dễ bị chặn."
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
          hint="Trừ vào ví của người dùng mỗi lần nhập link (kể cả đề đã có sẵn trong hệ thống, trừ đề người đó đã lấy trước đó). Lấy đề lỗi thì hoàn lại. Nhập 0 để miễn phí."
        />

        <Button variant="primary" type="submit" disabled={loading}>
          {loading && <Loader2 size={16} className="animate-spin" />}
          Lưu cấu hình
        </Button>
      </form>
    </Card>
  );
}
