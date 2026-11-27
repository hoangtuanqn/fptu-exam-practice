import { useState, type FormEvent } from "react";
import { useApi } from "@/shared/hooks/useApi";
import { useUrlSearch } from "@/shared/hooks/useUrlSearch";
import { SearchStatusIcon } from "@/shared/ui/SearchStatusIcon";
import { useUrlState, toPage } from "@/shared/hooks/useUrlState";
import { ApiError } from "@/shared/api/client";
import { errorMessage } from "@/shared/api/errors";
import { Card, CardHeader } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Empty, FormError } from "@/shared/ui/Feedback";
import { QueryBoundary } from "@/shared/ui/QueryBoundary";
import { Pagination } from "@/shared/ui/Table";
import { Badge } from "@/shared/ui/Badge";
import { Modal, ModalActions } from "@/shared/ui/Modal";
import { formatCredit } from "@/shared/utils/formatters";
import { courseraApi, type CourseInput, type CourseraCourse } from "./coursera.api";

function CourseEditor({ course, onClose, onSaved }: { course: CourseraCourse | null; onClose: () => void; onSaved: () => void }) {
  const [data, setData] = useState({ title: course?.title ?? "", code: course?.code ?? "", url: course?.url ?? "", isActive: course?.isActive ?? true });
  const [price, setPrice] = useState(String(course?.price ?? 0));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setErrors({});
    const input: CourseInput = { title: data.title, code: data.code.trim() || null, url: data.url.trim() || null, isActive: data.isActive, price: Number(price) };
    try { await courseraApi.saveCourse(input, course?.id); onSaved(); }
    catch (err) {
      const conflict = err instanceof ApiError && err.status === 409;
      setError(conflict ? "Mã môn hoặc liên kết này đã có ở khóa học khác." : errorMessage(err));
      if (err instanceof ApiError) setErrors(err.errors ?? {});
    }
    finally { setBusy(false); }
  }
  return <Modal onClose={busy ? undefined : onClose}>
    <h2 className="md-headline-small">{course ? "Sửa khóa học" : "Thêm khóa học"}</h2>
    <form onSubmit={save} className="mt-5 space-y-4">
      <Input label="Tên khóa học" required maxLength={255} disabled={busy} value={data.title} error={errors.title} onChange={(e) => setData({ ...data, title: e.target.value })} />
      <Input label="Mã môn" placeholder="VD: SSL101c" maxLength={32} disabled={busy} value={data.code} error={errors.code} onChange={(e) => setData({ ...data, code: e.target.value })} />
      <Input label="Liên kết khóa học Coursera (không bắt buộc)" type="url" maxLength={500} disabled={busy} value={data.url} error={errors.url} onChange={(e) => setData({ ...data, url: e.target.value })} />
      <Input label="Giá khóa học (credit)" type="number" inputMode="numeric" min={0} step={1} required disabled={busy} value={price} error={errors.price} hint="Giá mới chỉ áp dụng cho đơn đặt sau khi lưu. Nhập 0 nếu miễn phí." onChange={(e) => setPrice(e.target.value)} />
      <label className="flex items-center gap-3"><input type="checkbox" disabled={busy} checked={data.isActive} onChange={(e) => setData({ ...data, isActive: e.target.checked })} />Nhận đơn cho khóa học này</label>
      <FormError message={error} />
      <ModalActions><Button type="button" disabled={busy} onClick={onClose}>Hủy</Button><Button type="submit" variant="primary" disabled={busy}>Lưu khóa học</Button></ModalActions>
    </form>
  </Modal>;
}

export function CourseManager() {
  const [url, setUrl] = useUrlState({ q: "", coursePage: "1" });
  const [search, setSearch, q, searchPending] = useUrlSearch(url.q, (patch) => setUrl({ q: patch.q, coursePage: "1" }));
  const page = toPage(url.coursePage);
  const query = useApi(() => courseraApi.courses(q, page, true), [q, page]);
  const [editor, setEditor] = useState<{ course: CourseraCourse | null } | null>(null);
  return <Card>
    <CardHeader title="Danh mục khóa học" action={<Button variant="primary" onClick={() => setEditor({ course: null })}>Thêm khóa học</Button>} />
    <div className="space-y-4 p-5">
      <Input label="Tìm khóa học" placeholder="Mã môn hoặc tên khóa học" maxLength={100} data-search value={search} onChange={(e) => setSearch(e.target.value)} trailing={<span className="pr-2 text-on-surface-variant"><SearchStatusIcon busy={searchPending || query.loading} size={18} /></span>} />
      <QueryBoundary query={query}>{(data) => <>
        {data.items.length ? <ul className="divide-y divide-outline-variant">{data.items.map((course) => <li key={course.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2">{course.code && <Badge>{course.code}</Badge>}<p className="break-words">{course.title}</p></div><p className="md-body-small text-on-surface-variant">{course.isActive ? "Đang nhận đơn" : "Tạm ngừng nhận đơn"}</p><p className="md-label-large">{course.price === undefined ? "Chưa có thông tin giá" : formatCredit(course.price)}</p></div>
          <Button disabled={query.loading} onClick={() => setEditor({ course })}>Chỉnh sửa</Button>
        </li>)}</ul> : q ? <Empty title="Không tìm thấy khóa học phù hợp" /> : <Empty title="Chưa có khóa học">Thêm khóa học để người dùng có thể tìm kiếm, đặt đơn.</Empty>}
        <Pagination meta={data.meta} onPage={(value) => setUrl({ coursePage: String(value) })} />
      </>}</QueryBoundary>
    </div>
    {editor && <CourseEditor course={editor.course} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); query.reload(); }} />}
  </Card>;
}
