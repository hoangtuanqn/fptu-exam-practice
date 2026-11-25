import { useState, type FormEvent } from "react";
import { Gift, Loader2 } from "lucide-react";
import { adminApi, type GiftCodePatch } from "@/features/admin/api/admin.api";
import { useToast } from "@/shared/context/ToastContext";
import { useSubmit } from "@/shared/hooks/useSubmit";
import type { GiftCode } from "@/shared/types/api";
import { Button } from "@/shared/ui/Button";
import { FormError } from "@/shared/ui/Feedback";
import { Input } from "@/shared/ui/Input";
import { Modal, ModalActions, ModalTitle } from "@/shared/ui/Modal";

interface Props {
  onClose: () => void;
  onSaved: () => void; // báo danh sách tải lại
  editing?: GiftCode; // có = sửa mã này, không có = tạo mới
}

// "2026-12-31" (ô chọn ngày) -> hết hạn cuối ngày đó theo giờ máy người dùng
const endOfDayIso = (date: string) => new Date(`${date}T23:59:59`).toISOString();
// ISO -> "YYYY-MM-DD" theo giờ máy người dùng (ngược lại endOfDayIso)
const toLocalDate = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

const UNITS = { minute: { label: "phút", minutes: 1 }, hour: { label: "giờ", minutes: 60 }, day: { label: "ngày", minutes: 1440 } } as const;
type Unit = keyof typeof UNITS;
const MAX_TTL_MINUTES = 60 * 24 * 365; // khớp backend (CREDIT_TTL_MAX_MINUTES)

// Đơn vị lớn nhất chia hết số phút, để 2880 phút hiện thành "2 ngày"
const ttlUnit = (minutes: number): Unit => (minutes % 1440 === 0 ? "day" : minutes % 60 === 0 ? "hour" : "minute");

// Tạo giftcode mới (để trống mã thì hệ thống tự sinh) hoặc sửa mã có sẵn
export function GiftCodeDialog({ onClose, onSaved, editing }: Props) {
  const toast = useToast();
  const { run, loading, error, fieldErrors } = useSubmit();
  const initTtl = editing?.creditTtlMinutes ?? 0;
  const initUnit: Unit = initTtl ? ttlUnit(initTtl) : "day";
  const initExpires = editing?.expiresAt ? toLocalDate(editing.expiresAt) : "";
  const [code, setCode] = useState(editing?.code ?? "");
  const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
  const [maxUses, setMaxUses] = useState(editing ? String(editing.maxUses) : "1");
  const [expires, setExpires] = useState(initExpires);
  const [note, setNote] = useState(editing?.note ?? "");
  const [ttl, setTtl] = useState(initTtl ? String(initTtl / UNITS[initUnit].minutes) : ""); // thời hạn của credit sau khi nhập (để trống = vĩnh viễn)
  const [unit, setUnit] = useState<Unit>(initUnit);

  const used = editing?.usedCount ?? 0;
  const locked = used > 0; // mã đã có người dùng: không đổi mã, credit, thời hạn credit
  const lockedHint = locked ? "Mã đã có người dùng nên không đổi được" : undefined;
  const ttlMinutes = ttl ? Number(ttl) * UNITS[unit].minutes : 0;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      if (!editing) {
        const created = await adminApi.createGiftCode({
          code: code.trim() || undefined,
          amount: Number(amount),
          maxUses: Number(maxUses),
          expiresAt: expires ? endOfDayIso(expires) : undefined,
          note: note.trim() || undefined,
          creditTtlMinutes: ttlMinutes || undefined,
        });
        toast.success(`Đã tạo giftcode ${created.code}`);
      } else {
        const patch: GiftCodePatch = {};
        if (code.trim() !== editing.code) patch.code = code.trim();
        if (Number(amount) !== editing.amount) patch.amount = Number(amount);
        if (Number(maxUses) !== editing.maxUses) patch.maxUses = Number(maxUses);
        if (expires !== initExpires) patch.expiresAt = expires ? endOfDayIso(expires) : null;
        if (note.trim() !== (editing.note ?? "")) patch.note = note.trim() || null;
        if (ttlMinutes !== initTtl) patch.creditTtlMinutes = ttlMinutes || null;
        if (Object.keys(patch).length > 0) {
          const saved = await adminApi.updateGiftCode(editing.id, patch);
          toast.success(`Đã lưu giftcode ${saved.code}`);
        }
      }
      onSaved();
      onClose();
    });
  };

  const valid =
    Number(amount) > 0 && Number(maxUses) >= Math.max(1, used) && ttlMinutes <= MAX_TTL_MINUTES && (!editing || code.trim() !== "");

  return (
    <Modal onClose={onClose}>
      <ModalTitle icon={Gift}>{editing ? "Sửa giftcode" : "Tạo giftcode"}</ModalTitle>
      <form onSubmit={onSubmit} className="mt-4 space-y-4" noValidate>
        <FormError message={error} />
        <Input
          label={editing ? "Mã" : "Mã (tùy chọn)"}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          error={fieldErrors.code}
          hint={lockedHint ?? (editing ? "Chỉ gồm chữ, số, dấu gạch ngang." : "Để trống để hệ thống tự sinh mã ngẫu nhiên. Chỉ gồm chữ, số, dấu gạch ngang.")}
          autoComplete="off"
          maxLength={32}
          disabled={locked}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Credit mỗi lượt"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
            error={fieldErrors.amount}
            hint={lockedHint}
            disabled={locked}
          />
          <Input
            label="Số lượt tối đa"
            inputMode="numeric"
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value.replace(/\D/g, ""))}
            error={fieldErrors.maxUses}
            hint={locked ? `Ít nhất ${used} (đã có người dùng)` : undefined}
          />
        </div>
        <Input
          label="Hạn dùng (tùy chọn)"
          type="date"
          min={new Date().toISOString().slice(0, 10)}
          value={expires}
          onChange={(e) => setExpires(e.target.value)}
          error={fieldErrors.expiresAt}
          hint="Để trống nếu không hết hạn."
        />
        <div>
          <div className="grid grid-cols-[1fr_auto] items-end gap-3">
            <Input
              label="Credit dùng được trong (tùy chọn)"
              inputMode="numeric"
              value={ttl}
              onChange={(e) => setTtl(e.target.value.replace(/\D/g, ""))}
              error={fieldErrors.creditTtlMinutes}
              placeholder="Để trống = credit vĩnh viễn"
              disabled={locked}
            />
            <select
              aria-label="Đơn vị thời hạn credit"
              value={unit}
              onChange={(e) => setUnit(e.target.value as Unit)}
              disabled={locked}
              className="h-12 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 disabled:opacity-40"
            >
              {Object.entries(UNITS).map(([k, u]) => (
                <option key={k} value={k}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {lockedHint ?? "Tính từ lúc người dùng nhập mã. Hết thời hạn mà chưa dùng thì số credit còn lại bị thu hồi (tối đa 1 năm)."}
          </p>
        </div>
        <Input label="Ghi chú (tùy chọn)" value={note} onChange={(e) => setNote(e.target.value)} error={fieldErrors.note} placeholder="Ví dụ: Tặng sinh viên K20" maxLength={200} />
        <ModalActions>
          <Button type="button" onClick={onClose}>
            Hủy
          </Button>
          <Button variant="primary" type="submit" disabled={loading || !valid}>
            {loading && <Loader2 size={16} className="animate-spin" />}
            {editing ? "Lưu thay đổi" : "Tạo mã"}
          </Button>
        </ModalActions>
      </form>
    </Modal>
  );
}
