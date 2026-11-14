import { PageHeader } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { useUrlState } from "@/shared/hooks/useUrlState";
import { CourseManager } from "./CourseManager";
import { OrderHistory } from "./OrderHistory";

export default function AdminCourseraPage() {
  const [url, setUrl] = useUrlState({ tab: "orders" });
  const courses = url.tab === "courses";
  return <div className="space-y-6">
    <PageHeader title="Quản lý Coursera" description="Quản lý khóa học nhận đơn và xử lý yêu cầu của thành viên." />
    <div className="flex flex-wrap gap-3">
      <Button variant={courses ? "outlined" : "tonal"} aria-pressed={!courses} onClick={() => setUrl({ tab: "orders" })}>Đơn hàng</Button>
      <Button variant={courses ? "tonal" : "outlined"} aria-pressed={courses} onClick={() => setUrl({ tab: "courses" })}>Khóa học</Button>
    </div>
    {courses ? <CourseManager /> : <OrderHistory admin />}
  </div>;
}
