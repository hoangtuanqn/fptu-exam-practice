import { useState, type FormEvent } from "react";
import { Gift, Loader2 } from "lucide-react";
import { adminApi } from "@/features/admin/api/admin.api";
import { useToast } from "@/shared/context/ToastContext";
import { useSubmit } from "@/shared/hooks/useSubmit";
import { Button } from "@/shared/ui/Button";
import { FormError } from "@/shared/ui/Feedback";
import { Input } from "@/shared/ui/Input";
import { Modal, ModalActions, ModalTitle } from "@/shared/ui/Modal";

interface Props {
  onClose: () => void;
  onCreated: () => void; // báo danh sách tải lại
}

// "2026-12-31" (ô chọn ngày) -> hết hạn cuối ngày đó theo giờ máy người dùng
const endOfDayIso = (date: string) => new Date(`${date}T23:59:59`).toISOString();

const UNITS = { minute: { label: "phút", minutes: 1 }, hour: { label: "giờ", minutes: 60 }, day: { label: "ngày", minutes: 1440 } } as const;
const MAX_TTL_MINUTES = 60 * 24 * 365; // khớp backend (CREDIT_TTL_MAX_MINUTES)

// Tạo giftcode mới: để trống mã thì hệ thống tự sinh
export function GiftCodeDialog({ onClose, onCreated }: Props) {
  const toast = useToast();
  const { run, loading, error, fieldErrors } = useSubmit();
  const [code, setCode] = useState("");
  const [amount, setAmount] = useState("");
  const [maxUses, setMaxUses] = useState("1");
  const [expires, setExpires] = useState("");
  const [note, setNote] = useState("");
  const [ttl, setTtl] = useState(""); // thời hạn của credit sau khi nhập (để trống = vĩnh viễn)
  const [unit, setUnit] = useState<keyof typeof UNITS>("day");

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const created = await adminApi.createGiftCode({
        code: code.trim() || undefined,
        amount: Number(amount),
        maxUses: Number(maxUses),
        expiresAt: expires ? endOfDayIso(expires) : undefined,
        note: note.trim() || undefined,
        creditTtlMinutes: ttlMinutes || undefined,
      });
      toast.success(`Đã tạo giftcode ${created.code}`);
      onCreated();
      onClose();
    });
  };

  const ttlMinutes = ttl ? Number(ttl) * UNITS[unit].minutes : 0;
  const valid = Number(amount) > 0 && Number(maxUses) > 0 && ttlMinutes <= MAX_TTL_MINUTES;

  return (
    <Modal onClose={onClose}>
      <ModalTitle icon={Gift}>Tạo giftcode</ModalTitle>
      <form onSubmit={onSubmit} className="mt-4 space-y-4" noValidate>
        <FormError message={error} />
        <Input
          label="Mã (tùy chọn)"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          error={fieldErrors.code}
          hint="Để trống để hệ thống tự sinh mã ngẫu nhiên. Chỉ gồm chữ, số, dấu gạch ngang."
          autoComplete="off"
          maxLength={32}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Credit mỗi lượt" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} error={fieldErrors.amount} />
          <Input label="Số lượt tối đa" inputMode="numeric" value={maxUses} onChange={(e) => setMaxUses(e.target.value.replace(/\D/g, ""))} error={fieldErrors.maxUses} />
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
            />
            <select
              aria-label="Đơn vị thời hạn credit"
              value={unit}
              onChange={(e) => setUnit(e.target.value as keyof typeof UNITS)}
              className="h-12 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800"
            >
              {Object.entries(UNITS).map(([k, u]) => (
                <option key={k} value={k}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
          <p className="mt-1 text-xs text-slate-500">Tính từ lúc người dùng nhập mã. Hết thời hạn mà chưa dùng thì số credit còn lại bị thu hồi (tối đa 1 năm).</p>
        </div>
        <Input label="Ghi chú (tùy chọn)" value={note} onChange={(e) => setNote(e.target.value)} error={fieldErrors.note} placeholder="Ví dụ: Tặng sinh viên K20" maxLength={200} />
        <ModalActions>
          <Button type="button" onClick={onClose}>
            Hủy
          </Button>
          <Button variant="primary" type="submit" disabled={loading || !valid}>
            {loading && <Loader2 size={16} className="animate-spin" />}
            Tạo mã
          </Button>
        </ModalActions>
      </form>
    </Modal>
  );
}
