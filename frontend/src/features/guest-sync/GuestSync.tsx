import { useEffect, useRef } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { examLibraryApi } from "@/features/exam-library/exam-library.api";
import { historyApi } from "@/features/history/history.api";
import { useToast } from "@/shared/context/ToastContext";
import { pendingAttempt } from "./pendingAttempt";

// Không hiển thị gì. Ngay khi khách trở thành thành viên: nhận các đề đã lấy về kho tài khoản
// và lưu bài vừa làm (nếu có) vào lịch sử.
export function GuestSync() {
  const { user } = useAuth();
  const toast = useToast();
  const doneFor = useRef<number | null>(null);

  useEffect(() => {
    if (!user || doneFor.current === user.id) return;
    doneFor.current = user.id;

    void (async () => {
      const claimed = (await examLibraryApi.claim().catch(() => null)) ?? { claimed: 0 };
      const pending = pendingAttempt.take();
      let saved = false;
      if (pending) {
        saved = await historyApi.save(pending.examId, pending.payload).then(
          () => true,
          () => false,
        );
      }

      if (saved) toast.success("Đã lưu bài vừa làm vào lịch sử của bạn");
      else if (claimed.claimed > 0) toast.success(`Đã thêm ${claimed.claimed} đề vào kho của bạn`);
    })();
  }, [user, toast]);

  return null;
}
