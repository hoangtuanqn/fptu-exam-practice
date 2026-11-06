import { LogOut, UserCog } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { impersonation } from "@/shared/api/client";

// Dải nổi báo admin đang xem hệ thống dưới danh nghĩa một thành viên. Bấm thoát để quay lại tài khoản admin.
export function ImpersonationBanner() {
  const { user, signOut } = useAuth();
  if (!user || !impersonation.active()) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[80] flex justify-center px-3">
      <div className="pointer-events-auto flex max-w-full items-center gap-3 rounded-full border border-amber-300 bg-amber-50 py-1.5 pl-4 pr-1.5 text-sm text-amber-900 shadow-pop">
        <UserCog size={16} className="shrink-0 text-amber-600" />
        <span className="min-w-0 truncate">
          Đang đăng nhập thay <b>{user.fullName}</b>
        </span>
        <button
          onClick={signOut}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-amber-600"
        >
          <LogOut size={13} /> Thoát
        </button>
      </div>
    </div>
  );
}
