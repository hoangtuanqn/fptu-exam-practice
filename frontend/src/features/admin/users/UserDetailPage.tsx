import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ClipboardList, Coins, KeyRound, Loader2, LogIn, LogOut, Mail, Minus, MonitorSmartphone, Plus, ShieldCheck, Wallet } from "lucide-react";
import { adminApi, type UserSummary } from "@/features/admin/api/admin.api";
import { useAuth } from "@/features/auth/AuthContext";
import { impersonation } from "@/shared/api/client";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { useSubmit } from "@/shared/hooks/useSubmit";
import type { Role, User, UserStatus } from "@/shared/types/api";
import { formatCredit, formatDate, formatDateTime, initials } from "@/shared/utils/formatters";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { CopyButton } from "@/shared/ui/CopyButton";
import { ErrorBox, FormError, Loading } from "@/shared/ui/Feedback";
import { Input, Select } from "@/shared/ui/Input";

function Stat({ icon, label, value, hint }: { icon: ReactNode; label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-3.5 py-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {icon} {label}
      </div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">{value}</div>
      {hint && <div className="text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

// Nút hai bước cho thao tác nhạy cảm: bấm lần đầu để "lên đạn", lần hai mới thực hiện
function ConfirmButton({ label, confirmLabel, icon, onConfirm, disabled }: { label: string; confirmLabel: string; icon: ReactNode; onConfirm: () => void; disabled?: boolean }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <Button
      variant={armed ? "danger" : "secondary"}
      disabled={disabled}
      onClick={() => {
        if (!armed) return setArmed(true);
        setArmed(false);
        onConfirm();
      }}
    >
      {icon} {armed ? confirmLabel : label}
    </Button>
  );
}

function Panel({ icon, title, desc, children }: { icon: ReactNode; title: string; desc?: string; children: ReactNode }) {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">{icon}</div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {desc && <p className="mt-0.5 text-sm leading-relaxed text-slate-500">{desc}</p>}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </Card>
  );
}

export default function UserDetailPage() {
  const { id } = useParams();
  const userId = Number(id);
  const { data, error, loading, reload } = useApi(() => adminApi.user(userId), [userId]);
  if (!Number.isInteger(userId)) return <ErrorBox message="Thành viên không hợp lệ" />;
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "Không tải được thành viên"} onRetry={reload} />;
  return <UserDetail key={data.id} initial={data} />;
}

function UserDetail({ initial }: { initial: User }) {
  const { user: me, refresh } = useAuth();
  const toast = useToast();
  const userId = initial.id;
  const isSelf = me?.id === userId;

  const [current, setCurrent] = useState(initial);
  const [summary, setSummary] = useState<UserSummary | null>(null);
  const loadSummary = () => void adminApi.userSummary(userId).then(setSummary).catch(() => undefined);
  useEffect(loadSummary, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const info = useSubmit();
  const [fullName, setFullName] = useState(initial.fullName);
  const [role, setRole] = useState<Role>(initial.role);
  const [status, setStatus] = useState<UserStatus>(initial.status);
  const [verified, setVerified] = useState(!!initial.emailVerifiedAt);

  const money = useSubmit();
  const [digits, setDigits] = useState("");
  const [note, setNote] = useState("");

  const pwd = useSubmit();
  const [newPassword, setNewPassword] = useState("");
  const [issued, setIssued] = useState<string | null>(null); // mật khẩu vừa đặt, chỉ hiện một lần
  const mail = useSubmit();
  const revoke = useSubmit();
  const login = useSubmit();

  const changed = async () => {
    loadSummary();
    if (isSelf) await refresh();
  };

  const saveInfo = (e: FormEvent) => {
    e.preventDefault();
    void info.run(async () => {
      setCurrent(await adminApi.updateUser(userId, { fullName, role, status, emailVerified: verified }));
      toast.success("Đã cập nhật thành viên");
      await changed();
    });
  };

  const adjust = (sign: 1 | -1) =>
    void money.run(async () => {
      setCurrent(await adminApi.adjustBalance(userId, { amount: sign * Number(digits), note }));
      setDigits("");
      setNote("");
      toast.success(sign > 0 ? "Đã cộng credit" : "Đã trừ credit");
      await changed();
    });

  const resetPassword = () =>
    void pwd.run(async () => {
      const { password } = await adminApi.resetUserPassword(userId, newPassword || undefined);
      setIssued(password);
      setNewPassword("");
      toast.success("Đã đặt lại mật khẩu và đăng xuất mọi thiết bị");
      loadSummary();
    });

  const sendLink = () =>
    void mail.run(async () => {
      await adminApi.sendResetLink(userId);
      toast.success(`Đã gửi thư tới ${current.email}`);
    });

  const logoutAll = () =>
    void revoke.run(async () => {
      await adminApi.revokeUserSessions(userId);
      toast.success("Đã đăng xuất thành viên khỏi mọi thiết bị");
      loadSummary();
    });

  // Mở phiên của thành viên trong tab này (token chỉ nằm ở tab, admin thoát bằng nút nổi ở góc dưới)
  const loginAs = () =>
    void login.run(async () => {
      const { token } = await adminApi.impersonateUser(userId);
      impersonation.start(token);
      window.location.assign("/");
    });

  const amountOk = Number(digits) > 0 && note.trim().length > 0;
  const canImpersonate = !isSelf && current.role !== "ADMIN" && current.status === "ACTIVE";
  const pwdTooShort = newPassword.length > 0 && newPassword.length < 8;
  const adminOther = current.role === "ADMIN" && !isSelf;

  return (
    <>
      <Link to="/admin/users" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft size={15} /> Danh sách thành viên
      </Link>

      {/* Đầu trang */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-xl font-bold text-white shadow-md shadow-brand-600/30">
            {initials(current.fullName)}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold text-slate-900">{current.fullName}</h1>
            <p className="truncate text-sm text-slate-500">{current.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge tone={current.role === "ADMIN" ? "info" : "neutral"}>{current.role === "ADMIN" ? "Quản trị" : "Thành viên"}</Badge>
              <Badge tone={current.status === "ACTIVE" ? "success" : "danger"}>{current.status === "ACTIVE" ? "Hoạt động" : "Bị khoá"}</Badge>
              <Badge tone={current.emailVerifiedAt ? "success" : "warning"}>{current.emailVerifiedAt ? "Email đã xác minh" : "Chưa xác minh email"}</Badge>
              <span className="text-xs text-slate-400">#{current.id} · tham gia {formatDate(current.createdAt)}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <Link to={`/admin/wallet?userId=${userId}`} className="font-medium text-brand-700 hover:underline">Biến động số dư</Link>
          <Link to={`/admin/deposits?userId=${userId}`} className="font-medium text-brand-700 hover:underline">Lệnh nạp</Link>
          <Link to={`/admin/crawl-jobs?userId=${userId}`} className="font-medium text-brand-700 hover:underline">Lấy đề</Link>
          <Link to={`/admin/attempts?userId=${userId}`} className="font-medium text-brand-700 hover:underline">Bài làm</Link>
          <Link to={`/admin/purchases?userId=${userId}`} className="font-medium text-brand-700 hover:underline">Lịch sử mua</Link>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={<Wallet size={12} />} label="Số dư" value={current.balance.toLocaleString("vi-VN")} hint="credit" />
        <Stat icon={<Coins size={12} />} label="Đã nạp" value={summary ? `${summary.depositTotal.toLocaleString("vi-VN")} ₫` : "…"} hint={summary ? `${summary.deposits} lệnh thành công` : undefined} />
        <Stat icon={<ClipboardList size={12} />} label="Bài làm" value={summary ? summary.attempts : "…"} hint={summary ? `${summary.exams} đề trong kho` : undefined} />
        <Stat
          icon={<MonitorSmartphone size={12} />}
          label="Phiên đăng nhập"
          value={summary ? summary.activeSessions : "…"}
          hint={summary ? (summary.lastAttemptAt ? `làm bài gần nhất ${formatDateTime(summary.lastAttemptAt)}` : `giới thiệu ${summary.referrals} người`) : undefined}
        />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        {/* Cột trái: thông tin + số dư */}
        <div className="space-y-6">
          <Panel icon={<ShieldCheck size={18} />} title="Thông tin tài khoản" desc="Tên hiển thị, vai trò, trạng thái và xác minh email.">
            <form onSubmit={saveInfo} className="space-y-3" noValidate>
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
              <Select label="Email" value={verified ? "yes" : "no"} onChange={(e) => setVerified(e.target.value === "yes")}>
                <option value="yes">Đã xác minh</option>
                <option value="no">Chưa xác minh</option>
              </Select>
              {isSelf && <p className="text-xs text-slate-500">Bạn không thể tự đổi vai trò hoặc khoá chính mình.</p>}
              <Button variant="primary" type="submit" disabled={info.loading || fullName.trim().length < 2}>
                {info.loading && <Loader2 size={16} className="animate-spin" />}
                Lưu thông tin
              </Button>
            </form>
          </Panel>

          <Panel icon={<Wallet size={18} />} title="Số dư credit" desc="Cộng hoặc trừ credit; lý do hiện trong lịch sử của thành viên.">
            <div className="mb-3 flex items-baseline justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <span className="text-sm font-medium text-slate-600">Số dư hiện tại</span>
              <span className="font-serif text-2xl font-semibold tabular-nums text-slate-900">{formatCredit(current.balance)}</span>
            </div>
            <div className="space-y-3">
              <FormError message={money.error} />
              <Input label="Số credit" inputMode="numeric" value={digits ? Number(digits).toLocaleString("vi-VN") : ""} onChange={(e) => setDigits(e.target.value.replace(/\D/g, "").slice(0, 10))} error={money.fieldErrors.amount} />
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
          </Panel>
        </div>

        {/* Cột phải: bảo mật */}
        <div className="space-y-6">
          <Panel icon={<KeyRound size={18} />} title="Đặt lại mật khẩu" desc="Đặt mật khẩu mới ngay: thành viên bị đăng xuất khỏi mọi thiết bị và nhận email cảnh báo. Để trống ô nhập để hệ thống tự sinh mật khẩu ngẫu nhiên.">
            <FormError message={pwd.error} />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <div className="flex-1">
                <Input label="" aria-label="Mật khẩu mới" type="text" autoComplete="off" placeholder="Mật khẩu mới (để trống = tự sinh)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} error={pwdTooShort ? "Tối thiểu 8 ký tự" : pwd.fieldErrors.password} />
              </div>
              <ConfirmButton label="Đặt lại" confirmLabel="Bấm lần nữa để xác nhận" icon={pwd.loading ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />} onConfirm={resetPassword} disabled={pwd.loading || pwdTooShort || adminOther} />
            </div>
            {adminOther && <p className="mt-2 text-xs text-slate-400">Không đặt lại mật khẩu của quản trị viên khác.</p>}
            {issued && (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-xs font-medium text-emerald-800">Mật khẩu mới (chỉ hiện một lần, hãy gửi cho thành viên):</p>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <code className="select-all break-all font-mono text-base font-semibold text-emerald-900">{issued}</code>
                  <CopyButton text={issued} label="Sao chép mật khẩu" />
                </div>
              </div>
            )}
          </Panel>

          <Panel icon={<Mail size={18} />} title="Gửi thư đặt lại mật khẩu" desc={`Gửi liên kết đặt lại mật khẩu tới ${current.email} để thành viên tự chọn mật khẩu mới.`}>
            <FormError message={mail.error} />
            <Button disabled={mail.loading || current.status === "BANNED"} onClick={sendLink}>
              {mail.loading ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />} Gửi thư
            </Button>
          </Panel>

          <Panel
            icon={<MonitorSmartphone size={18} />}
            title="Đăng xuất mọi thiết bị"
            desc={summary ? `Đang có ${summary.activeSessions} phiên đăng nhập còn hiệu lực. Thu hồi hết, thành viên phải đăng nhập lại.` : "Thu hồi mọi phiên đăng nhập, thành viên phải đăng nhập lại."}
          >
            <FormError message={revoke.error} />
            <ConfirmButton label="Đăng xuất tất cả" confirmLabel="Bấm lần nữa để xác nhận" icon={<LogOut size={15} />} onConfirm={logoutAll} disabled={revoke.loading} />
          </Panel>

          <Panel icon={<LogIn size={18} />} title="Đăng nhập với tư cách thành viên" desc="Xem đúng những gì thành viên thấy để hỗ trợ. Phiên chỉ mở ở tab này (2 giờ), tài khoản admin của bạn giữ nguyên; bấm nút “Thoát” ở góc dưới để quay lại. Thao tác được ghi nhật ký máy chủ.">
            <FormError message={login.error} />
            <Button variant="primary" disabled={login.loading || !canImpersonate} onClick={loginAs}>
              {login.loading ? <Loader2 size={15} className="animate-spin" /> : <LogIn size={15} />} Đăng nhập thay
            </Button>
            {!canImpersonate && <p className="mt-2 text-xs text-slate-400">{isSelf ? "Đây là tài khoản của bạn." : current.role === "ADMIN" ? "Không đăng nhập thay quản trị viên khác." : "Tài khoản đang bị khoá, hãy mở khoá trước."}</p>}
          </Panel>
        </div>
      </div>
    </>
  );
}
