import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Download, FileArchive, Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { ApiError } from "@/shared/api/client";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { Button, buttonClass } from "@/shared/ui/Button";
import { Card, CardHeader, PageHeader } from "@/shared/ui/Card";
import { Empty, FormError } from "@/shared/ui/Feedback";
import { inputClass } from "@/shared/ui/Input";
import { ChargeSummary } from "@/shared/ui/ChargeSummary";
import { Modal, ModalActions, ModalTitle } from "@/shared/ui/Modal";
import { formatCredit, formatDateTime } from "@/shared/utils/formatters";
import { peApi } from "./pe.api";

const STATUS: Record<string, { text: string; cls: string }> = {
  DONE: { text: "Đã tải", cls: "bg-emerald-50 text-emerald-700" },
  FAILED: { text: "Lỗi (đã hoàn phí)", cls: "bg-rose-50 text-rose-700" },
  PENDING: { text: "Đang xử lý", cls: "bg-amber-50 text-amber-700" },
};
const size = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

// Tải bộ tài nguyên đề thi PE (file zip) từ FuOverflow; mỗi lần tải trừ credit và được ghi vào lịch sử
export default function PeDownloadPage() {
  const { user, refresh } = useAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [url, setUrl] = useState(params.get("link") ?? "");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fee, setFee] = useState<number | null>(null); // phí thực tế lần này (0 = đã trả rồi, tải lại miễn phí)
  const [error, setError] = useState<string | null>(null);
  const price = useApi(() => peApi.price(), []).data?.price ?? 50;
  const history = useApi(() => peApi.history(), []);
  const balance = user?.balance ?? 0;
  const due = fee ?? price;
  const unverified = !!user && !user.emailVerifiedAt;

  // Mở từ nút của tiện ích: tự mở hộp xác nhận một lần (vẫn phải bấm xác nhận mới bị trừ credit)
  const auto = useRef(false);
  useEffect(() => {
    if (auto.current || params.get("confirm") !== "1" || !url.trim()) return;
    auto.current = true;
    void openConfirm();
    setParams((p) => {
      const n = new URLSearchParams(p);
      n.delete("confirm");
      n.delete("src");
      return n;
    }, { replace: true });
  }, [params, setParams, url]);

  // Mở hộp xác nhận: hỏi trước phí thực tế (đã trả rồi thì miễn phí)
  async function openConfirm(link = url) {
    setFee(null);
    setConfirming(true);
    try {
      setFee((await peApi.quote(link.trim())).fee);
    } catch {
      setFee(null); // không hỏi được: hiện giá niêm yết, máy chủ vẫn tính đúng khi tải
    }
  }

  async function download() {
    setConfirming(false);
    setBusy(true);
    setError(null);
    try {
      const { blob, filename } = await peApi.download(url.trim());
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
      toast.success(`Đã tải ${filename}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không tải được, vui lòng thử lại");
    } finally {
      setBusy(false);
      void refresh();
      history.reload();
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (url.trim() && !busy) void openConfirm();
  };

  return (
    <>
      <PageHeader title="Tải đề thi PE" description={`Đề thi PE là bộ tài nguyên (không phải ảnh): hệ thống gom các tệp của bài thành một file zip. Trả phí ${formatCredit(price)} một lần cho mỗi đề, tải lại sau miễn phí.`} />

      <Card>
        <CardHeader title="Dán link bài “Đề Thi PE” trên FuOverflow" />
        <form onSubmit={onSubmit} className="space-y-3 p-5">
          <FormError message={error} />
          <div className="flex flex-col gap-2 sm:flex-row">
            <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} disabled={busy} placeholder="https://fuoverflow.com/threads/pro192-su26-b1-pe-paper-5.7048/" aria-label="Link đề PE" className={`${inputClass()} sm:flex-1`} />
            <Button variant="primary" type="submit" disabled={!url.trim() || busy}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {busy ? "Đang chuẩn bị file…" : "Tải file zip"}
            </Button>
          </div>
          {busy && <p className="text-xs text-slate-500">Đang gom tài nguyên và nén, có thể mất vài chục giây. Đừng đóng trang.</p>}
        </form>
      </Card>

      <Card className="mt-6">
        <CardHeader title="Lịch sử tải" />
        {history.data && history.data.items.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {history.data.items.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <FileArchive size={20} className="shrink-0 text-slate-400" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-900">{r.title}</div>
                    <div className="text-xs text-slate-500">
                      {formatDateTime(r.createdAt)}
                      {r.status === "DONE" && ` · ${r.files} tệp · ${size(r.sizeBytes)}`} · {r.price === 0 ? "miễn phí" : `${r.status === "FAILED" ? "đã hoàn" : "trừ"} ${formatCredit(r.price)}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS[r.status]?.cls}`}>{STATUS[r.status]?.text}</span>
                  <Button size="sm" onClick={() => { const l = `https://fuoverflow.com/threads/${r.threadId}/`; setUrl(l); void openConfirm(l); }} disabled={busy}>
                    Tải lại
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Empty title="Chưa tải đề PE nào" />
        )}
      </Card>

      {confirming && (
        <Modal onClose={() => setConfirming(false)}>
          <ModalTitle icon={FileArchive}>Xác nhận tải đề PE</ModalTitle>
          {unverified ? (
            <p className="mt-3 text-sm text-rose-700">Bạn cần xác minh email trước khi tải.</p>
          ) : (
            <>
              <div className="mt-4 truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600" title={url}>{url}</div>
              <div className="mt-4"><ChargeSummary amount={due} balance={balance} freeNote="Bạn đã trả phí đề này trước đó nên tải lại miễn phí." /></div>
              <p className="mt-3 text-xs leading-relaxed text-slate-500">Chỉ trả phí lần đầu cho mỗi đề, các lần tải lại sau miễn phí. Không tạo được file thì hoàn phí tự động.</p>
            </>
          )}
          <ModalActions>
            <Button grow onClick={() => setConfirming(false)}>Hủy</Button>
            {!unverified && (balance < due ? (
              <Link to="/account/deposit" className={buttonClass({ variant: "primary", grow: true })}>Nạp credit</Link>
            ) : (
              <Button grow variant="primary" onClick={() => void download()}><Download size={16} /> {due > 0 ? `Trả ${formatCredit(due)}` : "Tải miễn phí"}</Button>
            ))}
          </ModalActions>
        </Modal>
      )}
    </>
  );
}
