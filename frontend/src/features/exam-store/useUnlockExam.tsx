import { useState, type ReactNode } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { examApi } from "@/features/exam/exam.api";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { ConfirmOpenDialog } from "./ConfirmOpenDialog";

// Mở khoá cả đề: hỏi phí thật, có phí thì xác nhận trước khi trừ credit (Pro / miễn phí mở luôn), xong gọi onUnlocked
export function useUnlockExam(examId: string, onUnlocked: () => void): { start: () => void; busy: boolean; dialog: ReactNode } {
  const toast = useToast();
  const { user, refresh } = useAuth();
  const [busy, setBusy] = useState(false);
  const [fee, setFee] = useState<number | null>(null);

  async function open() {
    setBusy(true);
    try {
      await examApi.unlock(examId);
      void refresh(); // số dư vừa đổi
      onUnlocked();
    } catch (err) {
      toast.error(errorMessage(err, "Chưa mở được đề này"));
      setBusy(false);
    }
  }

  async function start() {
    setBusy(true);
    try {
      const quote = await examApi.quote(examId);
      if (quote.free) return void (await open());
      setFee(quote.fee);
      setBusy(false);
    } catch (err) {
      toast.error(errorMessage(err, "Chưa mở được đề này"));
      setBusy(false);
    }
  }

  const dialog =
    fee !== null && user ? (
      <ConfirmOpenDialog
        fee={fee}
        balance={user.balance}
        onCancel={() => setFee(null)}
        onConfirm={() => {
          setFee(null);
          void open();
        }}
      />
    ) : null;
  return { start: () => void start(), busy, dialog };
}
