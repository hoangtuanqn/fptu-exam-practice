import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { useApi } from "@/shared/hooks/useApi";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { useUrlState, toPage } from "@/shared/hooks/useUrlState";
import { Input } from "@/shared/ui/Input";
import { Button } from "@/shared/ui/Button";
import { QueryBoundary } from "@/shared/ui/QueryBoundary";
import { Empty } from "@/shared/ui/Feedback";
import { Pagination, Table, Td, Th, Thead, Tr } from "@/shared/ui/Table";
import { Badge } from "@/shared/ui/Badge";
import { formatCredit } from "@/shared/utils/formatters";
import { courseraApi, type CourseraCourse } from "./coursera.api";

const priceText = (course: CourseraCourse) => (course.price === undefined ? "Chưa có giá" : formatCredit(course.price));

function CourseTitle({ course }: { course: CourseraCourse }) {
  if (!course.url) return <span className="break-words text-on-surface">{course.title}</span>;
  return (
    <a href={course.url} target="_blank" rel="noreferrer" className="break-words text-primary underline">
      {course.title}
    </a>
  );
}

// Danh sách khóa học đang nhận đơn: điện thoại là danh sách gọn, máy tính là bảng
export function CoursePicker({ onSelect }: { onSelect: (course: CourseraCourse) => void }) {
  const [url, setUrl] = useUrlState({ q: "", coursePage: "1" });
  const [search, setSearch] = useState(url.q);
  const q = useDebounce(search);
  const page = toPage(url.coursePage);
  const query = useApi(() => courseraApi.courses(q, page), [q, page]);

  const selectButton = (course: CourseraCourse) => (
    <Button
      type="button"
      variant="tonal"
      disabled={query.loading || course.price === undefined}
      onClick={() => onSelect(course)}
      aria-label={`Chọn khóa ${course.code ?? course.title}`}
    >
      Chọn
    </Button>
  );

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
              <ul className="divide-y divide-outline-variant md:hidden">
                {data.items.map((course) => (
                  <li key={course.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0 space-y-1">
                      {course.code && <Badge tone="info">{course.code}</Badge>}
                      <div className="md-body-medium">
                        <CourseTitle course={course} />
                      </div>
                      <div className="md-label-large tabular-nums text-on-surface">{priceText(course)}</div>
                    </div>
                    {selectButton(course)}
                  </li>
                ))}
              </ul>
              <div className="hidden md:block">
                <Table>
                  <Thead>
                    <Th>Mã môn</Th>
                    <Th>Khóa học</Th>
                    <Th className="text-right">Phí</Th>
                    <Th className="text-right">
                      <span className="sr-only">Thao tác</span>
                    </Th>
                  </Thead>
                  <tbody>
                    {data.items.map((course) => (
                      <Tr key={course.id}>
                        <Td>{course.code ? <Badge tone="info">{course.code}</Badge> : "—"}</Td>
                        <Td>
                          <CourseTitle course={course} />
                        </Td>
                        <Td className="whitespace-nowrap text-right font-medium tabular-nums">{priceText(course)}</Td>
                        <Td className="text-right">{selectButton(course)}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </div>
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
