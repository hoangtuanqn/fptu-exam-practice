import { useState, type FormEvent } from "react";
import { useApi } from "@/shared/hooks/useApi";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { useUrlState, toPage } from "@/shared/hooks/useUrlState";
import { ApiError } from "@/shared/api/client";
import { errorMessage } from "@/shared/api/errors";
import { Card, CardHeader } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Empty, FormError } from "@/shared/ui/Feedback";
import { QueryBoundary } from "@/shared/ui/QueryBoundary";
import { Pagination } from "@/shared/ui/Table";
import { Modal, ModalActions } from "@/shared/ui/Modal";
import { formatCredit } from "@/shared/utils/formatters";
import { courseraApi, type CourseInput, type CourseraCourse } from "./coursera.api";

function CourseEditor({ course, onClose, onSaved }: { course: CourseraCourse | null; onClose: () => void; onSaved: () => void }) {
  const [data, setData] = useState<CourseInput>({ title: course?.title ?? "", url: course?.url ?? "", isActive: course?.isActive ?? true, price: course?.price ?? 0 });
  const [price, setPrice] = useState(String(course?.price ?? 0));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setErrors({});
    try { await courseraApi.saveCourse({ title: data.title, url: data.url, isActive: data.isActive, price: Number(price) }, course?.id); onSaved(); }
    catch (err) { setError(errorMessage(err)); if (err instanceof ApiError) setErrors(err.errors ?? {}); }
    finally { setBusy(false); }
  }
  return <Modal onClose={busy ? undefined : onClose}>
    <h2 className="md-headline-small">{course ? "Sửa khóa học" : "Thêm khóa học"}</h2>
    <form onSubmit={save} className="mt-5 space-y-4">
      <Input label="Tên khóa học" required maxLength={255} disabled={busy} value={data.title} error={errors.title} onChange={(e) => setData({ ...data, title: e.target.value })} />
      <Input label="Liên kết khóa học Coursera" type="url" required maxLength={500} disabled={busy} value={data.url} error={errors.url} onChange={(e) => setData({ ...data, url: e.target.value })} />
      <Input label="Giá khóa học (credit)" type="number" inputMode="numeric" min={0} step={1} required disabled={busy} value={price} error={errors.price} hint="Giá mới chỉ áp dụng cho đơn đặt sau khi lưu. Nhập 0 nếu miễn phí." onChange={(e) => setPrice(e.target.value)} />
      <label className="flex items-center gap-3"><input type="checkbox" disabled={busy} checked={data.isActive} onChange={(e) => setData({ ...data, isActive: e.target.checked })} />Nhận đơn cho khóa học này</label>
      <FormError message={error} />
      <ModalActions><Button type="button" disabled={busy} onClick={onClose}>Hủy</Button><Button type="submit" variant="primary" disabled={busy}>Lưu khóa học</Button></ModalActions>
    </form>
  </Modal>;
}

export function CourseManager() {
  const [url, setUrl] = useUrlState({ q: "", coursePage: "1" });
  const q = useDebounce(url.q);
  const page = toPage(url.coursePage);
  const query = useApi(() => courseraApi.courses(q, page, true), [q, page]);
  const [editor, setEditor] = useState<{ course: CourseraCourse | null } | null>(null);
  return <Card>
    <CardHeader title="Danh mục khóa học" action={<Button variant="primary" onClick={() => setEditor({ course: null })}>Thêm khóa học</Button>} />
    <div className="space-y-4 p-5">
      <Input label="Tìm khóa học" maxLength={100} value={url.q} onChange={(e) => setUrl({ q: e.target.value, coursePage: "1" })} />
      <QueryBoundary query={query}>{(data) => <>
        {data.items.length ? <ul className="divide-y divide-outline-variant">{data.items.map((course) => <li key={course.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="min-w-0 flex-1"><p className="break-words">{course.title}</p><p className="md-body-small text-on-surface-variant">{course.isActive ? "Đang nhận đơn" : "Tạm ngừng nhận đơn"}</p><p className="md-label-large">{course.price === undefined ? "Chưa có thông tin giá" : formatCredit(course.price)}</p></div>
          <Button disabled={query.loading} onClick={() => setEditor({ course })}>Chỉnh sửa</Button>
        </li>)}</ul> : <Empty title="Chưa có khóa học">Thêm tên và liên kết khóa học để người dùng có thể tìm kiếm, đặt đơn.</Empty>}
        <Pagination meta={data.meta} onPage={(value) => setUrl({ coursePage: String(value) })} />
      </>}</QueryBoundary>
    </div>
    {editor && <CourseEditor course={editor.course} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); query.reload(); }} />}
  </Card>;
}
