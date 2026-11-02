import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { userApi } from "../../api/user.api";
import { Button } from "../../components/ui/Button";
import { Card, CardHeader, PageHeader } from "../../components/ui/Card";
import { FormError } from "../../components/ui/Feedback";
import { Input, PasswordInput } from "../../components/ui/Input";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useSubmit } from "../../hooks/useSubmit";

function InfoForm() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const { run, loading, error, fieldErrors } = useSubmit();
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const unchanged = fullName.trim() === user?.fullName;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      setUser(await userApi.updateProfile({ fullName }));
      toast.success("Đã cập nhật thông tin");
    });
  };

  return (
    <Card>
      <CardHeader title="Thông tin cá nhân" />
      <form onSubmit={onSubmit} className="space-y-4 p-5" noValidate>
        <FormError message={error} />
        <Input label="Email" value={user?.email ?? ""} disabled hint="Email dùng để đăng nhập, không đổi được" />
        <Input label="Họ và tên" value={fullName} onChange={(e) => setFullName(e.target.value)} error={fieldErrors.fullName} />
        <Button variant="primary" type="submit" disabled={loading || unchanged || fullName.trim().length < 2}>
          {loading && <Loader2 size={16} className="animate-spin" />}
          Lưu thay đổi
        </Button>
      </form>
    </Card>
  );
}

function PasswordForm() {
  const toast = useToast();
  const { run, loading, error, fieldErrors, setFieldErrors } = useSubmit();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (form.newPassword !== form.confirm) return setFieldErrors({ confirm: "Mật khẩu nhập lại không khớp" });
    void run(async () => {
      await userApi.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      setForm({ currentPassword: "", newPassword: "", confirm: "" });
      toast.success("Đã đổi mật khẩu");
    });
  };

  return (
    <Card>
      <CardHeader title="Đổi mật khẩu" />
      <form onSubmit={onSubmit} className="space-y-4 p-5" noValidate>
        <FormError message={error} />
        <PasswordInput
          label="Mật khẩu hiện tại"
          autoComplete="current-password"
          value={form.currentPassword}
          onChange={set("currentPassword")}
          error={fieldErrors.currentPassword}
        />
        <PasswordInput
          label="Mật khẩu mới"
          autoComplete="new-password"
          value={form.newPassword}
          onChange={set("newPassword")}
          error={fieldErrors.newPassword}
          hint="Tối thiểu 8 ký tự, gồm chữ và số"
        />
        <PasswordInput
          label="Nhập lại mật khẩu mới"
          autoComplete="new-password"
          value={form.confirm}
          onChange={set("confirm")}
          error={fieldErrors.confirm}
        />
        <Button variant="primary" type="submit" disabled={loading || !form.currentPassword || !form.newPassword || !form.confirm}>
          {loading && <Loader2 size={16} className="animate-spin" />}
          Đổi mật khẩu
        </Button>
      </form>
    </Card>
  );
}

export default function ProfilePage() {
  return (
    <>
      <PageHeader title="Hồ sơ" description="Quản lý thông tin và mật khẩu của bạn." />
      <div className="grid gap-6 lg:grid-cols-2">
        <InfoForm />
        <PasswordForm />
      </div>
    </>
  );
}
