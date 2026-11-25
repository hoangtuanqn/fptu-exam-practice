import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Loader2, Trash2 } from "lucide-react";
import { userApi } from "@/features/account/api/user.api";
import { useAuth } from "@/features/auth/AuthContext";
import { impersonation } from "@/shared/api/client";
import { waitText, withoutWait } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { useSubmit } from "@/shared/hooks/useSubmit";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { FormError } from "@/shared/ui/Feedback";
import { Input, PasswordInput } from "@/shared/ui/Input";
import { Modal, ModalActions, ModalTitle } from "@/shared/ui/Modal";
import { formatCredit, formatDate } from "@/shared/utils/formatters";
import { isPro } from "@/shared/utils/pro";

// Mục "Xoá tài khoản" cuối trang Hồ sơ. Máy chủ mới là nơi chặn (quản trị viên, đăng nhập thay, còn đơn đang xử lý).
export function DeleteAccountCard() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  // undefined = backend cũ chưa có tính năng này
  if (!user || user.deleteRequestedAt === undefined || user.role === "ADMIN" || impersonation.active()) return null;

  return (
    <Card className="mt-6 flex flex-wrap items-center justify-between gap-4 p-5">
      <div className="min-w-0">
        <p className="md-title-small text-on-surface">Xoá tài khoản</p>
        <p className="md-body-medium mt-1 text-on-surface-variant">Đóng tài khoản và xoá dữ liệu cá nhân của bạn.</p>
      </div>
      <Button onClick={() => setOpen(true)}>
        <Trash2 size={16} />
        Xoá tài khoản
      </Button>
      {open && <DeleteAccountDialog onClose={() => setOpen(false)} />}
    </Card>
  );
}

function DeleteAccountDialog({ onClose }: { onClose: () => void }) {
  const { user, signOut } = useAuth();
  const toast = useToast();
  // Tài khoản Google/GitHub không biết mật khẩu nên xác nhận bằng email
  const [byEmail, setByEmail] = useState(false);
  const [value, setValue] = useState("");
  // Chỉ ô đang hiện: lỗi của ô đang ẩn (gửi email cho tài khoản mật khẩu) phải lên hộp lỗi chung
  const { run, loading, error, fieldErrors, clear, retryIn } = useSubmit("Chưa xoá được tài khoản, bạn thử lại nhé", [byEmail ? "email" : "password"]);

  if (!user) return null;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!value || retryIn > 0) return;
    void run(async () => {
      const { deleteAt } = await userApi.requestDeletion(byEmail ? { email: value } : { password: value });
      signOut();
      toast.success(`Đã nhận yêu cầu xoá tài khoản. Đăng nhập lại trước ngày ${formatDate(deleteAt)} nếu bạn muốn huỷ.`, { duration: 10000 });
    });
  };

  return (
    <Modal onClose={loading ? undefined : onClose}>
      <ModalTitle icon={Trash2}>Xoá tài khoản?</ModalTitle>
      <ul className="md-body-medium mt-3 list-disc space-y-1.5 pl-5 text-on-surface-variant">
        <li>Tài khoản đóng ngay và mọi thiết bị bị đăng xuất.</li>
        <li>Trong 14 ngày, đăng nhập lại là huỷ yêu cầu. Sau đó không khôi phục được.</li>
        <li>
          Số dư {formatCredit(user.balance)}
          {isPro(user) && " và gói Pro đang dùng"} sẽ bị huỷ, không hoàn tiền.
        </li>
        <li>Câu đã lưu, sổ câu sai, huy hiệu và dữ liệu cá nhân bị xoá. Lịch sử giao dịch và một số dữ liệu vẫn được giữ.</li>
      </ul>
      <Link to="/bao-mat" target="_blank" className="md-label-large mt-2 inline-block text-primary hover:underline">
        Xem chi tiết dữ liệu nào được giữ
      </Link>

      <form onSubmit={onSubmit} className="mt-4 space-y-3" noValidate>
        <FormError message={retryIn > 0 ? withoutWait(error) : error} />
        {byEmail ? (
          <Input
            label="Nhập email của tài khoản để xác nhận"
            type="email"
            autoComplete="off"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            error={fieldErrors.email}
            placeholder={user.email}
          />
        ) : (
          <PasswordInput
            label="Nhập mật khẩu để xác nhận"
            autoComplete="current-password"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            error={fieldErrors.password}
          />
        )}
        <button
          type="button"
          className="md-label-large text-primary hover:underline"
          onClick={() => {
            setByEmail((v) => !v);
            setValue("");
            clear();
          }}
        >
          {byEmail ? "Xác nhận bằng mật khẩu" : "Bạn đăng nhập bằng Google hoặc GitHub? Xác nhận bằng email"}
        </button>
        <ModalActions>
          <Button onClick={onClose} type="button" disabled={loading}>
            Giữ tài khoản
          </Button>
          <Button variant="danger" type="submit" disabled={loading || retryIn > 0 || !value}>
            {loading && <Loader2 size={16} className="animate-spin" />}
            {retryIn > 0 ? `Thử lại sau ${waitText(retryIn)}` : "Xoá tài khoản"}
          </Button>
        </ModalActions>
      </form>
    </Modal>
  );
}
