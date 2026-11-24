import { API_ORIGIN } from "@/shared/api/client";
import { useMascotSvg } from "@/shared/season/useMascotSvg";

interface UserAvatarProps {
  avatarPath?: string | null;
  alt?: string;
  className?: string;
}

export function UserAvatar({ avatarPath, alt = "Avatar", className = "h-8 w-8" }: UserAvatarProps) {
  const mascotSvg = useMascotSvg();
  if (avatarPath) {
    const src = `${API_ORIGIN}/api/v1/files/${avatarPath}`;
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
