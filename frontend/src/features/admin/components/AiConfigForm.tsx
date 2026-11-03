import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { adminApi } from "@/features/admin/api/admin.api";
import { useToast } from "@/shared/context/ToastContext";
import { useSubmit } from "@/shared/hooks/useSubmit";
import type { AiAdminConfig } from "@/shared/types/api";
import { Button } from "@/shared/ui/Button";
import { Card, CardHeader } from "@/shared/ui/Card";
import { FormError } from "@/shared/ui/Feedback";
import { Input, PasswordInput } from "@/shared/ui/Input";
import { Switch } from "@/shared/ui/Switch";

// Cấu hình AI Gemini: bật thì mỗi đề mới lấy về được AI giải đáp án (gửi ảnh + bình luận + prompt hệ thống)
export function AiConfigForm({ initial, onSaved }: { initial: AiAdminConfig; onSaved: () => void }) {
  const toast = useToast();
  const { run, loading, error, fieldErrors } = useSubmit();
  const [enabled, setEnabled] = useState(initial.enabled);
  const [useSearch, setUseSearch] = useState(initial.useSearch);
  const [model, setModel] = useState(initial.model);
  const [apiKey, setApiKey] = useState("");
  const [provider, setProvider] = useState(initial.provider);
  const [aimlModel, setAimlModel] = useState(initial.aimlModel);
  const [aimlApiKey, setAimlApiKey] = useState("");

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await adminApi.saveAiConfig({
        enabled,
        useSearch,
        provider,
        model,
        aimlModel,
        apiKey: apiKey || undefined,
        aimlApiKey: aimlApiKey || undefined,
      });
      setApiKey("");
      setAimlApiKey("");
      toast.success("Đã lưu cấu hình AI");
      onSaved();
    });
  };

  return (
    <Card>
      <CardHeader title="AI giải đáp án" description="Đề mới lấy về chưa có đáp án sẽ được AI giải theo prompt hướng dẫn giải đề." />
      <form onSubmit={onSubmit} className="space-y-5 p-5" noValidate>
        <FormError message={error} />

        <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4">
          <div>
            <div className="text-sm font-medium text-slate-800">Bật AI giải đề khi lấy đề</div>
            <div className="text-xs text-slate-500">Tắt thì đề mới chưa có đáp án (chỉ xem được). Có thể nhờ AI giải lại sau ở trang Đề thi.</div>
          </div>
          <Switch checked={enabled} onChange={setEnabled} label="Bật AI giải đề" />
        </div>

        <div>
          <div className="mb-1.5 text-sm font-medium text-slate-700">Nhà cung cấp AI</div>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["gemini", "Google Gemini"],
                ["aimlapi", "AIMLAPI (GPT, Claude, ...)"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setProvider(value)}
                className={`rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition ${
                  provider === value ? "border-brand-900 bg-slate-50 text-slate-900" : "border-slate-200 text-slate-600 hover:border-slate-400"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {provider === "gemini" ? (
          <>
            <PasswordInput
              label="Khóa API Gemini"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              error={fieldErrors.apiKey}
              placeholder={initial.hasApiKey ? `Đang dùng ${initial.apiKeyPreview} (để trống nếu không đổi)` : "Dán khóa từ Google AI Studio"}
              hint="Lấy ở aistudio.google.com/apikey. Cũng có thể đặt GEMINI_API_KEY trong .env của backend."
            />
            <Input
              label="Model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              error={fieldErrors.model}
              hint="Mặc định gemini-3-flash-preview (rẻ, dùng được với khóa miễn phí). Các model Pro cần tài khoản có trả phí."
            />
          </>
        ) : (
          <>
            <PasswordInput
              label="Khóa API AIMLAPI"
              autoComplete="off"
              value={aimlApiKey}
              onChange={(e) => setAimlApiKey(e.target.value)}
              error={fieldErrors.aimlApiKey}
              placeholder={initial.hasAimlApiKey ? `Đang dùng ${initial.aimlApiKeyPreview} (để trống nếu không đổi)` : "Dán khóa từ aimlapi.com"}
              hint="Cũng có thể đặt AIMLAPI_KEY trong .env của backend. Tài khoản cần còn số dư."
            />
            <Input
              label="Model"
              value={aimlModel}
              onChange={(e) => setAimlModel(e.target.value)}
              error={fieldErrors.aimlModel}
              hint="Ví dụ openai/gpt-5-5. Chọn model đọc được ảnh."
            />
          </>
        )}

        <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4">
          <div>
            <div className="text-sm font-medium text-slate-800">Cho AI tra Google khi giải</div>
            <div className="text-xs text-slate-500">Chỉ áp dụng với Gemini. Tốn thêm hạn mức và có thể chậm hơn.</div>
          </div>
          <Switch checked={useSearch} onChange={setUseSearch} label="Cho AI tra Google" />
        </div>

        <Button variant="primary" type="submit" disabled={loading}>
          {loading && <Loader2 size={16} className="animate-spin" />}
          Lưu cấu hình AI
        </Button>
      </form>
    </Card>
  );
}
