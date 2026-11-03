import { useState } from "react";
import { Users } from "lucide-react";
import { adminApi } from "@/features/admin/api/admin.api";
import { useApi } from "@/shared/hooks/useApi";
import type { GiftCode } from "@/shared/types/api";
import { Button } from "@/shared/ui/Button";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import { Modal, ModalActions, ModalTitle } from "@/shared/ui/Modal";
import { Pagination } from "@/shared/ui/Table";
import { formatCredit, formatDateTime } from "@/shared/utils/formatters";
import { useClampPage } from "@/shared/hooks/useClampPage";

// Ai đã dùng một giftcode (phân trang trên server)
export function GiftCodeRedemptionsDialog({ gift, onClose }: { gift: GiftCode; onClose: () => void }) {
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useApi(() => adminApi.giftCodeRedemptions(gift.id, page), [gift.id, page]);
  useClampPage(data?.meta, setPage);

  return (
    <Modal onClose={onClose}>
      <ModalTitle icon={Users}>Lượt dùng mã {gift.code}</ModalTitle>
      <p className="mt-1 text-sm text-slate-500">
        Đã dùng {gift.usedCount}/{gift.maxUses} lượt, mỗi lượt {formatCredit(gift.amount)}.
      </p>

      <div className="mt-4">
        {loading && !data ? (
          <Loading />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : data && data.items.length > 0 ? (
          <>
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {data.items.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-900">{r.user.fullName}</div>
                    <div className="truncate text-xs text-slate-500">{r.user.email}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-semibold tabular-nums text-emerald-700">+{formatCredit(r.amount)}</div>
                    <div className="text-xs text-slate-400">{formatDateTime(r.createdAt)}</div>
                  </div>
                </li>
              ))}
            </ul>
            <Pagination meta={data.meta} onPage={setPage} />
          </>
        ) : (
          <Empty icon={Users} title="Chưa có ai dùng mã này" />
        )}
      </div>

      <ModalActions>
        <Button onClick={onClose}>Đóng</Button>
      </ModalActions>
    </Modal>
  );
}
