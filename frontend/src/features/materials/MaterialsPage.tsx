import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Construction, Crown } from "lucide-react";
import { useApi } from "@/shared/hooks/useApi";
import { buttonClass } from "@/shared/ui/Button";
import { Card, PageHeader } from "@/shared/ui/Card";
import { QueryBoundary } from "@/shared/ui/QueryBoundary";
import { MaterialList } from "./MaterialList";
import { UploadCard } from "./UploadCard";
import { materialsApi } from "./materials.api";
import { useMaterialList } from "./useMaterialList";

// Phân tích slide (Pro): tải PDF slide của một môn, AI tóm tắt theo chương, kèm số đề có chương đó
export default function MaterialsPage() {
  const quota = useApi(() => materialsApi.quota(), []);
  const list = useMaterialList();

  // Một file vừa phân tích xong thì hạn mức đã đổi: tải lại thanh hạn mức
  const reloadQuota = quota.reload;
  const wasActive = useRef(false);
  useEffect(() => {
    if (wasActive.current && !list.active) reloadQuota();
    wasActive.current = list.active;
  }, [list.active, reloadQuota]);

  const isPro = quota.data?.isPro;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Học tập" title="Phân tích slide" description="Tải slide môn học lên, AI tóm tắt từng chương và cho biết chương đó xuất hiện trong bao nhiêu đề." />
      <QueryBoundary query={quota} loadingLabel="Đang tải…">
        {(q) => (q.isPro ? <UploadCard quota={q} onUploaded={list.reload} /> : q.access === "COMING_SOON" ? <ComingSoon /> : <ProUpsell />)}
      </QueryBoundary>
      {/* Chưa có Pro: chỉ hiện danh sách khi còn kết quả cũ (lúc trước từng dùng Pro) */}
      {isPro === true && (
        <QueryBoundary query={list.query} loadingLabel="Đang tải danh sách…">
          {(items) => <MaterialList items={items} onChanged={list.reload} />}
        </QueryBoundary>
      )}
      {isPro === false && list.items.length > 0 && <MaterialList items={list.items} onChanged={list.reload} />}
    </div>
  );
}

function ComingSoon() {
  return (
    <Card>
      <div className="flex items-center gap-3 px-5 py-4">
        <Construction size={22} className="shrink-0 text-on-surface-variant" />
        <p className="md-title-medium text-on-surface">Chức năng đang trong quá trình hoàn thiện</p>
      </div>
    </Card>
  );
}

function ProUpsell() {
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="min-w-0 space-y-1">
          <p className="md-title-medium text-on-surface">Tính năng chỉ dành cho PRO</p>
        </div>
        <Link to="/pro" className={buttonClass({ variant: "primary" })}>
          <Crown size={16} className="text-[#f0a800]" /> Xem gói Pro
        </Link>
      </div>
    </Card>
  );
}
