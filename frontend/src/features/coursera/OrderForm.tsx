import { useRef, useState, type FormEvent } from "react";
import { ApiError } from "@/shared/api/client";
import { errorMessage } from "@/shared/api/errors";
import { Button } from "@/shared/ui/Button";
import { Card, CardHeader } from "@/shared/ui/Card";
import { Field, Input, PasswordInput, inputClass } from "@/shared/ui/Input";
import { FormError } from "@/shared/ui/Feedback";
import { useConfirm } from "@/shared/ui/ConfirmDialog";
import { courseraApi, type CourseraCourse, type CourseraOrder } from "./coursera.api";

export function OrderForm({ course, onBack, onCreated }: { course: CourseraCourse; onBack: () => void; onCreated: (order: CourseraOrder) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const requestKey = useRef(crypto.randomUUID());
  const submitting = useRef(false);
  const { confirm, confirmDialog } = useConfirm();
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true); setError(""); setErrors({});
    try {
      if (!await confirm({ title: "Đặt đơn Coursera?", message: `Khóa học: ${course.title}. FEPass sẽ nhận thông tin tài khoản bạn cung cấp để xử lý đơn.`, confirmLabel: "Đặt đơn", tone: "primary" })) return;
      const order = await courseraApi.create({ requestKey: requestKey.current, courseId: course.id, email, password, note });
      setPassword("");
      onCreated(order);
    } catch (err) {
      setError(errorMessage(err));
      if (err instanceof ApiError) setErrors(err.errors ?? {});
    } finally { submitting.current = false; setBusy(false); }
  }
  return <Card>
    <CardHeader title={course.title} description="Điền thông tin tài khoản Coursera để đặt đơn." />
    <form onSubmit={submit} className="space-y-4 p-5">
      <fieldset disabled={busy} className="space-y-4">
        <Input label="Email Coursera" type="email" autoComplete="off" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
        <PasswordInput label="Mật khẩu Coursera" autoComplete="new-password" required maxLength={512} value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
        <Field label="Ghi chú" error={errors.note}><textarea className={`${inputClass(errors.note)} min-h-28 py-3`} rows={4} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Yêu cầu hoặc thông tin thêm cho đơn hàng" /></Field>
      </fieldset>
      <FormError message={error} />
      <div className="flex flex-wrap justify-end gap-3">
        <Button type="button" disabled={busy} onClick={onBack}>Chọn khóa khác</Button>
        <Button type="submit" variant="primary" disabled={busy}>{busy ? "Đang gửi…" : "Đặt đơn hàng"}</Button>
      </div>
    </form>
    {confirmDialog}
  </Card>;
}
