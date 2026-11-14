import { useState } from "react";
import { Eye } from "lucide-react";
import { useApi } from "@/shared/hooks/useApi";
import { Button } from "@/shared/ui/Button";
import { Modal, ModalActions, ModalTitle } from "@/shared/ui/Modal";
import { QueryBoundary } from "@/shared/ui/QueryBoundary";
import { Segmented } from "@/shared/ui/Segmented";
import { marketingAdminApi, type Campaign } from "./marketing.api";

// Xem thư mẫu dựng bằng dữ liệu mẫu. iframe sandbox rỗng: không chạy script, không điều hướng trang admin.
export function PreviewDialog({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  const steps = campaign.steps.length > 0 ? campaign.steps.map((s) => s.step) : [1];
  const [step, setStep] = useState(steps[0]!);
  const preview = useApi(() => marketingAdminApi.preview(campaign.key, step), [campaign.key, step]);

  return (
    <Modal wide onClose={onClose}>
      <ModalTitle icon={Eye}>Xem thư "{campaign.label}"</ModalTitle>
      {steps.length > 1 && (
        <div className="mt-4">
          <Segmented label="Chọn thư" value={String(step)} options={steps.map((s) => ({ value: String(s), label: `Thư ${s}` }))} onChange={(v) => setStep(Number(v))} />
        </div>
      )}
      <div className="mt-4">
        <QueryBoundary query={preview} loadingLabel="Đang dựng thư…">
          {(p) => (
            <>
              <p className="md-body-medium text-on-surface-variant">
                Tiêu đề: <b className="text-on-surface">{p.subject}</b>
              </p>
              {/* nền trắng như trình đọc thư, không theo giao diện tối của trang */}
              <iframe title={`Thư ${step}: ${p.subject}`} sandbox="" srcDoc={p.html} className="mt-3 h-[60vh] w-full rounded-m3-md border border-outline-variant bg-white" />
            </>
          )}
        </QueryBoundary>
      </div>
      <ModalActions>
        <Button variant="text" onClick={onClose}>
          Đóng
        </Button>
      </ModalActions>
    </Modal>
  );
}
