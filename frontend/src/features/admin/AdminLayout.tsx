import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { PanelLayout } from "@/shared/layout/PanelLayout";
import { ADMIN_NAV } from "@/features/admin/admin.routes";
import { NoticeBell } from "@/features/admin/notices/NoticeBell";
import { refreshReviewCounts, useReviewCounts } from "@/features/admin/review-counts.store";

// Khung trang quản trị: menu kèm badge số báo cáo đáp án và đánh giá AI chưa xử lý
export function AdminLayout() {
  const { pathname } = useLocation();
  const { reports, feedback, contributions = 0 } = useReviewCounts();
  useEffect(() => void refreshReviewCounts(), [pathname]);

  const items = useMemo(
    () =>
      ADMIN_NAV.map((it) =>
        it.to === "/admin/reports"
          ? { ...it, badge: { count: reports, label: `${reports} báo cáo chưa xử lý` } }
          : it.to === "/admin/explanation-feedback"
            ? { ...it, badge: { count: feedback, label: `${feedback} đánh giá chưa xử lý` } }
            : it.to === "/admin/contributions"
              ? { ...it, badge: { count: contributions, label: `${contributions} đề chờ duyệt` } }
              : it,
      ),
    [reports, feedback, contributions],
  );

  return <PanelLayout title="Quản trị" items={items} collapsible actions={<NoticeBell />} />;
}
