import { useAuth } from "@/features/auth/AuthContext";
import { MyExams } from "@/features/exam-store/MyExams";
import { ResumeList } from "@/features/practice-session/ResumeList";
import type { PickFolder } from "@/features/practice/components/FolderInput";
import type { ImportedExam } from "@/features/exam/types";
import { LatestExamsStrip, PICK_SECTION_ID } from "./LatestExamsStrip";
import { PickExamTab } from "./PickExamTab";

interface Props {
  onPick?: PickFolder; // mở thư mục đề từ máy: đang tạm ẩn (DropZone vẫn còn trong mã), nên chưa dùng
  onImported: (exam: ImportedExam) => void;
  picked?: boolean; // đã chọn môn: danh sách đề lên đầu, không chen gì phía trên
}

// Vào đề trên trang chủ: chọn môn rồi mở đề có sẵn, là thứ người dùng thấy đầu tiên; bên dưới là đề mới và đề của tôi.
// Thành viên đang làm dở một đề thì thấy "làm tiếp" ngay trên ô chọn môn.
export function ExamSourcePicker({ onImported, picked }: Props) {
  const { user } = useAuth();
  return (
    <div className={`text-left ${picked ? "" : "mt-4 sm:mt-7"}`}>
      {user && !picked && <ResumeList limit={3} className="mb-5" />}
      <section id={PICK_SECTION_ID} aria-label="Chọn môn và đề" className="scroll-mt-4">
        <PickExamTab />
      </section>

      <LatestExamsStrip />

      <MyExams onOpen={onImported} />
    </div>
  );
}
