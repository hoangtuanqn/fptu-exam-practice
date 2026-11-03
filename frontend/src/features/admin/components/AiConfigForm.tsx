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

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await adminApi.saveAiConfig({ enabled, useSearch, model, apiKey: apiKey || undefined });
      setApiKey("");
      toast.success("Đã lưu cấu hình AI");
      onSaved();
    });
  };

  return (
    <Card>
      <CardHeader title="AI giải đáp án (Gemini)" description="Đề mới lấy về chưa có đáp án sẽ được AI giải theo prompt hướng dẫn giải đề." />
      <form onSubmit={onSubmit} className="space-y-5 p-5" noValidate>
        <FormError message={error} />

        <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4">
          <div>
            <div className="text-sm font-medium text-slate-800">Bật AI giải đề khi lấy đề</div>
            <div className="text-xs text-slate-500">Tắt thì đề mới có đáp án tạm là A. Có thể nhờ AI giải lại sau ở trang Đề thi.</div>
          </div>
          <Switch checked={enabled} onChange={setEnabled} label="Bật AI giải đề" />
        </div>

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
          hint="Ví dụ gemini-2.5-pro (chính xác hơn, chậm hơn) hoặc gemini-2.5-flash (nhanh, rẻ hơn)."
        />

        <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4">
          <div>
            <div className="text-sm font-medium text-slate-800">Cho AI tra Google khi giải</div>
            <div className="text-xs text-slate-500">Theo bước 4 của prompt (kiểm tra câu không chắc). Có thể làm chậm hơn.</div>
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
