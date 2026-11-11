import { Check, Circle, X } from "lucide-react";

// Điều kiện mật khẩu, khớp với `passwordField` ở backend/src/rules/requests/auth.request.ts (đổi một bên thì đổi cả bên kia)
export const passwordChecks = (password: string) => [
  { label: "Ít nhất 8 ký tự", ok: password.length >= 8 },
  { label: "Có chữ cái", ok: /[A-Za-z]/.test(password) },
  { label: "Có chữ số", ok: /\d/.test(password) },
];

export const passwordValid = (password: string) => passwordChecks(password).every((c) => c.ok);

// Danh sách điều kiện dưới ô mật khẩu. Chưa gõ: xám để người dùng biết trước yêu cầu. Đang gõ: đạt thì xanh có dấu tích, chưa đạt thì đỏ có dấu X.
export function PasswordRules({ password }: { password: string }) {
  const typed = password.length > 0;
  return (
    <ul aria-live="polite" aria-label="Điều kiện mật khẩu" className="-mt-1 space-y-1 px-4">
      {passwordChecks(password).map(({ label, ok }) => {
        const tone = !typed ? "text-on-surface-variant" : ok ? "text-success" : "text-error";
        const Icon = !typed ? Circle : ok ? Check : X;
        return (
          <li key={label} className={`md-body-small flex items-center gap-2 transition-colors ${tone}`}>
            <Icon size={14} strokeWidth={typed ? 3 : 2} className="shrink-0" />
            <span>{label}</span>
            <span className="sr-only">{!typed ? "" : ok ? ", đã đạt" : ", chưa đạt"}</span>
          </li>
        );
      })}
    </ul>
  );
}
