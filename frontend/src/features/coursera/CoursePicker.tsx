import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { useApi } from "@/shared/hooks/useApi";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { useUrlState, toPage } from "@/shared/hooks/useUrlState";
import { Input } from "@/shared/ui/Input";
import { QueryBoundary } from "@/shared/ui/QueryBoundary";
import { Empty } from "@/shared/ui/Feedback";
import { Pagination } from "@/shared/ui/Table";
import { Badge } from "@/shared/ui/Badge";
import { formatCredit } from "@/shared/utils/formatters";
import { courseraApi, type CourseraCourse } from "./coursera.api";

const priceText = (course: CourseraCourse) => (course.price === undefined ? "Chưa có giá" : formatCredit(course.price));

// Mỗi trang chỉ 8 môn (2 cột x 4 hàng) để khối nhập tài khoản bên dưới không bị đẩy xuống xa
const PAGE_LIMIT = 8;

// Danh sách khóa học đang nhận đơn: lưới 2 cột (1 cột trên điện thoại), bấm vào một môn để chọn
export function CoursePicker({ selectedId, onSelect }: { selectedId?: number; onSelect: (course: CourseraCourse) => void }) {
  const [url, setUrl] = useUrlState({ q: "", coursePage: "1" });
  const [search, setSearch] = useState(url.q);
  const q = useDebounce(search);
  const page = toPage(url.coursePage);
  const query = useApi(() => courseraApi.courses(q, page, false, PAGE_LIMIT), [q, page]);

  return (
    <>
      <div className="border-b border-outline-variant p-5">
        <Input
          label="Tìm khóa học"
          placeholder="Mã môn (VD: SSL101c) hoặc tên khóa học"
          value={search}
          maxLength={100}
          onChange={(e) => {
            setSearch(e.target.value);
            setUrl({ q: e.target.value, coursePage: "1" });
          }}
        />
      </div>
      <QueryBoundary query={query}>
        {(data) =>
          data.items.length > 0 ? (
            <>
              <ul className="grid gap-3 p-5 sm:grid-cols-2">
                {data.items.map((course) => {
                  const selected = course.id === selectedId;
                  return (
                    <li key={course.id}>
                      <button
                        type="button"
                        disabled={course.price === undefined}
                        aria-pressed={selected}
                        onClick={() => onSelect(course)}
                        className={`md-state md-motion flex h-full w-full flex-col items-start gap-2 rounded-m3-md border p-4 text-left disabled:opacity-50 ${
                          selected ? "border-primary bg-secondary-container text-on-secondary-container" : "border-outline-variant text-on-surface"
                        }`}
                      >
                        <span className="flex w-full items-center justify-between gap-2">
                          {course.code ? <Badge tone="info">{course.code}</Badge> : <span />}
                          <span className="md-label-large tabular-nums">{priceText(course)}</span>
                        </span>
                        <span className="md-body-medium line-clamp-2 break-words">{course.title}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <Pagination meta={data.meta} onPage={(value) => setUrl({ coursePage: String(value) })} />
            </>
          ) : (
            <Empty icon={GraduationCap} title={q ? "Không tìm thấy khóa học phù hợp" : "Chưa có khóa học nhận đơn"} />
          )
        }
      </QueryBoundary>
    </>
  );
}
