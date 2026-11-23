import { Award } from "lucide-react";
import { badgesApi } from "@/features/badges/badges.api";
import { useApi } from "@/shared/hooks/useApi";
import { Card, PageHeader } from "@/shared/ui/Card";
import { Empty } from "@/shared/ui/Feedback";
import { QueryBoundary } from "@/shared/ui/QueryBoundary";
import { Table, Td, Th, Thead, Tr } from "@/shared/ui/Table";

// Thống kê huy hiệu (chỉ xem): số người đạt mỗi huy hiệu và theo từng bậc
export default function AdminBadgesPage() {
  const query = useApi(() => badgesApi.adminStats(), []);
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Người dùng" title="Huy hiệu" description="Số người đạt từng huy hiệu, chia theo bậc Đồng, Bạc, Vàng." />
      <Card>
        <QueryBoundary query={query}>
          {(d) =>
            d.length === 0 ? (
              <Empty icon={Award} title="Chưa có huy hiệu" />
            ) : (
              <Table>
                <Thead>
                  <Th>Huy hiệu</Th>
                  <Th className="text-right">Người đạt</Th>
                  <Th className="text-right">Đồng</Th>
                  <Th className="text-right">Bạc</Th>
                  <Th className="text-right">Vàng</Th>
                </Thead>
                <tbody>
                  {d.map((b) => (
                    <Tr key={b.key}>
                      <Td>
                        <div className="font-medium text-on-surface">{b.name}</div>
                        <div className="text-xs text-on-surface-variant">{b.key}</div>
                      </Td>
                      <Td className="text-right tabular-nums">{b.holders}</Td>
                      {[0, 1, 2].map((i) => (
                        <Td key={i} className="text-right tabular-nums">
                          {b.byTier?.[i] ?? 0}
                        </Td>
                      ))}
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )
          }
        </QueryBoundary>
      </Card>
    </div>
  );
}
