import { API_ORIGIN } from "@/shared/api/client";
import { useMascotSvg } from "@/shared/season/useMascotSvg";

interface UserAvatarProps {
  avatarPath?: string | null;
  src?: string | null; // địa chỉ đầy đủ máy chủ đã dựng sẵn (thay cho avatarPath)
  alt?: string;
  className?: string;
}

export function UserAvatar({ avatarPath, src: fullSrc, alt = "Avatar", className = "h-8 w-8" }: UserAvatarProps) {
  const mascotSvg = useMascotSvg();
  if (avatarPath || fullSrc) {
    const src = fullSrc || `${API_ORIGIN}/api/v1/files/${avatarPath}`;
    return (
      <span className={`inline-flex shrink-0 overflow-hidden rounded-full border border-slate-200 bg-surface-container-lowest ${className}`}>
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-brand-50 p-1 ${className}`}
      dangerouslySetInnerHTML={{ __html: mascotSvg }}
      aria-label={alt}
    />
  );
}
