import { useState } from "react";
import { PageHeader } from "@/shared/ui/Card";
import { ContributeForm } from "./ContributeForm";
import { MyContributions } from "./MyContributions";

// Thành viên gửi ảnh đề của một môn (không cần đáp án), admin duyệt rồi mới dùng
export default function ContributePage() {
  const [version, setVersion] = useState(0);
  return (
    <div className="space-y-4">
      <PageHeader title="Đóng góp đề thi" description="Chụp ảnh đề của môn bạn vừa thi và gửi lên. Miễn phí, không cần đáp án, tối đa 100 ảnh mỗi lần." />
      <ContributeForm onSent={() => setVersion((v) => v + 1)} />
      <MyContributions version={version} />
    </div>
  );
}
