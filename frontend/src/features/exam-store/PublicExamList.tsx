import { BookOpen } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { useApi } from "@/shared/hooks/useApi";
import { Empty } from "@/shared/ui/Feedback";
import { QueryBoundary } from "@/shared/ui/QueryBoundary";
import { Pagination } from "@/shared/ui/Table";
import { formatCredit } from "@/shared/utils/formatters";
import { examOpenPath } from "@/features/exam/types";
import { ExamRow } from "./ExamRow";
import { catalogApi, type CatalogItem } from "./catalog.api";
import { isPro } from "@/shared/utils/pro";
import { ExamFilterBar, useExamListQuery } from "./ExamFilterBar";

// Danh sách đề của một môn cho khách xem (trang Kho đề công khai và trang từng môn), không có khung ngoài: nơi dùng tự bọc Card.
// Chỉ có thông tin mô tả: tên, kỳ, ngày, số câu.
// Bấm mở đề: khách đi đăng ký rồi quay lại Kho đề của môn này; thành viên vào thẳng Kho đề trong tài khoản (có xác nhận phí như cũ).
export function PublicExamList({ code, pageSize }: { code: string; pageSize?: number }) {
  const { user } = useAuth();
  const query = useExamListQuery();
  const { url, setUrl, page } = query;
  const list = useApi(() => catalogApi.exams(code, { q: url.q, term: url.term, kind: url.kind, page, limit: pageSize }), [code, url.q, url.term, url.kind, page, pageSize, user?.id]);
  const target = `/kho-de?subject=${encodeURIComponent(code)}`;
  // Đã có trong kho: vào làm; thành viên chưa có: xem thử vài câu đầu hoặc trang khoá, rồi mới trả phí; khách: đăng ký rồi quay lại đây
  const linkOf = (e: CatalogItem) =>
    e.status === "owned" ? { to: examOpenPath({ id: e.examId!, kind: e.kind, totalQuestions: e.questions }) } : user ? { to: `/exam/${e.examId}` } : { to: "/register", state: { from: target } };
  const fee = (e: CatalogItem) => (e.status === "owned" || isPro(user) || !list.data ? 0 : e.kind === "PE" ? (list.data.pePrice ?? list.data.price) : list.data.price);

  return (
    <div>
      <div className="space-y-3 border-b border-outline-variant px-5 py-4">
        <ExamFilterBar query={query} terms={list.data?.terms} loading={list.loading} />
      </div>
      <QueryBoundary query={list}>
        {(res) => {
          // Chỉ hiện đề đã có trong hệ thống (máy chủ cũ còn trả mục chưa có đề)
          const data = { ...res, items: res.items.filter((e) => !!e.examId) };
          return data.items.length === 0 ? (
            <Empty icon={BookOpen} title={data.total > 0 ? "Không có đề nào khớp" : "Chưa có đề nào của môn này"}>
              {data.total > 0 ? "Thử bỏ bộ lọc hoặc đổi từ khoá." : "Môn này chưa có đề, bạn quay lại sau nhé."}
            </Empty>
          ) : (
            <>
              <ul className="divide-y divide-outline-variant">
                {data.items.map((e) => (
                  <ExamRow key={e.examId} item={e} known={!!user} {...linkOf(e)} hint={fee(e) > 0 ? formatCredit(fee(e)) : undefined} />
                ))}
              </ul>
              <Pagination meta={data.meta} onPage={(p) => setUrl({ page: String(p) })} />
            </>
          );
        }}
      </QueryBoundary>
    </div>
  );
}
