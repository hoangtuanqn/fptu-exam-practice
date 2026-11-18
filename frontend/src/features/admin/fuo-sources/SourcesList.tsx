import { Link } from "react-router-dom";
import { Link2 } from "lucide-react";
import type { Paged } from "@/shared/types/api";
import { Badge, type Tone } from "@/shared/ui/Badge";
import { Empty } from "@/shared/ui/Feedback";
import { ExpandableText } from "@/shared/ui/ExpandableText";
import { Pagination, Table, Td, Th, Thead, Tr } from "@/shared/ui/Table";
import { formatDateTime } from "@/shared/utils/formatters";
import type { FuoSource, FuoSourceResult, FuoSourceStatus } from "./fuo-sources.api";

export const STATUS: Record<FuoSourceStatus, [string, Tone]> = {
  NEW: ["Chưa lấy", "neutral"],
  QUEUED: ["Đang chờ", "warning"],
  RUNNING: ["Đang lấy", "info"],
  DONE: ["Xong", "success"],
  FAILED: ["Lỗi", "danger"],
};

const RESULT: Record<FuoSourceResult, [string, Tone]> = {
  IMPORTED: ["Đã nhập", "success"],
  UPDATED: ["Đã cập nhật", "info"],
  UNCHANGED: ["Không đổi", "neutral"],
  ORDER_CHANGED: ["Cần kiểm tra thủ công", "warning"],
};

const StatusBadge = ({ s }: { s: FuoSource }) => <Badge tone={STATUS[s.status]?.[1] ?? "neutral"}>{STATUS[s.status]?.[0] ?? s.status}</Badge>;
const ResultBadge = ({ s }: { s: FuoSource }) => (s.result && RESULT[s.result] ? <Badge tone={RESULT[s.result][1]}>{RESULT[s.result][0]}</Badge> : null);
const AddedBadge = ({ s }: { s: FuoSource }) => (s.addedQuestions ? <Badge tone="warning">+{s.addedQuestions} câu mới, chưa có đáp án</Badge> : null);
const ExamLink = ({ s }: { s: FuoSource }) =>
  s.examId ? (
    <Link to={`/admin/exams/${s.examId}`} className="inline-flex min-h-10 items-center font-medium text-primary underline">
      Mở đề
    </Link>
  ) : null;
const Url = ({ s }: { s: FuoSource }) => (
  <a href={s.url} target="_blank" rel="noreferrer" className="break-all text-on-surface hover:underline">
    {s.url}
  </a>
);

// Bảng link đã lưu: trạng thái lần lấy gần nhất, kết quả, đề tương ứng
export function SourcesList({ data, onPage }: { data: Paged<FuoSource>; onPage: (p: number) => void }) {
  if (data.items.length === 0) return <Empty icon={Link2} title="Chưa có link nào" />;
  return (
    <>
      <ul className="divide-y divide-outline-variant md:hidden">
        {data.items.map((s) => (
          <li key={s.id} className="space-y-1 px-4 py-3">
            <div className="md-body-medium">
              <Url s={s} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge s={s} />
              <ResultBadge s={s} />
              <AddedBadge s={s} />
              <ExamLink s={s} />
            </div>
            {s.lastError && <ExpandableText text={s.lastError} className="md-body-small text-error" />}
            <div className="md-body-small text-on-surface-variant">{formatDateTime(s.processedAt ?? s.updatedAt)}</div>
          </li>
        ))}
      </ul>
      <div className="hidden md:block">
        <Table>
          <Thead>
            <Th>Link</Th>
            <Th>Trạng thái</Th>
            <Th>Kết quả</Th>
            <Th>Đề</Th>
            <Th>Cập nhật</Th>
          </Thead>
          <tbody>
            {data.items.map((s) => (
              <Tr key={s.id}>
                <Td className="w-full min-w-64">
                  <Url s={s} />
                  {s.lastError && <ExpandableText text={s.lastError} className="md-body-small text-error" />}
                </Td>
                <Td>
                  <StatusBadge s={s} />
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    <ResultBadge s={s} />
                    <AddedBadge s={s} />
                  </div>
                </Td>
                <Td className="whitespace-nowrap">
                  <ExamLink s={s} />
                </Td>
                <Td className="whitespace-nowrap text-on-surface-variant">{formatDateTime(s.processedAt ?? s.updatedAt)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </div>
      <Pagination meta={data.meta} onPage={onPage} />
    </>
  );
}
