import { MyExams } from "@/features/exam-store/MyExams";
import type { PickFolder } from "@/features/practice/components/FolderInput";
import type { ImportedExam } from "@/features/exam-import/types";
import { LatestExamsStrip } from "./LatestExamsStrip";
import { PickExamTab } from "./PickExamTab";

interface Props {
  onPick?: PickFolder; // mở thư mục đề từ máy: đang tạm ẩn (DropZone vẫn còn trong mã), nên chưa dùng
  onImported: (exam: ImportedExam) => void;
}

// Vào đề trên trang chủ: chọn môn rồi mở đề có sẵn, là thứ người dùng thấy đầu tiên; bên dưới là đề mới và đề của tôi.
export function ExamSourcePicker({ onImported }: Props) {
  return (
    <div className="mt-7 text-left">
      <section aria-label="Chọn môn và đề">
        <PickExamTab />
      </section>

      <LatestExamsStrip />

      <MyExams onOpen={onImported} />
    </div>
  );
}
