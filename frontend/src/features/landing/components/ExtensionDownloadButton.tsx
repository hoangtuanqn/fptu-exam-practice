import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { downloadExtension } from "../extension.api";

// Nút tải tiện ích: gọi API có đăng nhập rồi lưu file về máy
export function ExtensionDownloadButton({ className, children }: { className: string; children: React.ReactNode }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      className={className}
      onClick={() => {
        setBusy(true);
        downloadExtension()
          .catch((err) => toast.error(errorMessage(err, "Chưa tải được tiện ích, vui lòng thử lại")))
          .finally(() => setBusy(false));
      }}
    >
      {busy ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} {children}
    </button>
  );
}
