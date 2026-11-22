import { useEffect } from "react";
import { adminApi } from "@/features/admin/api/admin.api";
import { useApi } from "@/shared/hooks/useApi";
import { onServerEvent } from "@/shared/realtime/socket";
import { EVENTS } from "@/shared/realtime/events";
import { Card, CardHeader, PageHeader, StatCard, StatGrid } from "@/shared/ui/Card";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import { Table, Td, Th, Thead, Tr } from "@/shared/ui/Table";

// Ai đang online và đang xem trang nào. Danh sách tự cập nhật khi server báo có thay đổi (không hỏi định kỳ).
export default function OnlinePage() {
  const { data, error, loading, reload } = useApi(() => adminApi.presence(), []);
  useEffect(() => onServerEvent(EVENTS.presence, reload), [reload]);

  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "Không có dữ liệu"} onRetry={reload} />;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Người dùng" title="Đang online" description="Thành viên và khách đang mở trang web, kèm trang họ đang xem. Mở nhiều tab thì hiện nhiều trang." />
      <StatGrid>
        <StatCard label="Thành viên online" value={data.total} tone="emerald" />
        <StatCard label="Khách online" value={data.guests} tone="slate" />
      </StatGrid>
      <Card>
        <CardHeader title="Thành viên" />
        {data.users.length === 0 ? (
          <Empty title="Chưa có thành viên nào online" />
        ) : (
          <Table>
            <Thead>
              <Th>Thành viên</Th>
              <Th>Đang xem</Th>
            </Thead>
            <tbody>
              {data.users.map((u) => (
                <Tr key={u.userId}>
                  <Td>
                    <div className="font-medium text-slate-800">{u.fullName || "(chưa có tên)"}</div>
                    <div className="text-xs text-slate-500">{u.email}</div>
                  </Td>
                  <Td className="font-mono text-xs">{u.pages.join(" · ")}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
