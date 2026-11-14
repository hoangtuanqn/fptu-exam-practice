import { useCallback, useState } from "react";
import { Ban, Eye, Loader2, Megaphone, Plus, Send, Square, X } from "lucide-react";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { useClampPage } from "@/shared/hooks/useClampPage";
import { Badge, type Tone } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { useConfirm } from "@/shared/ui/ConfirmDialog";
import { Empty, FormError } from "@/shared/ui/Feedback";
import { Input } from "@/shared/ui/Input";
import { Modal, ModalActions, ModalTitle } from "@/shared/ui/Modal";
import { QueryBoundary } from "@/shared/ui/QueryBoundary";
import { Pagination, Table, Td, Th, Thead, Tr } from "@/shared/ui/Table";
import { formatDateTime } from "@/shared/utils/formatters";
import { BroadcastComposer, segmentLabel } from "./BroadcastComposer";
import { marketingAdminApi, type Broadcast, type BroadcastStatus } from "./marketing.api";

const nf = new Intl.NumberFormat("vi-VN");
const CONFIRM_WORD = "GỬI";

const STATUS: Record<BroadcastStatus, { label: string; tone: Tone }> = {
  DRAFT: { label: "Bản nháp", tone: "neutral" },
  SENDING: { label: "Đang gửi", tone: "info" },
  DONE: { label: "Đã gửi xong", tone: "success" },
  CANCELLED: { label: "Đã huỷ", tone: "warning" },
};

type Dialog = { kind: "compose" } | { kind: "preview" | "start"; b: Broadcast };

export function BroadcastsTab() {
  const toast = useToast();
  const { confirm, confirmDialog } = useConfirm();
  const [page, setPage] = useState(1);
  const list = useApi(() => marketingAdminApi.broadcasts(page), [page]);
  useClampPage(list.data?.meta, setPage);
  const [busy, setBusy] = useState<number | null>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const closeDialog = useCallback(() => setDialog(null), []); // ổn định để Modal không chạy lại effect focus mỗi lần render

  const sendTest = async (b: Broadcast) => {
    setBusy(b.id);
    try {
      const r = await marketingAdminApi.testBroadcast(b.id);
      toast.success(`Đã gửi ${r.sent} thư thử tới ${r.to}`);
    } catch (err) {
      toast.error(errorMessage(err, "Không gửi được thư thử"));
    } finally {
      setBusy(null);
    }
  };

  const cancel = async (b: Broadcast) => {
    const sending = b.status === "SENDING";
    const ok = await confirm({
      title: sending ? "Dừng gửi thông báo này?" : "Huỷ bản nháp này?",
      message: sending
        ? `Những thư chưa gửi sẽ không được gửi nữa. Đã gửi ${nf.format(b.sent ?? 0)} thư. Không bật lại được, muốn gửi tiếp thì soạn thông báo mới.`
        : "Bản nháp sẽ chuyển sang Đã huỷ. Muốn sửa nội dung thì soạn thông báo mới.",
      confirmLabel: sending ? "Dừng gửi" : "Huỷ bản nháp",
      cancelLabel: "Không",
      tone: "danger",
      icon: sending ? Square : Ban,
    });
    if (!ok) return;
    setBusy(b.id);
    try {
      await marketingAdminApi.cancelBroadcast(b.id);
      toast.success(sending ? "Đã dừng gửi" : "Đã huỷ bản nháp");
      list.reload();
    } catch (err) {
      toast.error(errorMessage(err, "Không huỷ được"));
      list.reload();
    } finally {
      setBusy(null);
    }
  };

  const actions = (b: Broadcast) => {
    const working = busy === b.id;
    return (
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setDialog({ kind: "preview", b })}>
          <Eye size={16} />
          Xem thư
        </Button>
        {b.status === "DRAFT" && (
          <>
            <Button size="sm" disabled={working} onClick={() => void sendTest(b)}>
              {working ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Gửi thử cho tôi
            </Button>
            <Button size="sm" variant="primary" disabled={working} onClick={() => setDialog({ kind: "start", b })}>
              <Megaphone size={16} />
              Gửi cho mọi người
            </Button>
            <Button size="sm" variant="text" disabled={working} onClick={() => void cancel(b)}>
              <X size={16} />
              Huỷ
            </Button>
          </>
        )}
        {b.status === "SENDING" && (
          <Button size="sm" variant="danger" disabled={working} onClick={() => void cancel(b)}>
            <Square size={16} />
            Dừng gửi
          </Button>
        )}
      </div>
    );
  };

  const stats = (b: Broadcast) => (
    <span className="tabular-nums">
      {nf.format(b.sent ?? 0)} gửi · {nf.format(b.clicked ?? 0)} bấm
    </span>
  );
  const status = (b: Broadcast) => {
    const s = STATUS[b.status] ?? { label: b.status, tone: "neutral" as Tone };
    return <Badge tone={s.tone}>{s.label}</Badge>;
  };

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button variant="primary" onClick={() => setDialog({ kind: "compose" })}>
          <Plus size={18} />
          Soạn thông báo
        </Button>
      </div>
      <Card>
        <QueryBoundary query={list}>
          {({ items, meta }) =>
            items.length === 0 ? (
              <Empty icon={Megaphone} title="Chưa có thông báo nào">
                Soạn thông báo, xem thử rồi mới gửi cho mọi người.
              </Empty>
            ) : (
              <>
                <ul className="divide-y divide-outline-variant md:hidden">
                  {items.map((b) => (
                    <li key={b.id} className="space-y-2 px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <span className="md-title-small break-words text-on-surface">{b.subject}</span>
                        {status(b)}
                      </div>
                      <p className="md-body-small text-on-surface-variant">
                        {segmentLabel(b)} · {stats(b)} · {formatDateTime(b.createdAt)}
                      </p>
                      {actions(b)}
                    </li>
                  ))}
                </ul>
                <div className="hidden md:block">
                  <Table>
                    <Thead>
                      <Th>Tiêu đề</Th>
                      <Th>Gửi cho</Th>
                      <Th>Trạng thái</Th>
                      <Th>Đã gửi / bấm</Th>
                      <Th>Tạo lúc</Th>
                      <Th>Thao tác</Th>
                    </Thead>
                    <tbody>
                      {items.map((b) => (
                        <Tr key={b.id}>
                          <Td className="max-w-xs break-words font-medium text-on-surface">{b.subject}</Td>
                          <Td>{segmentLabel(b)}</Td>
                          <Td>{status(b)}</Td>
                          <Td className="whitespace-nowrap">{stats(b)}</Td>
                          <Td className="whitespace-nowrap text-on-surface-variant">{formatDateTime(b.createdAt)}</Td>
                          <Td>{actions(b)}</Td>
                        </Tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
                <Pagination meta={meta} onPage={setPage} />
              </>
            )
          }
        </QueryBoundary>
      </Card>
      {dialog?.kind === "compose" && <BroadcastComposer onClose={closeDialog} onCreated={() => (page === 1 ? list.reload() : setPage(1))} />}
      {dialog?.kind === "preview" && <BroadcastPreview b={dialog.b} onClose={closeDialog} />}
      {dialog?.kind === "start" && <StartDialog b={dialog.b} onClose={closeDialog} onStarted={list.reload} />}
      {confirmDialog}
    </>
  );
}

// Cùng cách xem như PreviewDialog: iframe sandbox rỗng, không chạy script, không điều hướng trang admin
function BroadcastPreview({ b, onClose }: { b: Broadcast; onClose: () => void }) {
  const preview = useApi(() => marketingAdminApi.previewBroadcast(b.id), [b.id]);
  return (
    <Modal wide onClose={onClose}>
      <ModalTitle icon={Eye}>Xem thư</ModalTitle>
      <div className="mt-4">
        <QueryBoundary query={preview} loadingLabel="Đang dựng thư…">
          {(p) => (
            <>
              <p className="md-body-medium text-on-surface-variant">
                Tiêu đề: <b className="text-on-surface">{p.subject}</b>
              </p>
              <iframe title={p.subject} sandbox="" srcDoc={p.html} className="mt-3 h-[60vh] w-full rounded-m3-md border border-outline-variant bg-white" />
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

function StartDialog({ b, onClose, onStarted }: { b: Broadcast; onClose: () => void; onStarted: () => void }) {
  const toast = useToast();
  const estimate = useApi(() => marketingAdminApi.estimateBroadcast(b.id), [b.id]);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bàn phím tiếng Việt có thể gõ dấu dạng tổ hợp: so sau khi chuẩn hoá, như backend
  const matches = typed.normalize("NFC").trim() === CONFIRM_WORD;

  const start = async () => {
    if (!matches) return;
    setBusy(true);
    setError(null);
    try {
      await marketingAdminApi.startBroadcast(b.id, typed);
      toast.success("Đã bắt đầu. Thư sẽ đi từ lượt gửi kế tiếp.");
      onStarted();
      onClose();
    } catch (err) {
      setError(errorMessage(err, "Chưa bắt đầu được"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <ModalTitle icon={Megaphone}>Gửi cho mọi người?</ModalTitle>
      <form
        className="mt-3 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void start();
        }}
      >
        <div className="md-body-large text-on-surface-variant">
          <p className="mb-2">
            "<b className="text-on-surface">{b.subject}</b>" gửi cho: {segmentLabel(b)}.
          </p>
          <QueryBoundary query={estimate} loadingLabel="Đang ước tính…">
            {(e) => (
              <p className="text-on-surface">
                Khoảng <b className="tabular-nums">{nf.format(e.recipients)}</b> người, mất ít nhất khoảng <b className="tabular-nums">{nf.format(e.days)}</b> ngày để gửi hết.
              </p>
            )}
          </QueryBoundary>
          <p className="mt-2">Thư bắt đầu đi từ lượt gửi hằng ngày kế tiếp. Người đã huỷ nhận hoặc tắt loại thư này sẽ không nhận. Có thể dừng bất cứ lúc nào.</p>
        </div>
        <Input label={`Gõ ${CONFIRM_WORD} để xác nhận`} value={typed} autoComplete="off" onChange={(e) => setTyped(e.target.value)} />
        {error && <FormError message={error} />}
        <ModalActions>
          <Button type="button" disabled={busy} onClick={onClose}>
            Huỷ
          </Button>
          <Button type="submit" variant="primary" disabled={busy || !matches || !estimate.data}>
            {busy && <Loader2 size={16} className="animate-spin" />}
            Bắt đầu gửi
          </Button>
        </ModalActions>
      </form>
    </Modal>
  );
}
