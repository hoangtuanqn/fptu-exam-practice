import { useState } from "react";
import { ClipboardCheck, Play } from "lucide-react";
import { DEFAULT_TIME_LIMIT, resolveTimeLimit, TimeLimitPicker } from "@/features/practice/components/dialogs/TimeLimitPicker";
import { enterFullscreen } from "@/features/practice/hooks/useExamGuard";
import { Button } from "@/shared/ui/Button";
import { Modal, ModalActions, ModalTitle } from "@/shared/ui/Modal";

// Bấm "Thi" ở trang chi tiết đề: chọn thời gian làm bài rồi mới vào thi (0 = không giới hạn)
export function ExamTimeDialog({ onCancel, onStart }: { onCancel: () => void; onStart: (minutes: number) => void }) {
  const [time, setTime] = useState(DEFAULT_TIME_LIMIT);
  const { minutes, valid } = resolveTimeLimit(time);
  return (
    <Modal onClose={onCancel}>
      <ModalTitle icon={ClipboardCheck}>Thi thử</ModalTitle>
      <TimeLimitPicker value={time} onChange={setTime} />
      <ModalActions>
        <Button variant="text" onClick={onCancel}>
          Hủy
        </Button>
        <Button
          variant="filled"
          disabled={!valid}
          onClick={() => {
            enterFullscreen(); // phải gọi ngay trong lần bấm này, trình duyệt mới cho
            onStart(minutes);
          }}
        >
          <Play size={18} /> Bắt đầu thi
        </Button>
      </ModalActions>
    </Modal>
  );
}
