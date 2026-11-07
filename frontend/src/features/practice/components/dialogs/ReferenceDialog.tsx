import { BookOpen, ExternalLink } from "lucide-react";
import type { Question } from "@/features/practice/types.ts";
import { Button } from "@/shared/ui/Button";
import { Modal, ModalActions, ModalTitle } from "@/shared/ui/Modal";

interface Props {
  references: Question[];
  onClose: () => void;
}

// Tài liệu tham khảo của đề (trang công thức...): không phải câu hỏi, không tính điểm, chỉ để tra cứu khi làm bài.
// Mở được ở tab riêng để xem song song với đề.
export function ReferenceDialog({ references, onClose }: Props) {
  return (
    <Modal onClose={onClose} wide>
      <ModalTitle icon={BookOpen}>Tài liệu tham khảo</ModalTitle>
      <p className="mt-2 text-sm text-slate-600">Dùng để tra cứu khi làm bài, không tính điểm.</p>

      <div className="mt-4 max-h-[62vh] space-y-4 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
        {references.map((r) => (
          <figure key={r.number}>
            <img src={r.imageUrl} alt={`Tài liệu tham khảo ${r.number}`} loading="lazy" className="mx-auto h-auto w-full max-w-3xl rounded-lg bg-surface-container-lowest" />
            <figcaption className="mt-1.5 text-center text-xs">
              <a href={r.imageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline">
                Mở ảnh ở tab mới <ExternalLink size={12} />
              </a>
            </figcaption>
          </figure>
        ))}
      </div>

      <ModalActions>
        <Button grow onClick={onClose}>
          Đóng
        </Button>
      </ModalActions>
    </Modal>
  );
}
