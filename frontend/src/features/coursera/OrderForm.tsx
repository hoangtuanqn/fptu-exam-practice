import { useRef, useState, type FormEvent } from "react";
import { ApiError } from "@/shared/api/client";
import { errorMessage } from "@/shared/api/errors";
import { Button } from "@/shared/ui/Button";
import { Card, CardHeader } from "@/shared/ui/Card";
import { Field, Input, PasswordInput, inputClass } from "@/shared/ui/Input";
import { FormError } from "@/shared/ui/Feedback";
import { useAuth } from "@/features/auth/AuthContext";
import { Link } from "react-router-dom";
import { ChargeSummary } from "@/shared/ui/ChargeSummary";
import { formatCredit } from "@/shared/utils/formatters";
import { useConfirm } from "@/shared/ui/ConfirmDialog";
import { courseraApi, type CourseraCourse, type CourseraOrder } from "./coursera.api";

export function OrderForm({ course, onBack, onCreated }: { course: CourseraCourse; onBack: () => void; onCreated: (order: CourseraOrder) => void }) {
  const { user, refresh } = useAuth();
  const price = course.price;
  const insufficient = price !== undefined && (user?.balance ?? 0) < price;
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
    if (submitting.current || price === undefined) return;
    submitting.current = true;
    setBusy(true); setError(""); setErrors({});
    try {
      if (!await confirm({ title: "Đặt đơn Coursera?", message: <div className="space-y-4"><p>Khóa học: {course.title}. FEPass sẽ nhận thông tin tài khoản bạn cung cấp để xử lý đơn.</p><ChargeSummary amount={price} balance={user?.balance ?? null} /><p>Phí được hoàn vào ví nếu đơn bị hủy hoặc từ chối.</p></div>, confirmLabel: "Xác nhận đặt đơn", tone: "primary" })) return;
      const order = await courseraApi.create({ requestKey: requestKey.current, courseId: course.id, expectedPrice: price, email, password, note });
      setPassword("");
      await refresh();
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
      <p className="md-title-medium">Phí khóa học: {price === undefined ? "Chưa có thông tin giá" : formatCredit(price)}</p>
      <p className="md-body-medium text-on-surface-variant">Số dư ví: {formatCredit(user?.balance ?? 0)}. Phí được trừ khi đặt đơn và hoàn lại nếu đơn bị hủy hoặc từ chối.</p>
      {insufficient && <p role="status" className="text-error">Số dư chưa đủ. <Link className="underline" to="/account/deposit">Nạp thêm credit</Link> hoặc <button type="button" className="underline" onClick={() => void refresh()}>cập nhật số dư</button>.</p>}
      <FormError message={error} />
      <div className="flex flex-wrap justify-end gap-3">
        <Button type="button" disabled={busy} onClick={onBack}>Chọn khóa khác</Button>
        <Button type="submit" variant="primary" disabled={busy || insufficient || price === undefined}>{busy ? "Đang gửi…" : "Đặt đơn hàng"}</Button>
      </div>
    </form>
    {confirmDialog}
  </Card>;
}
