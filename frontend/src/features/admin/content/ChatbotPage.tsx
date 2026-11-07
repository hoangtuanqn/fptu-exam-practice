import { useState, type FormEvent } from "react";
import { BookOpenCheck, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { adminApi, type ChatbotAdmin } from "@/features/admin/api/admin.api";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { useSubmit } from "@/shared/hooks/useSubmit";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Card, CardHeader, PageHeader } from "@/shared/ui/Card";
import { ErrorBox, FormError, Loading } from "@/shared/ui/Feedback";
import { Input, PasswordInput } from "@/shared/ui/Input";
import { Switch } from "@/shared/ui/Switch";
import { formatDateTime } from "@/shared/utils/formatters";
import { errorMessage } from "@/shared/api/errors";

function Settings({ data, onSaved }: { data: ChatbotAdmin; onSaved: () => void }) {
  const toast = useToast();
  const { run, loading, error, fieldErrors } = useSubmit();
  const s = data.settings;
  const [enabled, setEnabled] = useState(s.enabled);
  const [claudeModel, setClaudeModel] = useState(s.claudeModel);
  const [geminiApiKey, setKey] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await adminApi.saveChatbot({ enabled, claudeModel, geminiApiKey: geminiApiKey || undefined });
      setKey("");
      toast.success("Đã lưu cấu hình chatbot");
      onSaved();
    });
  };

  return (
    <Card>
      <CardHeader title="Cấu hình" description="Chatbot trả lời bằng Claude (dùng khoá Anthropic ở mục “AI giải đáp án”). Khoá Gemini chỉ dùng để tạo embedding." />
      <form onSubmit={submit} className="space-y-5 p-5" noValidate>
        <FormError message={error} />
        <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4">
          <div>
            <div className="text-sm font-medium text-slate-800">Bật chatbot hỗ trợ</div>
            <div className="text-xs text-slate-500">Tắt thì bong bóng “Hỏi trợ lý” biến mất khỏi website.</div>
          </div>
          <Switch checked={enabled} onChange={setEnabled} label="Bật chatbot" />
        </div>
        <PasswordInput
          label="Khoá API Google Gemini (embedding)"
          autoComplete="off"
          value={geminiApiKey}
          onChange={(e) => setKey(e.target.value)}
          error={fieldErrors.geminiApiKey}
          hint={s.hasGeminiKey ? `Đã cấu hình (${s.geminiKeyPreview}). Để trống để giữ khoá hiện tại.` : "Chưa có khoá: chatbot vẫn chạy nhưng tìm bằng từ khoá, kém chính xác hơn. Lấy khoá miễn phí ở Google AI Studio."}
        />
        <Input label="Model trả lời" value={claudeModel} onChange={(e) => setClaudeModel(e.target.value)} error={fieldErrors.claudeModel} hint="Nên dùng model nhỏ (Haiku) cho rẻ và nhanh." />
        <Button variant="primary" type="submit" disabled={loading}>
          {loading && <Loader2 size={16} className="animate-spin" />} Lưu cấu hình
        </Button>
      </form>
    </Card>
  );
}

export default function ChatbotPage() {
  const toast = useToast();
  const { data, error, loading, reload } = useApi(() => adminApi.chatbot(), []);
  const [syncing, setSyncing] = useState(false);

  async function reindex() {
    setSyncing(true);
    try {
      const r = await adminApi.reindexChatbot();
      toast.success(r.warning ?? `Đã cập nhật: ${r.updated} mục mới/đã đổi, ${r.embedded}/${r.total} mục có embedding`);
      reload();
    } catch (err) {
      toast.error(errorMessage(err, "Không cập nhật được"));
    } finally {
      setSyncing(false);
    }
  }

  async function clearCache() {
    try {
      await adminApi.clearChatbotCache();
      toast.success("Đã xoá cache câu trả lời");
      reload();
    } catch (err) {
      toast.error(errorMessage(err, "Không xoá được"));
    }
  }

  return (
    <>
      <PageHeader eyebrow="Quản trị" title="Chatbot hỗ trợ" description="Trợ lý chỉ hướng dẫn cách dùng FEPass, không giải bài và không thao tác thay người dùng." />
      {loading && !data ? (
        <Loading />
      ) : error || !data ? (
        <ErrorBox message={error ?? "Không tải được cấu hình"} onRetry={reload} />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="p-4">
              <div className="text-xs text-slate-500">Câu hỏi hôm nay</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">{data.stats.today}</div>
              <div className="text-xs text-slate-400">tổng cộng {data.stats.total}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-slate-500">Tri thức</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">{data.knowledge.chunks} mục</div>
              <div className="mt-1">{data.knowledge.embedded === data.knowledge.chunks && data.knowledge.chunks > 0 ? <Badge tone="success">Đã có embedding</Badge> : <Badge tone="warning">{data.knowledge.embedded}/{data.knowledge.chunks} có embedding</Badge>}</div>
            </Card>
            <Card className="flex flex-col justify-between p-4">
              <div className="text-xs text-slate-500">Nguồn: <code>backend/knowledge/fepass-guide.md</code>. Sửa file rồi triển khai lại, sau đó bấm cập nhật.</div>
              <Button className="mt-3" onClick={() => void reindex()} disabled={syncing}>
                {syncing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Cập nhật tri thức
              </Button>
            </Card>
          </div>

          <Card className="flex flex-wrap items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <div className="text-xs text-slate-500">Câu trả lời lưu sẵn (cache)</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">{data.cache.entries} câu</div>
              <div className="text-xs text-slate-400">
                Hôm nay trả từ cache {data.cache.today}/{data.stats.today} lượt, tổng {data.cache.total}/{data.stats.total}. Mỗi lượt như vậy không tốn token.
              </div>
            </div>
            <Button variant="secondary" onClick={() => void clearCache()} disabled={data.cache.entries === 0}>
              <Trash2 size={15} /> Xoá cache
            </Button>
          </Card>

          <Settings key={data.settings.geminiKeyPreview + String(data.settings.enabled)} data={data} onSaved={reload} />

          <Card>
            <CardHeader title="Câu hỏi chưa có tài liệu" description="Người dùng hỏi nhưng không tìm thấy mục hướng dẫn nào khớp. Bổ sung các nội dung này vào hướng dẫn." />
            {data.stats.unmatched.length === 0 ? (
              <p className="flex items-center gap-2 p-5 text-sm text-slate-500">
                <BookOpenCheck size={16} /> Chưa có câu hỏi nào bị bỏ sót.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.stats.unmatched.map((q, i) => (
                  <li key={i} className="flex items-start justify-between gap-4 px-5 py-3 text-sm">
                    <span className="min-w-0 break-words text-slate-800">{q.question}</span>
                    <span className="shrink-0 text-xs text-slate-400">{formatDateTime(q.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
