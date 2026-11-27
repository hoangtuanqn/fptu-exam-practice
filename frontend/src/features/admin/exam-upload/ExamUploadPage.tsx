import { useState } from "react";
import { Card, PageHeader } from "@/shared/ui/Card";
import { ExamUploadForm } from "./ExamUploadForm";
import { UploadJobsHistory, UploadJobsSummary } from "./UploadJobsCard";
import { useUploadJobs } from "./useUploadJobs";

// Tải một đề mới từ thư mục ảnh + ans.json. Máy chủ nhận đề rồi xử lý nền
export default function ExamUploadPage() {
  const jobs = useUploadJobs();
  const [round, setRound] = useState(0); // đổi key để form trống lại, tải được đề khác ngay

  return (
    <>
      <PageHeader eyebrow="Quản trị" title="Tải đề lên" description="Chọn thư mục đề gồm ảnh từng câu và ans.json, kiểm tra rồi tạo đề." />
      <UploadJobsSummary jobs={jobs.jobs} className="mb-4" />
      <Card>
        <div className="p-5">
          <ExamUploadForm
            key={round}
            onQueued={jobs.add}
            target={{ mode: "create" }}
            onDone={(job) => {
              jobs.add(job);
              setRound((r) => r + 1);
            }}
          />
        </div>
      </Card>
      <UploadJobsHistory jobs={jobs.jobs} onDismiss={jobs.dismiss} className="mt-4" />
    </>
  );
}
