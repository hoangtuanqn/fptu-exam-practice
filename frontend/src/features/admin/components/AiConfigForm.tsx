import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { adminApi } from "@/features/admin/api/admin.api";
import { useToast } from "@/shared/context/ToastContext";
import { useSubmit } from "@/shared/hooks/useSubmit";
import type { AiAdminConfig, AiEffort } from "@/shared/types/api";
import { Button } from "@/shared/ui/Button";
import { Card, CardHeader } from "@/shared/ui/Card";
import { FormError } from "@/shared/ui/Feedback";
import { Input, PasswordInput } from "@/shared/ui/Input";
import { Switch } from "@/shared/ui/Switch";

const EFFORTS: { value: AiEffort; label: string; hint: string }[] = [
  { value: "low", label: "Thấp", hint: "Nhanh, rẻ nhất" },
  { value: "medium", label: "Vừa", hint: "Cân bằng" },
  { value: "high", label: "Cao", hint: "Khuyên dùng" },
  { value: "xhigh", label: "Rất cao", hint: "Kỹ hơn, tốn hơn" },
  { value: "max", label: "Tối đa", hint: "Tốn nhất" },
];

// Cấu hình AI Claude: bật thì mỗi đề mới lấy về được Claude giải đáp án (gửi ảnh + bình luận + prompt hệ thống)
export function AiConfigForm({ initial, onSaved }: { initial: AiAdminConfig; onSaved: () => void }) {
  const toast = useToast();
  const { run, loading, error, fieldErrors } = useSubmit();
  const [enabled, setEnabled] = useState(initial.enabled);
  const [useSearch, setUseSearch] = useState(initial.useSearch);
  const [claudeModel, setClaudeModel] = useState(initial.claudeModel);
  const [effort, setEffort] = useState<AiEffort>(initial.effort);
  const [anthropicApiKey, setAnthropicApiKey] = useState("");

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await adminApi.saveAiConfig({ enabled, useSearch, claudeModel, effort, anthropicApiKey: anthropicApiKey || undefined });
      setAnthropicApiKey("");
      toast.success("Đã lưu cấu hình AI");
      onSaved();
    });
  };

  return (
    <Card>
      <CardHeader title="AI giải đáp án (Claude)" description="Đề mới lấy về chưa có đáp án sẽ được Claude giải theo prompt hướng dẫn giải đề." />
      <form onSubmit={onSubmit} className="space-y-5 p-5" noValidate>
        <FormError message={error} />

        <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4">
          <div>
            <div className="text-sm font-medium text-slate-800">Bật AI giải đề khi lấy đề</div>
            <div className="text-xs text-slate-500">Tắt thì đề mới chưa có đáp án (chỉ xem được). Có thể nhờ AI giải lại sau ở trang Đề thi.</div>
          </div>
          <Switch checked={enabled} onChange={setEnabled} label="Bật AI giải đề" />
        </div>

        <PasswordInput
          label="Khóa API Anthropic"
          autoComplete="off"
          value={anthropicApiKey}
          onChange={(e) => setAnthropicApiKey(e.target.value)}
          error={fieldErrors.anthropicApiKey}
          placeholder={initial.hasApiKey ? `Đang dùng ${initial.apiKeyPreview} (để trống nếu không đổi)` : "Dán khóa từ console.anthropic.com"}
          hint="Cũng có thể đặt ANTHROPIC_API_KEY trong .env của backend. Tài khoản cần còn credit."
        />
        <Input
          label="Model"
          value={claudeModel}
          onChange={(e) => setClaudeModel(e.target.value)}
          error={fieldErrors.claudeModel}
          hint="Mặc định claude-haiku-5-5 (rẻ nhất). claude-sonnet-5-5 hoặc claude-opus-5-5 chính xác hơn nhưng đắt hơn."
        />

        <div>
          <div className="mb-1.5 text-sm font-medium text-slate-700">Mức suy luận</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {EFFORTS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setEffort(o.value)}
                className={`rounded-lg border-2 px-2 py-2 text-center transition ${
                  effort === o.value ? "border-brand-900 bg-slate-50" : "border-slate-200 hover:border-slate-400"
                }`}
              >
                <div className="text-sm font-medium text-slate-900">{o.label}</div>
                <div className="text-xs text-slate-500">{o.hint}</div>
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-slate-500">Mức càng cao Claude càng suy nghĩ kỹ (đúng hơn) nhưng tốn nhiều token và lâu hơn.</p>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4">
          <div>
            <div className="text-sm font-medium text-slate-800">Cho Claude tra web khi không chắc</div>
            <div className="text-xs text-slate-500">Tối đa 5 lượt tìm kiếm mỗi đề, tính thêm phí theo lượt tìm và làm chậm hơn.</div>
          </div>
          <Switch checked={useSearch} onChange={setUseSearch} label="Cho Claude tra web" />
        </div>

        <Button variant="primary" type="submit" disabled={loading}>
          {loading && <Loader2 size={16} className="animate-spin" />}
          Lưu cấu hình AI
        </Button>
      </form>
    </Card>
  );
}
