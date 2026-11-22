import { useState } from "react";
import { Check, ImageUp, Loader2, X } from "lucide-react";
import { openImageHandler } from "@/shared/api/protectedImage";
import { useToast } from "@/shared/context/ToastContext";
import { useSubmit } from "@/shared/hooks/useSubmit";
import { Button } from "@/shared/ui/Button";
import { useConfirm } from "@/shared/ui/ConfirmDialog";
import { FormError } from "@/shared/ui/Feedback";
import { Field, inputClass } from "@/shared/ui/Input";
import { Modal, ModalActions, ModalTitle } from "@/shared/ui/Modal";
import { ProtectedImg } from "@/shared/ui/ProtectedImg";
import { formatDateTime } from "@/shared/utils/formatters";
import { ContributionStatusBadge } from "./ContributionStatusBadge";
import { contributionApi, type AdminContribution } from "./exam-contribution.api";

interface Props {
  item: AdminContribution;
  onClose: () => void;
  onDone: () => void; // báo danh sách tải lại
}

// Xem ảnh một đề đóng góp (tải dần khi cuộn tới) rồi duyệt hoặc từ chối. Đề bị từ chối đã bị xoá ảnh nên không hiện ảnh.
export function ContributionReviewDialog({ item, onClose, onDone }: Props) {
  const toast = useToast();
  const { run, loading, error } = useSubmit();
  const { confirm, confirmDialog } = useConfirm();
  const [note, setNote] = useState("");
  const pending = item.status === "PENDING";
  const count = Math.max(0, Math.floor(Number(item.imageCount) || 0));

  const review = async (action: "approve" | "reject") => {
    const ok = await confirm(
      action === "approve"
        ? { title: "Duyệt đề này?", message: `${count} ảnh đề ${item.subjectCode} sẽ được giữ lại để dùng.`, confirmLabel: "Duyệt" }
        : { title: "Từ chối đề này?", message: "Ảnh của đề sẽ bị xoá và không khôi phục được.", confirmLabel: "Từ chối", tone: "danger" },
    );
    if (!ok) return;
    void run(async () => {
      const body = note.trim() || undefined;
      try {
        if (action === "approve") await contributionApi.approve(item.id, body);
        else await contributionApi.reject(item.id, body);
      } catch (err) {
        onDone(); // có thể admin khác vừa duyệt (409): tải lại danh sách cho đúng trạng thái
        throw err;
      }
      toast.success(action === "approve" ? "Đã duyệt đóng góp" : "Đã từ chối đóng góp");
      onDone();
      onClose();
    });
  };

  return (
    <Modal onClose={onClose} wide>
      {confirmDialog}
      <ModalTitle icon={ImageUp}>
        {item.subjectCode}
        {item.title ? ` · ${item.title}` : ""}
      </ModalTitle>
      <div className="md-body-small mt-2 flex flex-wrap items-center gap-2 text-on-surface-variant">
        <ContributionStatusBadge value={item.status} />
        <span>
          {item.user ? `${item.user.fullName} (${item.user.email})` : "Không rõ người gửi"} · {formatDateTime(item.createdAt)}
          {item.term ? ` · ${item.term}` : ""} · {count} ảnh
        </span>
      </div>
      {item.note && <p className="md-body-medium mt-3 whitespace-pre-wrap rounded-m3-sm bg-surface-container p-3 text-on-surface">{item.note}</p>}

      {item.status === "REJECTED" ? (
        <p className="md-body-medium mt-4 text-on-surface-variant">Đề đã bị từ chối nên ảnh đã được xoá.</p>
      ) : (
        <ol className="mt-4 space-y-3">
          {Array.from({ length: count }, (_, i) => {
            const src = contributionApi.imageUrl(item.id, i + 1);
            return (
              <li key={i}>
                <a href="#" onClick={openImageHandler(src)} className="block overflow-hidden rounded-m3-sm border border-outline-variant bg-surface-container-low">
                  <ProtectedImg src={src} loading="lazy" alt={`Ảnh ${i + 1}/${count}`} className="w-full object-contain" />
                </a>
                <div className="md-body-small mt-1 text-on-surface-variant">
                  Ảnh {i + 1}/{count}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {pending ? (
        <div className="mt-4 space-y-3">
          <FormError message={error} />
          <Field label="Ghi chú cho người gửi (tuỳ chọn)">
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} className={inputClass()} />
          </Field>
          <ModalActions>
            <Button onClick={() => review("reject")} disabled={loading}>
              <X size={16} aria-hidden /> Từ chối
            </Button>
            <Button variant="primary" onClick={() => review("approve")} disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Check size={16} aria-hidden />} Duyệt
            </Button>
          </ModalActions>
        </div>
      ) : (
        <>
          {item.reviewNote && <p className="md-body-medium mt-3 text-on-surface-variant">Ghi chú: {item.reviewNote}</p>}
          <ModalActions>
            <Button onClick={onClose}>Đóng</Button>
          </ModalActions>
        </>
      )}
    </Modal>
  );
}
