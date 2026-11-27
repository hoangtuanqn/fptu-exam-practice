import { useState } from "react";
import { Crown, ShieldCheck } from "lucide-react";
import { API_ORIGIN } from "@/shared/api/client";
import { useMascotSvg } from "@/shared/season/useMascotSvg";
import { GOLD_GLOSS } from "@/shared/ui/gold";
import { isPro } from "@/shared/utils/pro";

export type AvatarTier = "free" | "pro" | "admin";

// Hạng viền của một tài khoản; admin ưu tiên hơn Pro
export const avatarTier = (user: { role?: string; proExpiresAt?: string | null }): AvatarTier =>
  user.role === "ADMIN" ? "admin" : isPro({ proExpiresAt: user.proExpiresAt ?? null }) ? "pro" : "free";

// Viền theo hạng: màu cố định (như vàng Pro trong gold.ts) để nhận ra ở cả giao diện sáng và tối
const FRAME: Record<AvatarTier, string> = {
  free: "bg-outline-variant",
  pro: "bg-[conic-gradient(from_210deg,#fff3c4,#ffc61f,#c97f00,#ffe58a,#f0a800,#fff3c4)] shadow-[0_0_10px_-1px_rgba(240,168,0,0.7)]",
  admin: "bg-[conic-gradient(from_210deg,#a5f3fc,#6366f1,#a855f7,#38bdf8,#4338ca,#a5f3fc)] shadow-[0_0_10px_-1px_rgba(99,102,241,0.75)]",
};
const MARK = {
  pro: { label: "Thành viên Pro", icon: Crown, tone: GOLD_GLOSS },
  admin: { label: "Quản trị viên", icon: ShieldCheck, tone: "bg-gradient-to-b from-[#818cf8] to-[#4338ca] text-white" },
};

interface UserAvatarProps {
  avatarPath?: string | null;
  src?: string | null; // địa chỉ đầy đủ máy chủ đã dựng sẵn (thay cho avatarPath)
  alt?: string;
  className?: string; // kích thước (gồm cả viền)
  tier?: AvatarTier; // có thì vẽ viền theo hạng; Pro và admin kèm huy hiệu nhỏ ở góc
}

export function UserAvatar({ avatarPath, src: fullSrc, alt = "Avatar", className = "h-8 w-8", tier }: UserAvatarProps) {
  const mascotSvg = useMascotSvg();
  const url = fullSrc || (avatarPath ? `${API_ORIGIN}/api/v1/files/${avatarPath}` : null);
  const [broken, setBroken] = useState<string | null>(null); // địa chỉ ảnh tải lỗi: dùng linh vật mặc định
  const src = url === broken ? null : url;
  const picture = (size: string) =>
    src ? (
      <span className={`inline-flex shrink-0 overflow-hidden rounded-full bg-surface-container-lowest ${size}`}>
        <img src={src} alt={alt} onError={() => setBroken(src)} className="h-full w-full object-cover" />
      </span>
    ) : (
      <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-50 p-1 ${size}`} dangerouslySetInnerHTML={{ __html: mascotSvg }} aria-label={alt} />
    );

  if (!tier) return picture(`border border-slate-200 ${className}`);

  const mark = tier === "free" ? null : MARK[tier];
  return (
    <span className={`relative inline-flex shrink-0 rounded-full ${tier === "free" ? "p-px" : "p-[2px]"} ${FRAME[tier]} ${className}`}>
      {/* khe hở cùng màu nền tách ảnh khỏi viền */}
      <span className={`flex h-full w-full rounded-full bg-surface ${tier === "free" ? "" : "p-[1.5px]"}`}>{picture("h-full w-full")}</span>
      {mark && (
        <span role="img" aria-label={mark.label} title={mark.label} className={`absolute -bottom-[6%] -right-[6%] flex h-[44%] w-[44%] items-center justify-center rounded-full ring-2 ring-surface ${mark.tone}`}>
          <mark.icon className="h-[66%] w-[66%]" strokeWidth={2.5} aria-hidden />
        </span>
      )}
    </span>
  );
}
