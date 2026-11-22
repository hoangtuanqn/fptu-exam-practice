import { useState, type FormEvent } from "react";
import { Loader2, Send } from "lucide-react";
import { adminApi, type AdminNotice } from "@/features/admin/api/admin.api";
import { useToast } from "@/shared/context/ToastContext";
import { useSubmit } from "@/shared/hooks/useSubmit";
import { Button } from "@/shared/ui/Button";
import { Card, PageHeader } from "@/shared/ui/Card";
import { useConfirm } from "@/shared/ui/ConfirmDialog";
import { FormError } from "@/shared/ui/Feedback";
import { Field, Input, Select, inputClass } from "@/shared/ui/Input";
import { NOTICE_LEVEL } from "@/shared/ui/NotificationBell";
import { internalLink } from "@/shared/ui/bellMarks";

type Level = AdminNotice["level"];
const LEVELS: Level[] = ["info", "success", "warning"]; // server không nhận mức "error" cho thông báo hệ thống
const EMPTY = { title: "", body: "", link: "", level: "info" as Level };

// Gửi thông báo hệ thống tới chuông của mọi người dùng
export default function SystemNoticePage() {
  const toast = useToast();
  const { confirm, confirmDialog } = useConfirm();
  const { run, loading, error, fieldErrors, setFieldErrors } = useSubmit("Chưa gửi được thông báo");
  const [form, setForm] = useState(EMPTY);
  const set = (patch: Partial<typeof EMPTY>) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const title = form.title.trim();
    const link = form.link.trim();
    const errors: Record<string, string> = {};
    if (!title) errors.title = "Nhập tiêu đề";
    if (link && !internalLink(link)) errors.link = "Đường dẫn trong trang, bắt đầu bằng /";
    if (Object.keys(errors).length) return setFieldErrors(errors);
    if (!(await confirm({ title: "Gửi tới tất cả người dùng?", message: `“${title}” sẽ hiện ở chuông thông báo của mọi người dùng. Không thu hồi được.`, confirmLabel: "Gửi", tone: "primary", icon: Send })))
      return;
    void run(async () => {
      const { sent } = await adminApi.sendSystemNotice({
        title,
        body: form.body.trim() || undefined,
        link: link || undefined,
        level: form.level,
      });
      toast.success(`Đã gửi tới ${sent ?? 0} người dùng`);
      setForm(EMPTY);
    });
  };

  return (
    <>
      {confirmDialog}
      <PageHeader eyebrow="Quản trị" title="Gửi thông báo" description="Thông báo hiện ở chuông của mọi người dùng." />
      <Card>
        <form onSubmit={(e) => void submit(e)} className="space-y-5 p-5" noValidate>
          <FormError message={error} />
          <Input label="Tiêu đề" value={form.title} onChange={(e) => set({ title: e.target.value })} error={fieldErrors.title} required />
          <Field label="Nội dung (không bắt buộc)" error={fieldErrors.body}>
            <textarea value={form.body} onChange={(e) => set({ body: e.target.value })} rows={4} className={`${inputClass(fieldErrors.body)} !h-auto py-3`} />
          </Field>
          <Input
            label="Đường dẫn khi bấm (không bắt buộc)"
            value={form.link}
            onChange={(e) => set({ link: e.target.value })}
            error={fieldErrors.link}
            hint="Trang trong web, ví dụ /pro"
          />
          <Select label="Mức độ" value={form.level} onChange={(e) => set({ level: e.target.value as Level })} error={fieldErrors.level}>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {NOTICE_LEVEL[l].label}
              </option>
            ))}
          </Select>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Gửi thông báo
          </Button>
        </form>
      </Card>
    </>
  );
}
