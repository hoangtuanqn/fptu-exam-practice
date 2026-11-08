import { SubjectBrowser } from "@/features/catalog/SubjectBrowser";
import { PageHeader } from "@/shared/ui/Card";
import { Segmented } from "@/shared/ui/Segmented";
import { useUrlState } from "@/shared/hooks/useUrlState";
import LibraryPage from "./LibraryPage";

type Tab = "mine" | "subject";

// Kho đề: "Của tôi" (đề đã lấy, lượt làm dở) và "Theo môn" (toàn bộ đề FE của từng môn trên FuOverflow, lấy khi cần)
export default function ExamStorePage() {
  const [url, setUrl] = useUrlState({ tab: "mine", subject: "", term: "", q: "", page: "1" });
  const tab: Tab = url.tab === "subject" ? "subject" : "mine";

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Luyện đề"
        title="Kho đề"
        description={tab === "mine" ? "Các đề bạn đã lấy. Bấm vào một đề để làm, lượt đang dở được lưu để làm tiếp." : "Toàn bộ đề FE của từng môn. Chỉ khi bạn bấm lấy và đồng ý, hệ thống mới tải ảnh đề và trừ phí."}
      />
      <Segmented
        label="Chọn kho đề"
        value={tab}
        options={[
          { value: "mine", label: "Của tôi" },
          { value: "subject", label: "Theo môn" },
        ]}
        onChange={(v) => setUrl({ tab: v, subject: "", term: "", q: "", page: "1" })}
      />
      {tab === "mine" ? <LibraryPage embedded /> : <SubjectBrowser />}
    </div>
  );
}
