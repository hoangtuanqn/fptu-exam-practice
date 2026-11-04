import { X } from "lucide-react";
import { Link } from "react-router-dom";

export interface UserRef {
  id: number;
  email: string;
  fullName: string;
}

// Tên + email của một thành viên; bấm vào để mở danh sách thành viên đã lọc theo email đó
export function UserCell({ user }: { user: UserRef | null }) {
  if (!user) return <span className="text-slate-400">—</span>;
  return (
    <Link to={`/admin/users?q=${encodeURIComponent(user.email)}`} className="block min-w-0 hover:underline">
      <div className="truncate font-medium text-slate-800">{user.fullName}</div>
      <div className="truncate text-xs text-slate-500">{user.email}</div>
    </Link>
  );
}

// Nhãn báo đang lọc theo một thành viên, bấm để bỏ lọc
export function UserFilterChip({ userId, label, onClear }: { userId: string; label?: string; onClear: () => void }) {
  if (!userId) return null;
  return (
    <button
      type="button"
      onClick={onClear}
      className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-800 hover:bg-brand-100"
    >
      Thành viên: {label ?? `#${userId}`}
      <X size={14} />
    </button>
  );
}
