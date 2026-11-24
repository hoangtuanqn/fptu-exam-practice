import { SubjectBrowser } from "./SubjectBrowser";
import { PageHeader } from "@/shared/ui/Card";
import { useUrlState } from "@/shared/hooks/useUrlState";
import { MyExamsTab } from "./MyExamsTab";
import ChapterSetPage from "@/features/chapter-set/ChapterSetPage";

type Tab = "mine" | "subject" | "chapters";

// Kho đề trong tài khoản: đề đã lấy và lượt làm dở. Duyệt theo môn nằm ở /kho-de; tab=subject và tab=chapters chỉ còn là đích của liên kết cũ, không có nút chuyển
export default function ExamStorePage() {
  const [url] = useUrlState({ tab: "mine", subject: "", term: "", q: "", page: "1" });
  const tab: Tab = url.tab === "subject" || url.tab === "chapters" ? url.tab : "mine";

  return (
    <div className="space-y-5">
      {tab !== "chapters" && (
      <PageHeader
        eyebrow="Luyện đề"
        title="Kho đề"
        description={tab === "mine" ? "Các đề bạn đã lấy. Bấm vào một đề để làm, lượt đang dở được lưu để làm tiếp." : "Các đề đã có của từng môn. Đề có phí chỉ trừ credit khi bạn bấm mở và đồng ý."}
      />
      )}
      {tab === "mine" ? <MyExamsTab /> : tab === "subject" ? <SubjectBrowser /> : <ChapterSetPage />}
    </div>
  );
}
