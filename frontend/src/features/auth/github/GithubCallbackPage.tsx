import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { GITHUB_RESULT_KEY, type GithubResult } from "./useGithubLogin";

// Trang GitHub gọi lại trong cửa sổ nhỏ: chuyển mã về cửa sổ chính (qua localStorage) rồi tự đóng.
export default function GithubCallbackPage() {
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const result: GithubResult = { code: q.get("code") ?? undefined, state: q.get("state") ?? undefined, error: q.get("error") ?? undefined };
    try {
      localStorage.setItem(GITHUB_RESULT_KEY, JSON.stringify({ ...result, t: Date.now() }));
    } catch {
      /* không ghi được (chặn lưu trữ): cửa sổ chính sẽ tự mở lại nút sau ít phút */
    }
    window.close();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center gap-2 text-sm text-slate-500">
      <Loader2 size={16} className="animate-spin" /> Đang hoàn tất đăng nhập… Bạn có thể đóng cửa sổ này.
    </div>
  );
}
