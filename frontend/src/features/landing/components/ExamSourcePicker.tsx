import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MyExams } from "@/features/exam-store/MyExams";
import type { PickFolder } from "@/features/practice/components/FolderInput";
import { LinkImport } from "@/features/exam-import/components/LinkImport";
import type { ImportedExam } from "@/features/exam-import/types";
import { PickExamTab } from "./PickExamTab";

interface Props {
  onPick?: PickFolder; // mở thư mục đề từ máy: đang tạm ẩn (DropZone vẫn còn trong mã), nên chưa dùng
  onImported: (exam: ImportedExam) => void;
}

// Hai cách vào đề, xếp dọc theo mức quan trọng: (1) chọn môn rồi mở đề có sẵn, là thứ người dùng thấy đầu tiên và không cần biết FuOverflow là gì;
// (2) dán link FuOverflow cho đề chưa có trong danh sách, ngay bên dưới, có giải thích FuOverflow là gì.
export function ExamSourcePicker({ onImported }: Props) {
  const [params] = useSearchParams();
  const [libraryKey, setLibraryKey] = useState(0); // đổi key để "Đề của tôi" tải lại sau khi nhập đề mới
  const linkSection = useRef<HTMLElement>(null);

  // Vào từ tiện ích hoặc từ liên kết có sẵn link đề (?link=...): đưa khối dán link vào tầm mắt
  const hasLink = !!(params.get("link") || params.get("url"));
  useEffect(() => {
    if (hasLink) linkSection.current?.scrollIntoView({ block: "center" });
  }, [hasLink]);

  return (
    <div className="mt-8 text-left">
      <section aria-labelledby="home-pick-title">
        <div className="mb-3 text-center">
          <h2 id="home-pick-title" className="md-headline-small text-on-surface">
            Bộ đề thi FE theo môn
          </h2>
          <p className="md-body-medium mt-1 text-on-surface-variant">Chọn môn, bấm Mở đề là làm ngay. Có đáp án, giải thích từng câu và chấm điểm thang 10.</p>
        </div>
        <div className="relative rounded-m3-xl border border-outline-variant/70 bg-gradient-to-b from-surface-container-lowest to-surface-container-low p-3 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_24px_50px_-24px_rgba(70,45,0,0.35)] sm:p-4">
          <span aria-hidden className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#ffc61f]/70 to-transparent" />
          <PickExamTab />
        </div>
      </section>

      <section ref={linkSection} aria-labelledby="home-link-title" className="mt-8">
        <div className="mb-3 text-center">
          <h2 id="home-link-title" className="md-title-large text-on-surface">
            Không thấy đề bạn cần?
          </h2>
          <p className="md-body-medium mt-1 text-on-surface-variant">
            FuOverflow là nơi sinh viên FPTU đăng đề thi FE. Dán link đề từ đó vào đây, hệ thống tự lấy và lưu lại cho bạn.
          </p>
        </div>
        <LinkImport
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
