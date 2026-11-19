import { CircleHelp } from "lucide-react";
import type { Mode } from "@/features/practice/types.ts";
import { Button } from "@/shared/ui/Button";
import { Kbd } from "@/shared/ui/Kbd";
import { Modal, ModalActions, ModalTitle } from "@/shared/ui/Modal";

// Bảng hướng dẫn làm bài (nút "Hướng dẫn" trên đầu trang): ngắn, mỗi việc một dòng
export function HelpDialog({ mode, onClose }: { mode: Mode; onClose: () => void }) {
  const rows: { keys: string[]; text: string }[] = [
    { keys: ["A–H", "1–8"], text: "Chọn đáp án (1 = A, 2 = B…)" },
    { keys: ["←", "→"], text: "Câu trước / câu tiếp" },
    { keys: ["Enter"], text: mode === "exam" ? "Câu tiếp; câu cuối là nộp bài" : "Xác nhận, rồi câu tiếp; câu cuối là nộp bài" },
    { keys: ["M"], text: "Đánh dấu câu để xem lại" },
    { keys: ["N"], text: "Nhảy tới câu chưa làm" },
  ];

  return (
    <Modal onClose={onClose}>
      <ModalTitle icon={CircleHelp}>Hướng dẫn</ModalTitle>
      <dl className="mt-4 space-y-2.5">
        {rows.map((r) => (
          <div key={r.text} className="flex items-center gap-3">
            <dt className="flex w-24 shrink-0 flex-wrap gap-1">
              {r.keys.map((k) => (
                <Kbd key={k}>{k}</Kbd>
              ))}
            </dt>
            <dd className="md-body-medium text-on-surface">{r.text}</dd>
          </div>
        ))}
      </dl>
      <p className="md-body-small mt-4 text-on-surface-variant">Bấm “Câu …” để nhảy tới câu bất kỳ. Bấm ảnh đề để phóng to.</p>
      <ModalActions>
        <Button autoFocus grow variant="primary" onClick={onClose}>
          Đã hiểu
        </Button>
      </ModalActions>
    </Modal>
  );
}
