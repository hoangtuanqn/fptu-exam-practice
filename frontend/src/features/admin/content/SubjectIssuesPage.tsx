import { useState } from "react";
import { adminApi } from "@/features/admin/api/admin.api";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { Button } from "@/shared/ui/Button";
import { Card, PageHeader } from "@/shared/ui/Card";
import { ErrorBox, Loading } from "@/shared/ui/Feedback";
import { Table, Td, Th, Thead, Tr } from "@/shared/ui/Table";

const KIND_LABEL: Record<string, string> = { NO_CHAPTER_NAMES: "Syllabus không có tên chương" };
const when = (iso: string) => new Date(iso).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

// Các môn mà người dùng không làm được Bộ đề theo chương vì syllabus thiếu tên chương. Bổ sung syllabus rồi bấm "Đã xử lý".
export default function SubjectIssuesPage() {
  const toast = useToast();
  const issues = useApi(() => adminApi.subjectIssues(), []);
  const [busy, setBusy] = useState<number | null>(null);

  const resolve = async (id: number) => {
    setBusy(id);
    try {
      await adminApi.resolveSubjectIssue(id);
      issues.reload();
    } catch (e) {
      toast.error(errorMessage(e, "Chưa cập nhật được"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Quản trị" title="Môn thiếu dữ liệu" description="Môn mà người dùng không làm được Bộ đề theo chương vì syllabus chưa có tên chương. Bổ sung syllabus rồi đánh dấu đã xử lý." />
      {issues.data ? (
        <Card>
          {issues.data.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-on-surface-variant">Chưa có môn nào bị báo thiếu dữ liệu.</p>
          ) : (
            <Table>
              <Thead>
                <Th>Môn</Th>
                <Th>Vấn đề</Th>
                <Th>Số lần gặp</Th>
                <Th>Lần cuối</Th>
                <Th />
              </Thead>
              <tbody>
                {issues.data.map((i) => (
                  <Tr key={i.id}>
                    <Td>
                      <span className="font-medium text-on-surface">{i.subjectCode}</span>
                      {i.subjectName && <span className="block text-xs text-on-surface-variant">{i.subjectName}</span>}
                    </Td>
                    <Td>{KIND_LABEL[i.kind] ?? i.kind}</Td>
                    <Td className="tabular-nums">{i.hits}</Td>
                    <Td className="whitespace-nowrap">{when(i.lastAt)}</Td>
                    <Td className="text-right">
                      <Button size="sm" variant="outlined" disabled={busy === i.id} onClick={() => void resolve(i.id)}>
                        Đã xử lý
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      ) : issues.loading ? (
        <Loading />
      ) : (
        <ErrorBox message={issues.error ?? "Không tải được danh sách"} onRetry={issues.reload} />
      )}
    </>
  );
}
