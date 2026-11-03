import { useState, type FormEvent } from "react";
import { Loader2, Minus, Plus, UserRound, X } from "lucide-react";
import { adminApi } from "@/features/admin/api/admin.api";
import { useAuth } from "@/features/auth/AuthContext";
import { useToast } from "@/shared/context/ToastContext";
import { useSubmit } from "@/shared/hooks/useSubmit";
import type { Role, User, UserStatus } from "@/shared/types/api";
import { formatCredit } from "@/shared/utils/formatters";
import { Button } from "@/shared/ui/Button";
import { FormError } from "@/shared/ui/Feedback";
import { Input, Select } from "@/shared/ui/Input";
import { Modal, ModalTitle } from "@/shared/ui/Modal";

interface Props {
  user: User;
  onClose: () => void;
  onChanged: () => void; // báo danh sách tải lại
}

// Hộp thoại quản lý một thành viên: sửa thông tin/quyền/trạng thái và chỉnh số dư
export function UserDialog({ user, onClose, onChanged }: Props) {
  const { user: me, refresh } = useAuth();
  const toast = useToast();
  const isSelf = me?.id === user.id;

  const info = useSubmit();
  const [fullName, setFullName] = useState(user.fullName);
  const [role, setRole] = useState<Role>(user.role);
  const [status, setStatus] = useState<UserStatus>(user.status);
  const [current, setCurrent] = useState(user);

  const money = useSubmit();
  const [digits, setDigits] = useState("");
  const [note, setNote] = useState("");

  const changed = async () => {
    onChanged();
    if (isSelf) await refresh();
  };

  const saveInfo = (e: FormEvent) => {
    e.preventDefault();
    void info.run(async () => {
      setCurrent(await adminApi.updateUser(user.id, { fullName, role, status }));
      toast.success("Đã cập nhật thành viên");
      await changed();
    });
  };

  const adjust = (sign: 1 | -1) =>
    void money.run(async () => {
      setCurrent(await adminApi.adjustBalance(user.id, { amount: sign * Number(digits), note }));
      setDigits("");
      setNote("");
      toast.success(sign > 0 ? "Đã cộng credit" : "Đã trừ credit");
      await changed();
    });

  const amountOk = Number(digits) > 0 && note.trim().length > 0;

  return (
    <Modal onClose={onClose}>
      <div className="flex items-start justify-between gap-3">
        <ModalTitle icon={UserRound}>{current.fullName}</ModalTitle>
        <button onClick={onClose} aria-label="Đóng" className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
          <X size={18} />
        </button>
      </div>
      <p className="mt-1 break-all pl-[3.25rem] text-sm text-slate-500">{current.email}</p>

      <form onSubmit={saveInfo} className="mt-5 space-y-3" noValidate>
        <FormError message={info.error} />
        <Input label="Họ và tên" value={fullName} onChange={(e) => setFullName(e.target.value)} error={info.fieldErrors.fullName} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Vai trò" value={role} onChange={(e) => setRole(e.target.value as Role)} disabled={isSelf}>
            <option value="USER">Thành viên</option>
            <option value="ADMIN">Quản trị</option>
          </Select>
          <Select label="Trạng thái" value={status} onChange={(e) => setStatus(e.target.value as UserStatus)} disabled={isSelf}>
            <option value="ACTIVE">Hoạt động</option>
            <option value="BANNED">Khoá</option>
          </Select>
        </div>
        {isSelf && <p className="text-xs text-slate-500">Bạn không thể tự đổi vai trò hoặc khoá chính mình.</p>}
        <Button variant="primary" type="submit" disabled={info.loading || fullName.trim().length < 2}>
          {info.loading && <Loader2 size={16} className="animate-spin" />}
          Lưu thông tin
        </Button>
      </form>

      <div className="my-5 h-px bg-slate-100" />

      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-slate-700">Số dư</span>
          <span className="font-serif text-xl font-semibold tabular-nums text-slate-900">{formatCredit(current.balance)}</span>
        </div>
        <FormError message={money.error} />
        <Input
          label="Số credit"
          inputMode="numeric"
          value={digits ? Number(digits).toLocaleString("vi-VN") : ""}
          onChange={(e) => setDigits(e.target.value.replace(/\D/g, "").slice(0, 10))}
          error={money.fieldErrors.amount}
        />
        <Input label="Lý do" value={note} onChange={(e) => setNote(e.target.value)} error={money.fieldErrors.note} placeholder="Ví dụ: Hoàn tiền giao dịch lỗi" />
        <div className="flex gap-2">
          <Button grow disabled={money.loading || !amountOk} onClick={() => adjust(1)}>
            <Plus size={16} /> Cộng credit
          </Button>
          <Button grow disabled={money.loading || !amountOk} onClick={() => adjust(-1)}>
            <Minus size={16} /> Trừ credit
          </Button>
        </div>
      </div>
    </Modal>
  );
}
