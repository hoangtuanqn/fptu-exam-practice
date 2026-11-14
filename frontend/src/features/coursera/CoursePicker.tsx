import { useState } from "react";
import { useApi } from "@/shared/hooks/useApi";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { useUrlState, toPage } from "@/shared/hooks/useUrlState";
import { Input } from "@/shared/ui/Input";
import { Button } from "@/shared/ui/Button";
import { QueryBoundary } from "@/shared/ui/QueryBoundary";
import { Empty } from "@/shared/ui/Feedback";
import { Pagination } from "@/shared/ui/Table";
import { Badge } from "@/shared/ui/Badge";
import { formatCredit } from "@/shared/utils/formatters";
import { courseraApi, type CourseraCourse } from "./coursera.api";

export function CoursePicker({ onSelect }: { onSelect: (course: CourseraCourse) => void }) {
  const [url, setUrl] = useUrlState({ q: "", coursePage: "1" });
  const [search, setSearch] = useState(url.q);
  const q = useDebounce(search);
  const page = toPage(url.coursePage);
  const query = useApi(() => courseraApi.courses(q, page), [q, page]);
  return <div className="space-y-4">
    <Input label="Tìm kiếm khóa học" placeholder="Mã môn (VD: SSL101c) hoặc tên khóa học" value={search} maxLength={100} onChange={(e) => { setSearch(e.target.value); setUrl({ q: e.target.value, coursePage: "1" }); }} />
    <QueryBoundary query={query}>{(data) => <>
      {data.items.length ? <ul className="divide-y divide-outline-variant">{data.items.map((course) => <li key={course.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {course.code && <Badge>{course.code}</Badge>}
            {course.url ? <a href={course.url} target="_blank" rel="noreferrer" className="break-words text-primary underline">{course.title}</a> : <span className="break-words">{course.title}</span>}
          </div>
          <p className="md-label-large mt-1">{course.price === undefined ? "Chưa có thông tin giá" : formatCredit(course.price)}</p>
        </div>
        <Button type="button" size="sm" disabled={query.loading || course.price === undefined} onClick={() => onSelect(course)}>Chọn khóa học</Button>
      </li>)}</ul> : <Empty title={q ? "Không tìm thấy khóa học phù hợp" : "Chưa có khóa học nhận đơn"} />}
      <Pagination meta={data.meta} onPage={(value) => setUrl({ coursePage: String(value) })} />
    </>}</QueryBoundary>
  </div>;
}
