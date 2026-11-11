import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, FileText, Trash2 } from "lucide-react";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { Badge, type Tone } from "@/shared/ui/Badge";
import { IconButton } from "@/shared/ui/Button";
import { Card, CardHeader } from "@/shared/ui/Card";
import { useConfirm } from "@/shared/ui/ConfirmDialog";
import { Empty, LinearProgress } from "@/shared/ui/Feedback";
import { formatDate } from "@/shared/utils/formatters";
import { materialsApi, resultPath, type MaterialItem, type MaterialStatus } from "./materials.api";

const STATUS: Record<MaterialStatus, { label: string; tone: Tone }> = {
  QUEUED: { label: "Đang chờ", tone: "neutral" },
  RUNNING: { label: "Đang phân tích", tone: "info" },
  DONE: { label: "Xong", tone: "success" },
  FAILED: { label: "Lỗi", tone: "danger" },
};

const shortDate = (iso: string | null | undefined) => (iso && !Number.isNaN(Date.parse(iso)) ? formatDate(iso) : null);

export function MaterialList({ items, onChanged }: { items: MaterialItem[]; onChanged: () => void }) {
  const { confirm, confirmDialog } = useConfirm();
  const toast = useToast();
  const [removing, setRemoving] = useState<MaterialItem["id"] | null>(null);

  const remove = async (m: MaterialItem) => {
    const ok = await confirm({ title: "Xoá kết quả phân tích?", message: `Xoá “${m.title}” và toàn bộ tóm tắt của file này. Không khôi phục được.`, confirmLabel: "Xoá", tone: "danger" });
    if (!ok) return;
    setRemoving(m.id);
    try {
      await materialsApi.remove(m.id);
      toast.success("Đã xoá");
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err, "Chưa xoá được"));
    } finally {
      setRemoving(null);
    }
  };

  return (
    <Card>
      <CardHeader title="File đã tải lên" description={items.length > 0 ? `${items.length} file` : undefined} />
      {items.length === 0 ? (
        <Empty icon={FileText} title="Chưa có file nào">
          Tải slide của một môn lên để xem tóm tắt theo chương.
        </Empty>
      ) : (
        <ul className="divide-y divide-outline-variant">
          {items.map((m) => (
            <Row key={m.id} item={m} busy={removing === m.id} onRemove={() => void remove(m)} />
          ))}
        </ul>
      )}
      {confirmDialog}
    </Card>
  );
}

function Row({ item, busy, onRemove }: { item: MaterialItem; busy: boolean; onRemove: () => void }) {
  const status = STATUS[item.status] ?? STATUS.QUEUED;
  const done = item.status === "DONE";
  const total = item.progress?.total ?? 0;
  const progress = item.status === "RUNNING" && total > 0 ? Math.min(1, Math.max(0, (item.progress?.done ?? 0) / total)) : undefined;
  const expires = shortDate(item.expiresAt);
  const created = shortDate(item.createdAt);
  const meta = [
    [item.subjectCode, item.subjectName].filter(Boolean).join(" · "),
    typeof item.pages === "number" && item.pages > 0 ? `${item.pages} trang` : "",
    created ? `Tải lên ${created}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="flex items-start gap-3 px-5 py-4">
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="md-title-small min-w-0 break-words text-on-surface">{item.title}</span>
          <Badge tone={status.tone}>
            {status.label}
            {item.status === "RUNNING" && total > 0 && ` ${item.progress?.done ?? 0}/${total}`}
          </Badge>
        </div>
        {meta && <p className="md-body-small break-words text-on-surface-variant">{meta}</p>}
        {item.status === "RUNNING" && <LinearProgress value={progress} label={`Tiến độ phân tích ${item.title}`} />}
        {item.status === "FAILED" && (
          <p className="md-body-small flex items-start gap-1.5 text-error">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {item.error?.trim() || "Chưa phân tích được file này. Bạn thử tải lên lại nhé."}
          </p>
        )}
        {expires && <p className="md-body-small text-on-surface-variant">Kết quả tự xoá ngày {expires}</p>}
        {done && (
          <Link to={resultPath(item.id)} className="md-label-large inline-flex min-h-10 items-center gap-1 text-primary hover:underline">
            Xem kết quả <ArrowRight size={14} />
          </Link>
        )}
      </div>
      <IconButton label={`Xoá ${item.title}`} onClick={onRemove} disabled={busy}>
        <Trash2 size={18} />
      </IconButton>
    </li>
  );
}
