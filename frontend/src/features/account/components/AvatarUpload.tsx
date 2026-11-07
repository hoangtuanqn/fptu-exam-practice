import { useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { userApi } from "@/features/account/api/user.api";
import { useAuth } from "@/features/auth/AuthContext";
import { useToast } from "@/shared/context/ToastContext";
import { API_ORIGIN } from "@/shared/api/client";
import { errorMessage } from "@/shared/api/errors";
import { MASCOT_SVG } from "@/shared/ui/mascot-art";

// Giới hạn phía client (server cũng kiểm tra lại)
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

// Chuyển avatarPath → URL đầy đủ để hiển thị
function avatarSrc(avatarPath: string | null | undefined): string | null {
  if (!avatarPath) return null;
  return `${API_ORIGIN}/api/v1/files/${avatarPath}`;
}

export function AvatarUpload() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const src = avatarSrc(user?.avatarPath);

  const handleFile = async (file: File) => {
    if (!ALLOWED.includes(file.type)) {
      toast.error("Chỉ chấp nhận ảnh JPG, PNG hoặc WebP");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Ảnh tối đa 5 MB");
      return;
    }
    setUploading(true);
    try {
      const updated = await userApi.uploadAvatar(file);
      setUser(updated);
      toast.success("Đã cập nhật ảnh đại diện");
    } catch {
      toast.error("Không tải lên được ảnh");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  // Xoá có hoàn tác: ảnh biến mất ngay, chỉ xoá thật ở máy chủ khi hết thời gian hoàn tác (bấm "Hoàn tác" thì không gọi máy chủ)
  const handleRemove = () => {
    const current = user!;
    const previous = current.avatarPath;
    setUser({ ...current, avatarPath: null });
    toast.success("Đã xoá ảnh đại diện", {
      duration: 7000,
      action: { label: "Hoàn tác", onClick: () => setUser({ ...current, avatarPath: previous }) },
      onExpire: () => {
        userApi.removeAvatar().catch((err) => {
          setUser({ ...current, avatarPath: previous }); // xoá thật thất bại: trả ảnh lại, đừng để người dùng tưởng đã xoá
          toast.error(errorMessage(err, "Chưa xoá được ảnh đại diện"));
        });
      },
    });
  };

  const busy = uploading;

  return (
    <div className="flex items-center gap-4">
      {/* Avatar tròn */}
      <div className="relative">
        <button
          type="button"
          onClick={() => !busy && inputRef.current?.click()}
          disabled={busy}
          className="group relative h-20 w-20 overflow-hidden rounded-full border-2 border-slate-200 bg-brand-50 transition hover:border-brand-400 disabled:opacity-60"
          title="Đổi ảnh đại diện"
        >
          {src ? (
            <img src={src} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            <span
              className="flex h-full w-full items-center justify-center"
              dangerouslySetInnerHTML={{ __html: MASCOT_SVG }}
              style={{ padding: "6px" }}
            />
          )}

          {/* Overlay hover */}
          {!busy && (
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition group-hover:opacity-100">
              <Camera size={20} className="text-white" />
            </span>
          )}

          {/* Loading spinner */}
          {uploading && (
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
              <Loader2 size={20} className="animate-spin text-white" />
            </span>
          )}
        </button>

        {/* Nút xoá (chỉ hiện khi có avatar tuỳ chỉnh) */}
        {src && !busy && (
          <button
            type="button"
            onClick={handleRemove}
            title="Xoá ảnh đại diện"
            aria-label="Xoá ảnh đại diện"
            className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white shadow transition hover:bg-rose-600"
          >
            <X size={11} />
          </button>
        )}

      </div>

      {/* Text hướng dẫn */}
      <div>
        <p className="text-sm font-medium text-slate-700">Ảnh đại diện</p>
        <p className="mt-0.5 text-xs text-slate-400">JPG, PNG hoặc WebP · tối đa 5 MB</p>
        <button
          type="button"
          onClick={() => !busy && inputRef.current?.click()}
          disabled={busy}
          className="mt-1.5 text-xs font-medium text-brand-700 hover:underline disabled:opacity-50"
        >
          Thay đổi ảnh
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
    </div>
  );
}
