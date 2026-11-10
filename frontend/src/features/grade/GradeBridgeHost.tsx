import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { useConfirm } from "@/shared/ui/ConfirmDialog";
import { gradeApi } from "./grade.api";
import { gradeBridge, replySetSync, useExtensionStatus, useGradeBridge, useGradeBridgeState } from "./useGradeBridge";

// Không vẽ gì (chỉ có hộp xác nhận khi cần). Chạy ở mọi trang để:
//  1. gửi điểm tiện ích đọc được lên tài khoản ngay khi có bất kỳ tab FePass nào đang mở (không cần mở trang Điểm FAP);
//  2. nhận lệnh bật/tắt đồng bộ từ popup của tiện ích;
//  3. xử lý liên kết ?sync=on|off do popup mở khi chưa có tab FePass nào: luôn hỏi xác nhận ngay trên website.
export function GradeBridgeHost() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const { installed } = useExtensionStatus();
  const { enabled } = useGradeBridgeState();
  const { confirm, confirmDialog } = useConfirm();
  const handledLink = useRef("");

  // Biết công tắc của tài khoản (chỉ hỏi máy chủ khi đã cài tiện ích)
  useEffect(() => {
    if (!user) {
      gradeBridge.set({ enabled: null });
      delete document.documentElement.dataset.fepassGradeSync; // chưa đăng nhập: không công bố gì
      return;
    }
    if (!installed) return;
    let alive = true;
    gradeApi
      .setting()
      .then((s) => alive && gradeBridge.set({ enabled: s.enabled }))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [user, installed]);

  useGradeBridge(user ? enabled : null);

  // Lệnh từ popup của tiện ích (người dùng đã tự bấm trong popup)
  useEffect(() => {
    if (!user) return;
    const onCommand = async (e: Event) => {
      let want = false;
      try {
        want = !!(JSON.parse(String((e as CustomEvent).detail)) as { enabled?: boolean }).enabled;
      } catch {
        return;
      }
      try {
        await gradeApi.setEnabled(want);
        gradeBridge.set({ enabled: want });
        replySetSync({ ok: true, enabled: want });
        toast.success(want ? "Đã bật đồng bộ điểm FAP" : "Đã tắt đồng bộ và xoá điểm đã lưu");
      } catch (err) {
        replySetSync({ ok: false, error: errorMessage(err, "Chưa đổi được cài đặt") });
      }
    };
    document.addEventListener("fepass:set-sync", onCommand);
    return () => document.removeEventListener("fepass:set-sync", onCommand);
  }, [user, toast]);

  // Liên kết ?sync=on|off (popup mở khi không có tab FePass nào): hỏi xác nhận rồi mới đổi
  useEffect(() => {
    if (!user) return;
    const want = new URLSearchParams(search).get("sync");
    if ((want !== "on" && want !== "off") || handledLink.current === `${user.id}:${want}`) return;
    handledLink.current = `${user.id}:${want}`;
    navigate(pathname, { replace: true }); // bỏ ?sync khỏi địa chỉ, tải lại trang không hỏi lại
    void (async () => {
      const on = want === "on";
      const ok = await confirm(
        on
          ? { title: "Bật đồng bộ điểm FAP?", message: "FePass sẽ lưu điểm và lịch thi FAP của bạn (chỉ bạn xem được) để tính điểm cần đạt ở bài thi cuối kỳ. Bạn tắt lúc nào cũng được, khi tắt dữ liệu đã lưu bị xoá.", confirmLabel: "Bật đồng bộ" }
          : { title: "Tắt đồng bộ và xoá điểm đã lưu?", message: "Điểm, lịch thi và các dự đoán điểm đã lưu trên FePass sẽ bị xoá và không khôi phục được. Bạn có thể bật lại bất cứ lúc nào.", confirmLabel: "Tắt và xoá", tone: "danger" },
      );
      if (!ok) return;
      try {
        await gradeApi.setEnabled(on);
        gradeBridge.set({ enabled: on });
        toast.success(on ? "Đã bật đồng bộ điểm FAP" : "Đã tắt đồng bộ và xoá điểm đã lưu");
      } catch (err) {
        toast.error(errorMessage(err, "Chưa đổi được cài đặt"));
      }
    })();
  }, [user, search, pathname, navigate, confirm, toast]);

  return <>{confirmDialog}</>;
}
