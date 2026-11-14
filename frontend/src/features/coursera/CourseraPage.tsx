import { useRef, useState } from "react";
import { Card, CardHeader, PageHeader } from "@/shared/ui/Card";
import { useUrlState } from "@/shared/hooks/useUrlState";
import { CoursePicker } from "./CoursePicker";
import { OrderForm } from "./OrderForm";
import { LinkLookup } from "./LinkLookup";
import { OrderHistory } from "./OrderHistory";
import type { CourseraCourse, CourseraOrder } from "./coursera.api";

export default function CourseraPage() {
  const [course, setCourse] = useState<CourseraCourse | null>(null);
  const [created, setCreated] = useState<CourseraOrder | null>(null);
  const [revision, setRevision] = useState(0);
  const formRef = useRef<HTMLDivElement>(null);
  const [, setUrl] = useUrlState({ orderPage: "1", status: "" });

  const onCreated = (order: CourseraOrder) => {
    setCreated(order);
    setCourse(null);
    setRevision((value) => value + 1);
    setUrl({ orderPage: "1", status: "" });
  };

  const select = (value: CourseraCourse) => {
    setCourse(value);
    setCreated(null);
    // Đưa form nhập tài khoản vào tầm nhìn sau khi chọn môn
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <>
      <PageHeader title="Đặt đơn Coursera" description="Tìm khóa học, điền thông tin tài khoản và theo dõi tiến độ xử lý đơn." />

      {created && (
        <p role="status" className="md-body-medium mb-6 rounded-m3-md bg-success-container px-4 py-3 text-on-success-container">
          Đã nhận đơn #{created.id} cho khóa {created.courseTitle}. Bạn có thể theo dõi ở lịch sử bên dưới.
        </p>
      )}

      <Card>
        <CardHeader title="Chọn khóa học" description="Tìm theo mã môn hoặc tên khóa, bấm vào một môn để điền thông tin đặt đơn bên dưới." />
        <CoursePicker selectedId={course?.id} onSelect={select} />
      </Card>

      <div className="mt-6">
        <Card>
          <CardHeader title="Nhập link khóa học" description="Không thấy khóa trong danh sách? Dán link khóa học trên Coursera để kiểm tra." />
          <LinkLookup onSelect={select} />
        </Card>
      </div>

      <div ref={formRef} className="mt-6 scroll-mt-20">
        {course ? (
          <OrderForm key={course.id} course={course} onBack={() => setCourse(null)} onCreated={onCreated} />
        ) : (
          <Card>
            <CardHeader title="Thông tin đặt đơn" />
            <p className="md-body-medium p-5 text-on-surface-variant">Chọn một khóa học ở danh sách trên để điền tài khoản Coursera và đặt đơn.</p>
          </Card>
        )}
      </div>

      <div className="mt-6">
        <OrderHistory revision={revision} />
      </div>
    </>
  );
}
