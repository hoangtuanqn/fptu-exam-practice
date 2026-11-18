import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import type { ExamAttachment } from "@/features/exam-import/types";
import { buttonClass } from "@/shared/ui/Button";
import { AttachmentList } from "./AttachmentList";

// Đề chỉ có tệp (pdf, zip...): không có câu để làm trên web, nên chỉ cho mở/tải tệp
export function FilesOnlyExam({ title, attachments }: { title: string; attachments: ExamAttachment[] }) {
  return (
    <main className="flex-1 overflow-y-auto bg-surface">
      <div className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6">
        <h1 className="md-headline-small break-words text-on-surface">{title}</h1>
        <p className="md-body-medium mt-2 text-on-surface-variant">Đề này chỉ có tệp đính kèm, không có câu hỏi để làm trên web. Mở hoặc tải tệp bên dưới.</p>
        <div className="mt-5">
          <AttachmentList attachments={attachments} />
        </div>
        <Link to="/" className={buttonClass({ variant: "text", className: "mt-5" })}>
          <ArrowLeft size={16} /> Về trang chủ
        </Link>
      </div>
    </main>
  );
}
