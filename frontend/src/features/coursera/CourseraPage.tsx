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

  const onCreated = (order: CourseraOrder) => {
    setCreated(order);
    setCourse(null);
    setRevision((value) => value + 1);
    setUrl({ orderPage: "1", status: "" });
  };

  return (
    <>
      <PageHeader title="Đặt đơn Coursera" description="Tìm khóa học, điền thông tin tài khoản và theo dõi tiến độ xử lý đơn." />

      {created && (
        <p role="status" className="md-body-medium mb-6 rounded-m3-md bg-success-container px-4 py-3 text-on-success-container">
          Đã nhận đơn #{created.id} cho khóa {created.courseTitle}. Bạn có thể theo dõi ở lịch sử bên dưới.
        </p>
      )}

      <div className="grid items-start gap-6 expanded:grid-cols-5">
        <Card className="expanded:col-span-3">
          <CardHeader title="Chọn khóa học" description="Tìm theo mã môn hoặc tên khóa, bấm Chọn để điền thông tin đặt đơn." />
          <CoursePicker
            onSelect={(value) => {
              setCourse(value);
              setCreated(null);
            }}
          />
        </Card>

        <div className="expanded:col-span-2">
          {course ? (
            <OrderForm key={course.id} course={course} onBack={() => setCourse(null)} onCreated={onCreated} />
          ) : (
            <Card>
              <CardHeader title="Thông tin đặt đơn" />
              <p className="md-body-medium p-5 text-on-surface-variant">Chọn một khóa học ở danh sách để điền tài khoản Coursera và đặt đơn.</p>
            </Card>
          )}
        </div>
      </div>

      <div className="mt-6">
        <OrderHistory revision={revision} />
      </div>
    </>
  );
}
