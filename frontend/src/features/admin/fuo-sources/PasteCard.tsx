import { useState } from "react";
import { Save } from "lucide-react";
import { useSubmit } from "@/shared/hooks/useSubmit";
import { Button } from "@/shared/ui/Button";
import { Card, CardHeader } from "@/shared/ui/Card";
import { FormError, Spinner } from "@/shared/ui/Feedback";
import { Field } from "@/shared/ui/Input";
import { fuoSourcesApi, type FuoSourcesAddResult } from "./fuo-sources.api";

// Ô dán danh sách link (mỗi dòng một link) và kết quả lưu: số link mới/đã có, các dòng lỗi và dòng trùng
export function PasteCard({ onSaved }: { onSaved: () => void }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<FuoSourcesAddResult | null>(null);
  const submit = useSubmit("Chưa lưu được danh sách", ["text"]);

  const save = () =>
    submit.run(async () => {
      const r = await fuoSourcesApi.add(text);
      setResult(r);
      if (!r.rejected?.length) setText(""); // còn dòng lỗi thì giữ lại để sửa
      onSaved();
    });

  return (
    <Card>
      <CardHeader title="Thêm link đề" description="Dán link bài viết FuOverflow, mỗi dòng một link. Link đã có sẽ không bị thêm lại." />
      <form
        className="space-y-3 px-5 py-4"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <Field label="Danh sách link" error={submit.fieldErrors.text}>
          <textarea
            value={text}
            rows={6}
            onChange={(e) => setText(e.target.value)}
            placeholder="https://fuoverflow.com/threads/..."
            aria-invalid={submit.fieldErrors.text ? true : undefined}
            className={`md-body-medium w-full rounded-m3-xs border bg-transparent px-4 py-3 text-on-surface outline-none md-motion focus:border-primary ${submit.fieldErrors.text ? "border-error" : "border-outline hover:border-on-surface"}`}
          />
        </Field>
        <FormError message={submit.error} />
        <Button type="submit" variant="tonal" disabled={submit.loading || !text.trim()}>
          {submit.loading ? <Spinner size={18} className="text-current" /> : <Save size={18} />}
          Lưu danh sách
        </Button>
        {result && <AddSummary result={result} />}
      </form>
    </Card>
  );
}

function AddSummary({ result }: { result: FuoSourcesAddResult }) {
  const rejected = result.rejected ?? [];
  const duplicates = result.duplicates ?? [];
  return (
    <div role="status" className="md-body-medium space-y-2 rounded-m3-sm bg-surface-container px-4 py-3 text-on-surface">
      <p>
        {result.accepted} link hợp lệ: {result.added} mới, {result.existing} đã có.
        {rejected.length > 0 && ` ${rejected.length} dòng lỗi.`}
        {duplicates.length > 0 && ` ${duplicates.length} dòng trùng.`}
      </p>
      {rejected.length > 0 && (
        <details open>
          <summary className="cursor-pointer py-2.5 text-error">Dòng lỗi ({rejected.length})</summary>
          <ul className="mt-1 max-h-60 space-y-1 overflow-y-auto">
            {rejected.map((r) => (
              <li key={r.line} className="break-all">
                <span className="font-medium">Dòng {r.line}:</span> {r.text}
                <span className="md-body-small block text-on-surface-variant">{r.reason}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
      {duplicates.length > 0 && (
        <details>
          <summary className="cursor-pointer py-2.5 text-on-surface-variant">Dòng trùng ({duplicates.length})</summary>
          <ul className="mt-1 max-h-60 space-y-1 overflow-y-auto">
            {duplicates.map((d) => (
              <li key={d.line}>
                Dòng {d.line} trùng dòng {d.sameAs}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
