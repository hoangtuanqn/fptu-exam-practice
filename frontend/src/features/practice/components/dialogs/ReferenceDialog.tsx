import { BookOpen, ExternalLink } from "lucide-react";
import { AttachmentList } from "@/features/exam-attachments/AttachmentList";
import type { ExamAttachment } from "@/features/exam-import/types";
import type { Question } from "@/features/practice/types.ts";
import { Button } from "@/shared/ui/Button";
import { Modal, ModalActions, ModalTitle } from "@/shared/ui/Modal";

interface Props {
  references: Question[];
  attachments: ExamAttachment[]; // tệp đính kèm của đề (pdf, zip...)
  guarded?: boolean; // đang thi toàn màn hình: mở tab mới bị tính là rời bài
  onClose: () => void;
}

// Tài liệu tham khảo của đề (trang công thức...): không phải câu hỏi, không tính điểm, chỉ để tra cứu khi làm bài.
// Mở được ở tab riêng để xem song song với đề.
export function ReferenceDialog({ references, attachments, guarded, onClose }: Props) {
  return (
    <Modal onClose={onClose} wide>
      <ModalTitle icon={BookOpen}>Tài liệu tham khảo</ModalTitle>
      <p className="mt-2 text-sm text-slate-600">Dùng để tra cứu khi làm bài, không tính điểm.</p>

      {attachments.length > 0 && (
        <section className="mt-4">
          <h3 className="md-title-small mb-2 text-on-surface">Tệp đính kèm của đề</h3>
          {guarded && <p className="mb-2 text-xs text-on-surface-variant">Mở tệp trong tab mới có thể bị tính là rời bài thi. Hãy dùng Tải về.</p>}
          <AttachmentList attachments={attachments} />
        </section>
      )}

      {references.length > 0 && (
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
      )}

      <ModalActions>
        <Button grow onClick={onClose}>
          Đóng
        </Button>
      </ModalActions>
    </Modal>
  );
}
