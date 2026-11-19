import { useState } from "react";
import { Crown, Loader2, PenLine } from "lucide-react";
import { planApi } from "@/features/plan/plan.api";
import { vnd } from "@/features/plan/pro/money";
import { ApiError } from "@/shared/api/client";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { Button } from "@/shared/ui/Button";
import { FormError } from "@/shared/ui/Feedback";
import { Field, Input, Select } from "@/shared/ui/Input";
import { Modal, ModalActions, ModalTitle } from "@/shared/ui/Modal";
import { marketingAdminApi, type Broadcast, type BroadcastSegment } from "./marketing.api";

export const SEGMENTS: { value: BroadcastSegment; label: string }[] = [
  { value: "all", label: "Tất cả thành viên đã xác minh" },
  { value: "pro", label: "Đang dùng Pro" },
  { value: "free", label: "Chưa dùng Pro" },
  { value: "inactive", label: "Không hoạt động từ N ngày" },
  { value: "exam_soon", label: "Có buổi thi trong 30 ngày" },
  { value: "upgrade", label: "Chưa có Pro hoặc Pro hết hạn trong 30 ngày" },
];

// Mẫu thư mời mua Pro theo đợt ưu đãi kỳ mới đang bật (giá, hạn chót lấy thật từ máy chủ); admin vẫn sửa được trước khi lưu
async function promoTemplate(): Promise<Partial<Form> | null> {
  const plan = await planApi.info();
  const p = plan.semesterPromo;
  if (!p || Date.parse(p.endsAt) <= Date.now()) return null;
  const end = new Date(p.endsAt).toLocaleDateString("vi-VN");
  return {
    subject: `Ưu đãi kỳ ${p.term}: Pro ${plan.months} tháng chỉ ${vnd(p.price)}`,
    body: [
      `Kỳ ${p.term} sắp bắt đầu. Từ nay tới hết ngày ${end}, gói Pro ${plan.months} tháng chỉ còn ${vnd(p.price)} thay vì ${vnd(p.originalPrice)} (giảm ${p.percentOff}%).`,
      "Với Pro, bạn lấy đề FuOverflow không bị trừ credit, xem giải thích AI cho mọi câu, ôn Sổ câu sai không giới hạn và xem đủ Câu hay ra của từng môn.",
      `Mỗi tài khoản được mua giá ưu đãi một lần. Sau ngày ${end}, giá trở lại ${vnd(p.originalPrice)}.`,
      ...(plan.ticket ? [`Chưa muốn dùng ngay? Bạn có thể mua vé Pro bây giờ để giữ giá, rồi kích hoạt khi vào kỳ (trong ${plan.ticket.validDays} ngày).`] : []),
    ].join("\n\n"),
    ctaLabel: "Xem ưu đãi Pro",
    ctaPath: "/pro",
    segment: "upgrade",
  };
}

export const segmentLabel = (b: Pick<Broadcast, "segment" | "segmentDays">) =>
  b.segment === "inactive" ? `Không hoạt động từ ${b.segmentDays ?? "N"} ngày` : (SEGMENTS.find((s) => s.value === b.segment)?.label ?? b.segment);

// Khớp với backend (BROADCAST_LIMITS, BROADCAST_INACTIVE_DAYS, INTERNAL_PATH)
const MAX = { subject: 120, body: 5000, ctaLabel: 40, ctaPath: 120 };
const DAYS = { min: 7, max: 180 };
const INTERNAL_PATH = /^\/(?!\/)[^\s\\]*$/;

interface Form {
  subject: string;
  body: string;
  ctaLabel: string;
  ctaPath: string;
  segment: BroadcastSegment;
  segmentDays: string;
}
type Errors = Partial<Record<keyof Form, string>>;

const oneLine = (v: string, max: number, label: string) => {
  const s = v.trim();
  if (!s) return `Chưa nhập ${label.toLowerCase()}`;
  if (s.length > max) return `${label} tối đa ${max} ký tự`;
  if (/[\r\n]/.test(s)) return `${label} chỉ một dòng`;
  return undefined;
};

function validate(f: Form): Errors {
  const e: Errors = {};
  e.subject = oneLine(f.subject, MAX.subject, "Tiêu đề");
  const body = f.body.trim();
  e.body = !body ? "Chưa nhập nội dung" : body.length > MAX.body ? `Nội dung tối đa ${MAX.body} ký tự` : undefined;
  e.ctaLabel = oneLine(f.ctaLabel, MAX.ctaLabel, "Nhãn nút");
  const path = f.ctaPath.trim();
  e.ctaPath = path.length > MAX.ctaPath || !INTERNAL_PATH.test(path) ? "Đường dẫn trong trang, bắt đầu bằng / (ví dụ /pro)" : undefined;
  if (f.segment === "inactive") {
    const n = Number(f.segmentDays);
    if (f.segmentDays.trim() === "" || !Number.isInteger(n) || n < DAYS.min || n > DAYS.max) e.segmentDays = `Nhập số ngày từ ${DAYS.min} đến ${DAYS.max}`;
  }
  return Object.fromEntries(Object.entries(e).filter(([, v]) => v)) as Errors;
}

export function BroadcastComposer({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState<Form>({ subject: "", body: "", ctaLabel: "", ctaPath: "/", segment: "all", segmentDays: "30" });
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverFields, setServerFields] = useState<Errors>({});
  const errors = touched ? { ...serverFields, ...validate(form) } : serverFields;
  const invalid = Object.keys(validate(form)).length > 0;

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setServerFields((s) => ({ ...s, [key]: undefined }));
  };

  const save = async () => {
    setTouched(true);
    if (invalid) return;
    setBusy(true);
    setServerError(null);
    try {
      await marketingAdminApi.createBroadcast({
        subject: form.subject.trim(),
        body: form.body.trim(),
        ctaLabel: form.ctaLabel.trim(),
        ctaPath: form.ctaPath.trim(),
        segment: form.segment,
        ...(form.segment === "inactive" && { segmentDays: Number(form.segmentDays) }),
      });
      toast.success("Đã lưu bản nháp");
      onCreated();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.errors) setServerFields(err.errors as Errors);
      setServerError(errorMessage(err, "Chưa lưu được bản nháp"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal wide onClose={onClose}>
      <ModalTitle icon={PenLine}>Soạn thông báo</ModalTitle>
      <form
        className="mt-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <Button
          type="button"
          size="sm"
          variant="tonal"
          disabled={busy}
          onClick={() =>
            void promoTemplate()
              .then((t) => (t ? setForm((f) => ({ ...f, ...t })) : toast.error("Chưa bật ưu đãi kỳ mới (hoặc đã hết hạn) ở trang Khuyến mãi")))
              .catch((err) => toast.error(errorMessage(err, "Chưa tải được thông tin ưu đãi")))
          }
        >
          <Crown size={15} /> Dùng mẫu ưu đãi kỳ mới
        </Button>
        <Input label="Tiêu đề thư" value={form.subject} maxLength={MAX.subject} onChange={(e) => set("subject", e.target.value)} error={errors.subject} />
        <Field label="Nội dung" error={errors.body} hint={`Văn bản thường, cách đoạn bằng dòng trống, không dùng HTML. ${form.body.trim().length}/${MAX.body}`}>
          <textarea
            value={form.body}
            rows={8}
            maxLength={MAX.body}
            onChange={(e) => set("body", e.target.value)}
            aria-invalid={errors.body ? true : undefined}
            className={`md-body-medium w-full rounded-m3-xs border bg-transparent px-4 py-3 text-on-surface outline-none md-motion focus:border-primary ${errors.body ? "border-error" : "border-outline hover:border-on-surface"}`}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Chữ trên nút" value={form.ctaLabel} maxLength={MAX.ctaLabel} onChange={(e) => set("ctaLabel", e.target.value)} error={errors.ctaLabel} />
          <Input
            label="Đường dẫn nút"
            value={form.ctaPath}
            maxLength={MAX.ctaPath}
            onChange={(e) => set("ctaPath", e.target.value)}
            error={errors.ctaPath}
            hint="Đường dẫn trong trang, ví dụ /pro"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Gửi cho" value={form.segment} onChange={(e) => set("segment", e.target.value as BroadcastSegment)} error={errors.segment}>
            {SEGMENTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
          {form.segment === "inactive" && (
            <Input
              label="Số ngày không hoạt động (N)"
              type="number"
              inputMode="numeric"
              min={DAYS.min}
              max={DAYS.max}
              value={form.segmentDays}
              onChange={(e) => set("segmentDays", e.target.value)}
              error={errors.segmentDays}
              hint={`Từ ${DAYS.min} đến ${DAYS.max} ngày`}
            />
          )}
        </div>
        {serverError && <FormError message={serverError} />}
        <ModalActions>
          <Button type="button" variant="text" disabled={busy} onClick={onClose}>
            Huỷ
          </Button>
          <Button type="submit" variant="primary" disabled={busy || (touched && invalid)}>
            {busy && <Loader2 size={16} className="animate-spin" />}
            Lưu bản nháp
          </Button>
        </ModalActions>
      </form>
    </Modal>
  );
}
