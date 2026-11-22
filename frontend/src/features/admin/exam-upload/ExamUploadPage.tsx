import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button, buttonClass } from "@/shared/ui/Button";
import { Card, PageHeader } from "@/shared/ui/Card";
import { ExamUploadForm, type UploadResult } from "./ExamUploadForm";

// Tải một đề mới từ thư mục ảnh + ans.json, không gắn với bài trên FuOverflow
export default function ExamUploadPage() {
  const [done, setDone] = useState<UploadResult | null>(null);
  const [round, setRound] = useState(0); // đổi key để form trống lại khi tải đề khác

  return (
    <>
      <PageHeader eyebrow="Quản trị" title="Tải đề lên" description="Chọn thư mục đề gồm ảnh từng câu và ans.json, kiểm tra rồi tạo đề." />
      <Card>
        {done ? (
          <div className="flex flex-col items-center gap-3 px-5 py-8 text-center">
            <CheckCircle2 size={40} className="text-primary" aria-hidden />
            <h2 className="md-title-large text-on-surface">
              Đã tạo đề: {done.questions} câu, {done.answered} câu có đáp án
            </h2>
            <div className="flex flex-wrap justify-center gap-2">
              <Link to={`/admin/exams/${done.id}`} className={buttonClass({ variant: "primary" })}>
                Xem đề
              </Link>
              <Button
                onClick={() => {
                  setDone(null);
                  setRound((r) => r + 1);
                }}
              >
                Tải đề khác
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-5">
            <ExamUploadForm key={round} target={{ mode: "create" }} onDone={setDone} />
          </div>
        )}
      </Card>
    </>
  );
}
