import { SubjectBrowser } from "./SubjectBrowser";
import { PageHeader } from "@/shared/ui/Card";
import { Segmented } from "@/shared/ui/Segmented";
import { useUrlState } from "@/shared/hooks/useUrlState";
import { MyExamsTab } from "./MyExamsTab";
import ChapterSetPage from "@/features/chapter-set/ChapterSetPage";

type Tab = "mine" | "subject" | "chapters";

// Kho đề: "Của tôi" (đề đã lấy, lượt làm dở) và "Theo môn" (các đề hệ thống đã có của từng môn)
export default function ExamStorePage() {
  const [url, setUrl] = useUrlState({ tab: "mine", subject: "", term: "", q: "", page: "1" });
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
      <Segmented
        label="Chọn kho đề"
        value={tab}
        options={[
          { value: "mine", label: "Của tôi" },
          { value: "subject", label: "Theo môn" },
          { value: "chapters", label: "Theo chương" },
        ]}
        onChange={(v) => setUrl({ tab: v, subject: "", term: "", q: "", page: "1" })}
      />
      {tab === "mine" ? <MyExamsTab /> : tab === "subject" ? <SubjectBrowser /> : <ChapterSetPage />}
    </div>
  );
}
