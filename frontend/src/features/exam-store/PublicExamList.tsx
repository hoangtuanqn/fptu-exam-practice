import { Link } from "react-router-dom";
import { BookOpen, Play } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { useApi } from "@/shared/hooks/useApi";
import { buttonClass } from "@/shared/ui/Button";
import { Empty } from "@/shared/ui/Feedback";
import { QueryBoundary } from "@/shared/ui/QueryBoundary";
import { Pagination } from "@/shared/ui/Table";
import { formatDate } from "@/shared/utils/formatters";
import { catalogApi, type CatalogItem } from "./catalog.api";
import { ExamFilterBar, useExamListQuery } from "./ExamFilterBar";

// Danh sách đề của một môn cho khách xem (trang Kho đề công khai và trang từng môn), không có khung ngoài: nơi dùng tự bọc Card.
// Chỉ có thông tin mô tả: tên, kỳ, ngày, số câu.
// Bấm lấy đề: khách đi đăng ký rồi quay lại Kho đề của môn này; thành viên vào thẳng Kho đề trong tài khoản (có xác nhận phí như cũ).
export function PublicExamList({ code }: { code: string }) {
  const { user } = useAuth();
  const query = useExamListQuery();
  const { url, setUrl, page } = query;
  const list = useApi(() => catalogApi.exams(code, { q: url.q, term: url.term, page }), [code, url.q, url.term, page, user?.id]);
  const target = `/account/exams?tab=subject&subject=${encodeURIComponent(code)}`;

  return (
    <div>
      <div className="space-y-3 border-b border-outline-variant px-5 py-4">
        <ExamFilterBar query={query} terms={list.data?.terms} />
      </div>
      <QueryBoundary query={list}>
        {(data) =>
          data.items.length === 0 ? (
            <Empty icon={BookOpen} title={data.total > 0 ? "Không có đề nào khớp" : "Chưa có đề nào của môn này"}>
              {data.total > 0 ? "Thử bỏ bộ lọc hoặc đổi từ khoá." : "Danh mục đề của môn này chưa được cập nhật."}
            </Empty>
          ) : (
            <>
              <ul className="divide-y divide-outline-variant">
                {data.items.map((e) => (
                  <li key={e.threadId} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="md-title-small truncate text-on-surface">{e.title}</p>
                      <p className="md-body-small flex flex-wrap items-center gap-x-3 text-on-surface-variant">
                        {e.postedAt && <span>{formatDate(e.postedAt)}</span>}
                        {e.questions !== null ? <span>{e.questions} câu</span> : null}
                      </p>
                    </div>
                    <ExamAction item={e} loggedIn={!!user} target={target} />
                  </li>
                ))}
              </ul>
              <Pagination meta={data.meta} onPage={(p) => setUrl({ page: String(p) })} />
            </>
          )
        }
      </QueryBoundary>
    </div>
  );
}

function ExamAction({ item, loggedIn, target }: { item: CatalogItem; loggedIn: boolean; target: string }) {
  const cls = buttonClass({ size: "sm", variant: "tonal" });
  if (item.status === "owned")
    return (
      <Link to={`/exam/${item.threadId}`} className={cls}>
        <Play size={15} /> Mở đề
      </Link>
    );
  // Chưa có trong kho: thành viên vào Kho đề của môn (có xác nhận phí trước khi trừ), khách đi đăng ký rồi quay lại đó
  return (
    <Link to={loggedIn ? target : "/register"} state={loggedIn ? undefined : { from: target }} className={cls}>
      <Play size={15} /> Mở đề
    </Link>
  );
}
