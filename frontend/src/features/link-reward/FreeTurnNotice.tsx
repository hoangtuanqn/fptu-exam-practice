import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { useToast } from "@/shared/context/ToastContext";
import { linkRewardApi } from "./link-reward.api";

// Không vẽ gì. Mỗi ngày nhắc một lần khi người dùng vào web: có lượt miễn phí sắp hết hạn (dưới 48 giờ) hoặc vừa hết hạn mà chưa dùng.
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

export function FreeTurnNotice() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const doneFor = useRef<number | null>(null);

  useEffect(() => {
    if (!user || doneFor.current === user.id) return;
    doneFor.current = user.id;
    const key = `fepass.freeturn.notice.${user.id}`;
    try {
      if (localStorage.getItem(key) === today()) return; // hôm nay đã hỏi/nhắc rồi
      localStorage.setItem(key, today());
    } catch {
      /* trình duyệt chặn lưu trữ: vẫn nhắc, tối đa một lần mỗi lần tải trang */
    }
    void linkRewardApi
      .status()
      .then((s) => {
        if (s.expiringSoon > 0 && s.nextExpiresAt) {
          const hours = Math.max(1, Math.round((new Date(s.nextExpiresAt).getTime() - Date.now()) / 3_600_000));
          toast.success(`Bạn có ${s.expiringSoon} lượt giải thích AI miễn phí sắp hết hạn (còn khoảng ${hours} giờ). Dùng ngay kẻo mất.`, {
            duration: 12000,
            action: { label: "Dùng ngay", onClick: () => navigate("/account/exams") },
          });
        } else if (s.expiredRecently > 0) {
          toast.error(`${s.expiredRecently} lượt giải thích AI miễn phí của bạn vừa hết hạn. Vượt link để nhận lượt mới nhé.`, { duration: 10000 });
        }
      })
      .catch(() => undefined);
  }, [user, toast, navigate]);

  return null;
}
