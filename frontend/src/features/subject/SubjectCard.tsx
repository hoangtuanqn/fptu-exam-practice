import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { Card, CardHeader } from "@/shared/ui/Card";

interface Props {
  title: string;
  onBack: () => void;
  backLabel?: string;
  children: ReactNode;
}

// Khung của một bước đã chọn môn (danh sách đề, chọn chương, câu hay ra...): tiêu đề + nút quay lại chọn môn khác, giống nhau ở mọi trang.
export function SubjectCard({ title, onBack, backLabel = "Đổi môn", children }: Props) {
  return (
    <Card>
      <CardHeader
        title={title}
        action={
          <Button size="sm" variant="text" onClick={onBack}>
            <ArrowLeft size={15} /> {backLabel}
          </Button>
        }
      />
      {children}
    </Card>
  );
}
