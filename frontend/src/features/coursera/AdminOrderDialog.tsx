import { useEffect, useRef, useState, type FormEvent } from "react";
import { errorMessage } from "@/shared/api/errors";
import { Button } from "@/shared/ui/Button";
import { Field, inputClass, Select } from "@/shared/ui/Input";
import { FormError } from "@/shared/ui/Feedback";
import { Modal, ModalActions } from "@/shared/ui/Modal";
import { useConfirm } from "@/shared/ui/ConfirmDialog";
import { courseraApi, ORDER_LABELS, type CourseraOrder, type OrderStatus } from "./coursera.api";

const transitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["PROCESSING", "REJECTED", "CANCELLED"], PROCESSING: ["COMPLETED", "REJECTED", "CANCELLED"], COMPLETED: [], REJECTED: [], CANCELLED: [],
};
export function AdminOrderDialog({ order, onClose, onSaved }: { order: CourseraOrder; onClose: () => void; onSaved: () => void }) {
  const options = transitions[order.status];
  const [status, setStatus] = useState<OrderStatus>(options[0] ?? order.status);
  const [note, setNote] = useState(order.adminNote);
  const [password, setPassword] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const alive = useRef(true);
  const { confirm, confirmDialog } = useConfirm();
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    const hide = () => setPassword(null);
    window.addEventListener("blur", hide);
    return () => window.removeEventListener("blur", hide);
  }, []);
  async function reveal() {
    setBusy(true); setError("");
    try { const credentials = await courseraApi.credentials(order.id); if (alive.current) setPassword(credentials.password); }
    catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setPassword(null);
    try {
      if (!await confirm({ title: "Cập nhật đơn?", message: `Chuyển đơn #${order.id} sang “${ORDER_LABELS[status]}”.${transitions[status].length ? "" : " Đơn kết thúc sẽ không thể mở lại."}`, confirmLabel: "Cập nhật", tone: "primary" })) return;
      await courseraApi.update(order.id, order.status, status, note); onSaved();
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  }
  return <Modal onClose={busy ? undefined : onClose}>
    <h2 className="md-headline-small">Đơn #{order.id}</h2>
    <p className="my-3 break-words">{order.courseTitle}</p>
    <a href={order.courseUrl} target="_blank" rel="noreferrer" className="text-primary underline">Mở khóa học</a>
    <p className="my-3 break-all">{order.email}</p>
    {options.length > 0 && <div className="space-y-3">
      {password !== null && <p className="whitespace-pre-wrap break-all rounded-m3-sm bg-surface-container-highest p-3 font-mono">{password}</p>}
      <Button disabled={busy} onClick={() => password !== null ? setPassword(null) : void reveal()}>{password !== null ? "Ẩn mật khẩu" : "Xem mật khẩu Coursera"}</Button>
    </div>}
    <form onSubmit={save} className="mt-5 space-y-4">
      {options.length > 0 ? <>
        <Select label="Chuyển trạng thái" disabled={busy} value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)}>{options.map((value) => <option key={value} value={value}>{ORDER_LABELS[value]}</option>)}</Select>
        <Field label="Phản hồi cho người đặt"><textarea className={`${inputClass()} min-h-28 py-3`} maxLength={2000} disabled={busy} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      </> : <p>Đơn đã kết thúc: {ORDER_LABELS[order.status]}.</p>}
      <FormError message={error} />
      <ModalActions><Button type="button" disabled={busy} onClick={onClose}>Đóng</Button>{options.length > 0 && <Button type="submit" variant="primary" disabled={busy}>Cập nhật</Button>}</ModalActions>
    </form>
    {confirmDialog}
  </Modal>;
}
