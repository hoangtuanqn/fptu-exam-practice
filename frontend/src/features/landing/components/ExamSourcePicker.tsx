import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MyExams } from "@/features/exam-store/MyExams";
import type { PickFolder } from "@/features/practice/components/FolderInput";
import { LinkImport } from "@/features/exam-import/components/LinkImport";
import type { ImportedExam } from "@/features/exam-import/types";
import { LatestExamsStrip } from "./LatestExamsStrip";
import { PickExamTab } from "./PickExamTab";

interface Props {
  onPick?: PickFolder; // mở thư mục đề từ máy: đang tạm ẩn (DropZone vẫn còn trong mã), nên chưa dùng
  onImported: (exam: ImportedExam) => void;
}

// Hai cách vào đề, xếp dọc theo mức quan trọng: (1) chọn môn rồi mở đề có sẵn, là thứ người dùng thấy đầu tiên và không cần biết FuOverflow là gì;
// (2) thanh dán link FuOverflow ngay bên dưới, cho đề chưa có trong danh sách.
export function ExamSourcePicker({ onImported }: Props) {
  const [params] = useSearchParams();
  const [libraryKey, setLibraryKey] = useState(0); // đổi key để "Đề của tôi" tải lại sau khi nhập đề mới
  const linkSection = useRef<HTMLElement>(null);

  // Vào từ tiện ích hoặc từ liên kết có sẵn link đề (?link=...): đưa thanh dán link vào tầm mắt
  const hasLink = !!(params.get("link") || params.get("url"));
  useEffect(() => {
    if (hasLink) linkSection.current?.scrollIntoView({ block: "center" });
  }, [hasLink]);

  return (
    <div className="mt-7 text-left">
      <section aria-label="Chọn môn và đề">
        <PickExamTab />
      </section>

      <LatestExamsStrip />

      <section ref={linkSection} aria-label="Dán link đề FuOverflow" className="mt-8">
        <LinkImport
          compact
          onImported={(exam) => {
            setLibraryKey((k) => k + 1);
            onImported(exam);
          }}
        />
      </section>

      <MyExams key={libraryKey} onOpen={onImported} />
    </div>
  );
}
