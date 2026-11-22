import { useState } from "react";
import { Card, PageHeader } from "@/shared/ui/Card";
import { ExamUploadForm } from "./ExamUploadForm";
import { UploadJobsCard } from "./UploadJobsCard";
import { useUploadJobs } from "./useUploadJobs";

// Tải một đề mới từ thư mục ảnh + ans.json, không gắn với bài trên FuOverflow. Máy chủ nhận đề rồi xử lý nền
export default function ExamUploadPage() {
  const jobs = useUploadJobs();
  const [round, setRound] = useState(0); // đổi key để form trống lại, tải được đề khác ngay

  return (
    <>
      <PageHeader eyebrow="Quản trị" title="Tải đề lên" description="Chọn thư mục đề gồm ảnh từng câu và ans.json, kiểm tra rồi tạo đề." />
      <UploadJobsCard jobs={jobs.jobs} className="mb-4" />
      <Card>
        <div className="p-5">
          <ExamUploadForm
            key={round}
            target={{ mode: "create" }}
            onDone={(job) => {
              jobs.add(job);
              setRound((r) => r + 1);
            }}
          />
        </div>
      </Card>
    </>
  );
}
