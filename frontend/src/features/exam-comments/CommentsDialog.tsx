import { MessageSquare } from "lucide-react";
import { Modal } from "@/shared/ui/Modal";
import { DiscussionPanel } from "./DiscussionPanel";

interface Props {
  examId: string;
  examTitle: string;
  target: number; // -id của tệp đính kèm
  name: string;
  onChanged: () => void;
  onClose: () => void;
}

// Thảo luận của một tệp không xem được trong trình xem ảnh (pdf, zip, video...): cùng khung, không có bình chọn đáp án
export function CommentsDialog({ examId, examTitle, target, name, onChanged, onClose }: Props) {
  return (
    <Modal onClose={onClose} flush maxWidth="max-w-lg">
      <div className="h-[80vh] max-h-[720px] overflow-hidden">
        <DiscussionPanel examId={examId} examTitle={examTitle} question={target} position={name} poll={false} closeAlways onChanged={onChanged} onUnavailable={onClose} onHide={onClose} />
      </div>
    </Modal>
  );
}

// Nút mở thảo luận đặt cạnh thẻ tệp, kèm số bình luận
export function CommentCountButton({ name, count, onOpen, className = "" }: { name: string; count: number; onOpen: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Bình luận về ${name}${count > 0 ? `, ${count} bình luận` : ""}`}
      title="Bình luận"
      className={`md-state md-label-medium inline-flex h-10 min-w-10 shrink-0 items-center justify-center gap-1 rounded-full bg-surface-container-highest px-2.5 text-on-surface shadow-m3-1 ${className}`}
    >
      <MessageSquare size={16} aria-hidden />
      {count > 0 && count}
    </button>
  );
}
