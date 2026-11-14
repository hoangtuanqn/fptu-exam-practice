import { useState } from "react";
import { Card, CardHeader, PageHeader } from "@/shared/ui/Card";
import { useUrlState } from "@/shared/hooks/useUrlState";
import { CoursePicker } from "./CoursePicker";
import { OrderForm } from "./OrderForm";
import { OrderHistory } from "./OrderHistory";
import type { CourseraCourse, CourseraOrder } from "./coursera.api";

export default function CourseraPage() {
  const [course, setCourse] = useState<CourseraCourse | null>(null);
  const [created, setCreated] = useState<CourseraOrder | null>(null);
  const [revision, setRevision] = useState(0);
  const [, setUrl] = useUrlState({ orderPage: "1", status: "" });
  return <div className="space-y-6">
    <PageHeader title="Đặt đơn Coursera" description="Tìm khóa học, điền thông tin tài khoản và theo dõi tiến độ xử lý đơn tại FEPass." />
    {created && <p role="status" className="rounded-m3-sm bg-secondary-container p-4 text-on-secondary-container">Đã nhận đơn #{created.id} cho khóa {created.courseTitle}. Bạn có thể theo dõi bên dưới.</p>}
    {course ? <OrderForm key={course.id} course={course} onBack={() => setCourse(null)} onCreated={(order) => { setCreated(order); setCourse(null); setRevision((value) => value + 1); setUrl({ orderPage: "1", status: "" }); }} /> : <Card>
      <CardHeader title="Chọn khóa học" />
      <div className="p-5"><CoursePicker onSelect={(value) => { setCourse(value); setCreated(null); }} /></div>
    </Card>}
    <OrderHistory revision={revision} />
  </div>;
}
