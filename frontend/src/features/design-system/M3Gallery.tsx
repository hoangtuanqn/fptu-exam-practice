import { useState } from "react";
import { Check, Heart, Plus, Search, Settings } from "lucide-react";
import { Badge } from "@/shared/ui/Badge";
import { Button, Fab, IconButton } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { LinearProgress, Spinner } from "@/shared/ui/Feedback";
import { Input, PasswordInput } from "@/shared/ui/Input";
import { Modal, ModalActions, ModalTitle } from "@/shared/ui/Modal";
import { Segmented } from "@/shared/ui/Segmented";
import { Switch } from "@/shared/ui/Switch";
import { useToast } from "@/shared/context/ToastContext";
import { ThemeToggle } from "@/shared/theme/ThemeToggle";

// Trang xem thử bộ thiết kế Material Design 3 (chỉ có khi chạy `npm run dev`, đường dẫn /dev/m3). Dùng để rà màu, chữ, thành phần ở cả hai chủ đề.
const ROLES = [
  ["primary", "on-primary"], ["primary-container", "on-primary-container"],
  ["secondary", "on-secondary"], ["secondary-container", "on-secondary-container"],
  ["tertiary", "on-tertiary"], ["tertiary-container", "on-tertiary-container"],
  ["error", "on-error"], ["error-container", "on-error-container"],
  ["success", "on-success"], ["success-container", "on-success-container"],
  ["warning", "on-warning"], ["warning-container", "on-warning-container"],
  ["surface", "on-surface"], ["surface-container-low", "on-surface"], ["surface-container", "on-surface"],
  ["surface-container-high", "on-surface"], ["surface-container-highest", "on-surface"],
  ["inverse-surface", "inverse-on-surface"],
] as const;
const TYPE = ["display-large", "display-medium", "display-small", "headline-large", "headline-medium", "headline-small", "title-large", "title-medium", "title-small", "body-large", "body-medium", "body-small", "label-large", "label-medium", "label-small"];

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mt-10">
    <h2 className="md-title-large mb-4 text-on-surface">{title}</h2>
    {children}
  </section>
);

export default function M3Gallery() {
  const [dialog, setDialog] = useState(false);
  const [on, setOn] = useState(true);
  const [seg, setSeg] = useState("a");
  const toast = useToast();

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 text-on-surface">
      <div className="flex items-center justify-between">
        <h1 className="md-headline-medium">Material Design 3 · FEPass</h1>
        <ThemeToggle />
      </div>

      <Section title="Vai trò màu (cặp nền / chữ)">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {ROLES.map(([bg, fg]) => (
            <div key={bg} className="rounded-m3-sm p-3" style={{ background: `var(--md-sys-color-${bg})`, color: `var(--md-sys-color-${fg})` }}>
              <div className="md-label-large">{bg}</div>
              <div className="md-body-small opacity-90">Aa chữ {fg}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Bậc chữ">
        <div className="space-y-1">
          {TYPE.map((t) => (
            <div key={t} className={`md-${t} truncate`}>
              {t} · Luyện thi FE FPTU
            </div>
          ))}
        </div>
      </Section>

      <Section title="Hình dạng và độ nổi (tông)">
        <div className="flex flex-wrap gap-4">
          {["xs", "sm", "md", "lg", "xl", "full"].map((r) => (
            <div key={r} className={`rounded-m3-${r} flex h-16 w-24 items-center justify-center bg-secondary-container md-label-large text-on-secondary-container`}>
              {r}
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-4">
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <div key={n} className={`md-elevation-${n} flex h-16 w-24 items-center justify-center rounded-m3-md md-label-large`}>
              Mức {n}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Nút">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="filled">Filled</Button>
          <Button variant="tonal">Tonal</Button>
          <Button variant="outlined">Outlined</Button>
          <Button variant="text">Text</Button>
          <Button variant="elevated">Elevated</Button>
          <Button variant="filled" disabled>
            Disabled
          </Button>
          <Button variant="danger">Danger</Button>
          <IconButton label="Cài đặt">
            <Settings size={22} />
          </IconButton>
          <IconButton label="Thích" variant="filled">
            <Heart size={22} />
          </IconButton>
          <IconButton label="Tìm" variant="tonal">
            <Search size={22} />
          </IconButton>
          <Fab label="Thêm">
            <Plus size={24} />
          </Fab>
        </div>
      </Section>

      <Section title="Chip, nút phân đoạn, công tắc, tiến trình">
        <div className="flex flex-wrap items-center gap-3">
          <Badge>Neutral</Badge>
          <Badge tone="info">Info</Badge>
          <Badge tone="success">Thành công</Badge>
          <Badge tone="warning">Cảnh báo</Badge>
          <Badge tone="danger">Lỗi</Badge>
          <Segmented label="Mẫu" value={seg} onChange={setSeg} options={[{ value: "a", label: "Ngày" }, { value: "b", label: "Tuần" }, { value: "c", label: "Tháng" }]} />
          <Switch label="Công tắc" checked={on} onChange={setOn} />
          <Spinner size={28} />
        </div>
        <div className="mt-4 max-w-md space-y-3">
          <LinearProgress value={0.6} label="Tiến độ" />
          <LinearProgress label="Đang tải" />
        </div>
      </Section>

      <Section title="Ô nhập">
        <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
          <Input label="Email" type="email" placeholder="ban@example.com" hint="Dùng email trường" />
          <Input label="Họ tên" defaultValue="Phạm Hoàng Tuấn" />
          <PasswordInput label="Mật khẩu" />
          <Input label="Có lỗi" error="Email không hợp lệ" defaultValue="abc" />
        </div>
      </Section>

      <Section title="Thẻ">
        <div className="grid gap-4 sm:grid-cols-3">
          {(["elevated", "filled", "outlined"] as const).map((v) => (
            <Card key={v} variant={v} className="p-4">
              <div className="md-title-medium">{v}</div>
              <p className="md-body-medium mt-1 text-on-surface-variant">Thẻ {v} của Material Design 3.</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Hộp thoại và snackbar">
        <div className="flex gap-3">
          <Button variant="tonal" onClick={() => setDialog(true)}>
            Mở hộp thoại
          </Button>
          <Button variant="outlined" onClick={() => toast.success("Đã lưu thay đổi")}>
            Snackbar
          </Button>
          <Button variant="outlined" onClick={() => toast.error("Không kết nối được máy chủ")}>
            Snackbar lỗi
          </Button>
        </div>
      </Section>

      {dialog && (
        <Modal onClose={() => setDialog(false)}>
          <ModalTitle icon={Check}>Xác nhận</ModalTitle>
          <p className="md-body-medium mt-4 text-on-surface-variant">Hộp thoại M3: nền scrim, khung surface-container-high bo góc 28dp, nhốt phím Tab, Esc để đóng.</p>
          <ModalActions>
            <Button variant="text" onClick={() => setDialog(false)}>
              Hủy
            </Button>
            <Button variant="filled" onClick={() => setDialog(false)}>
              Đồng ý
            </Button>
          </ModalActions>
        </Modal>
      )}
    </div>
  );
}
