import type { ReactNode } from "react";
import { CircleHelp } from "lucide-react";
import type { Mode } from "@/features/practice/types.ts";
import { getModeConfig } from "@/features/practice/config/modes";
import { Button } from "@/shared/ui/Button";
import { Kbd } from "@/shared/ui/Kbd";
import { Modal, ModalActions, ModalTitle } from "@/shared/ui/Modal";

const Keys = ({ list }: { list: string[] }) => (
  <span className="inline-flex flex-wrap items-center gap-1">
    {list.map((k) => (
      <Kbd key={k}>{k}</Kbd>
    ))}
  </span>
);

// Bảng hướng dẫn làm bài (nút "?" trên đầu trang): cách chọn đáp án, chuyển câu, phím tắt. Nội dung theo chế độ đang làm.
export function HelpDialog({ mode, onClose }: { mode: Mode; onClose: () => void }) {
  const { label, desc } = getModeConfig(mode);
  const enter = mode === "exam" ? "Sang câu tiếp; ở câu cuối là Nộp bài." : "Xác nhận đáp án, bấm lần nữa để sang câu tiếp; ở câu cuối là Nộp bài.";

  const rows: { keys: ReactNode; title: string; text: string }[] = [
    { keys: <Keys list={["A–H", "1–8"]} />, title: "Chọn đáp án", text: "Bấm nút đáp án, hoặc gõ phím chữ A–H, hoặc phím số 1–8 (1 = A, 2 = B, 3 = C…)." },
    { keys: <Keys list={["←", "→"]} />, title: "Chuyển câu", text: "Nút Trước / Tiếp nằm ngay dưới các đáp án (điện thoại: ở thanh dưới cùng), hoặc dùng phím mũi tên." },
    { keys: <Keys list={["Enter"]} />, title: "Đi tiếp nhanh", text: enter },
    { keys: <Keys list={["M"]} />, title: "Đánh dấu câu", text: "Đánh dấu câu muốn xem lại sau." },
    { keys: <span className="md-label-medium text-on-surface-variant">Câu 5/40</span>, title: "Danh sách câu", text: "Bấm nút “Câu …” bên trái (điện thoại: phía trên đề) để nhảy tới câu bất kỳ và xem câu nào đã làm." },
    { keys: <span className="md-label-medium text-on-surface-variant">Ảnh đề</span>, title: "Phóng to đề", text: "Bấm vào ảnh đề để mở cửa sổ phóng to; ở đó vẫn chọn đáp án và chuyển câu được." },
  ];

  return (
    <Modal onClose={onClose}>
      <ModalTitle icon={CircleHelp}>Hướng dẫn làm bài</ModalTitle>
      <p className="md-body-medium mt-3 rounded-m3-md bg-secondary-container/50 px-3 py-2 text-on-surface">
        <b>{label}:</b> {desc}
      </p>
      <dl className="mt-4 space-y-3">
        {rows.map((r) => (
          <div key={r.title} className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-start gap-x-3 gap-y-0.5">
            <dt className="pt-0.5">{r.keys}</dt>
            <dd>
              <span className="md-label-large text-on-surface">{r.title}. </span>
              <span className="md-body-medium text-on-surface-variant">{r.text}</span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="md-body-small mt-4 text-on-surface-variant">Phím tắt tạm tắt khi bạn đang gõ vào ô nhập hoặc đang mở hộp thoại.</p>
      <ModalActions>
        <Button autoFocus grow variant="primary" onClick={onClose}>
          Đã hiểu
        </Button>
      </ModalActions>
    </Modal>
  );
}
