import { useEffect, useRef } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { examLibraryApi } from "@/features/exam-library/exam-library.api";
import { notifyLibraryChanged } from "@/features/exam-library/libraryEvents";
import { historyApi } from "@/features/history/history.api";
import { resubscribeRooms } from "@/shared/realtime/socket";
import { useToast } from "@/shared/context/ToastContext";
import { pendingAttempt } from "./pendingAttempt";

const RETRY_MS = 3000;
const MAX_TRIES = 3;

// Không hiển thị gì. Ngay khi khách trở thành thành viên: nhận các đề đã lấy về kho tài khoản
// (kể cả lượt lấy đề đang chạy dở) và lưu bài vừa làm (nếu có) vào lịch sử.
export function GuestSync() {
  const { user } = useAuth();
  const toast = useToast();
  const doneFor = useRef<number | null>(null);

  useEffect(() => {
    if (!user || doneFor.current === user.id) return;
    doneFor.current = user.id;

    void (async () => {
      // Lỗi mạng thì thử lại vài lần, để đề của khách không bị bỏ sót
      let claimed: { claimed: number; jobs: number } | null = null;
      for (let i = 0; i < MAX_TRIES && !claimed; i++) {
        if (i > 0) await new Promise((r) => setTimeout(r, RETRY_MS));
        claimed = await examLibraryApi.claim().catch(() => null);
      }
      if (!claimed) doneFor.current = null; // lần đăng nhập/tải trang sau sẽ thử lại
      else {
        resubscribeRooms(); // job đang chạy giờ thuộc tài khoản: theo dõi lại bằng quyền mới
        notifyLibraryChanged();
      }

      const pending = pendingAttempt.take();
      let saved = false;
      if (pending) {
        saved = await historyApi.save(pending.examId, pending.payload).then(
          () => true,
          () => false,
        );
      }

      if (saved) toast.success("Đã lưu bài vừa làm vào lịch sử của bạn");
      else if (claimed && claimed.claimed > 0) toast.success(`Đã thêm ${claimed.claimed} đề vào kho của bạn`);
    })();
  }, [user, toast]);

  return null;
}
