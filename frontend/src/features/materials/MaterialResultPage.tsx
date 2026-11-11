import { Link, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Clock, FileX } from "lucide-react";
import { useApi } from "@/shared/hooks/useApi";
import { buttonClass } from "@/shared/ui/Button";
import { Card, PageHeader } from "@/shared/ui/Card";
import { Empty } from "@/shared/ui/Feedback";
import { QueryBoundary } from "@/shared/ui/QueryBoundary";
import { formatDate } from "@/shared/utils/formatters";
import { ChapterSection } from "./ChapterSection";
import { isActive, materialsApi, type MaterialDetail } from "./materials.api";
import { usePolledData } from "./usePolledData";

const backLink = (
  <Link to="/account/materials" className={buttonClass({ variant: "text" })}>
    <ArrowLeft size={16} /> Danh sách file
  </Link>
);

// Kết quả phân tích một file slide: tóm tắt từng chương kèm số đề có chương đó
export default function MaterialResultPage() {
  const { id = "" } = useParams();
  const load = () => materialsApi.get(id).then((material) => ({ material }));
  const q = useApi(load, [id]);
  // Còn đang chờ/đang phân tích: hỏi lại ngầm tới khi xong hoặc lỗi
  const data = usePolledData(q.data, load, (d) => !!d.material && isActive(d.material));
  const query = { ...q, data };
  const title = data?.material?.title;
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Phân tích slide" title={title || "Kết quả phân tích"} description="Nội dung do AI tóm tắt từ slide, chỉ để tham khảo. Hãy đối chiếu lại với slide khi ôn." action={backLink} />
      <QueryBoundary query={query} loadingLabel="Đang tải kết quả…">
        {({ material }) => (material ? <Result m={material} /> : <Gone />)}
      </QueryBoundary>
    </div>
  );
}

function Gone() {
  return (
    <Card>
      <Empty icon={FileX} title="Không còn kết quả này">
        Kết quả có thể đã hết hạn và được xoá tự động, hoặc đã bị xoá.
      </Empty>
    </Card>
  );
}

function Result({ m }: { m: MaterialDetail }) {
  if (isActive(m)) {
    const total = m.progress?.total ?? 0;
    const done = m.progress?.done ?? 0;
    return (
      <Card>
        <Empty icon={Clock} title={m.status === "RUNNING" ? "Đang phân tích" : "Đang chờ phân tích"}>
          <p role="status">
            {m.status === "RUNNING" && total > 0 ? `Đã xong ${done}/${total}. ` : ""}Trang tự cập nhật khi có kết quả.
          </p>
        </Empty>
      </Card>
    );
  }
  if (m.status === "FAILED") {
    return (
      <Card>
        <Empty icon={AlertTriangle} title="Chưa phân tích được file này">
          {m.error?.trim() || "Bạn thử tải lên lại nhé."}
        </Empty>
      </Card>
    );
  }

  const chapters = Array.isArray(m.chapters) ? m.chapters : [];
  const unmatched = Math.max(0, m.unmatchedPages ?? 0);
  const anyLow = chapters.some((c) => c.stats?.confidence === "low");
  const expires = m.expiresAt && !Number.isNaN(Date.parse(m.expiresAt)) ? formatDate(m.expiresAt) : null;
  const subject = [m.subjectCode, m.subjectName].filter(Boolean).join(" · ");

  return (
    <Card>
      <div className="space-y-4 p-5">
        <p className="md-body-medium break-words text-on-surface-variant">
          {subject && (
            <>
              Môn <b className="text-on-surface">{subject}</b>
            </>
          )}
          {[subject ? "" : null, typeof m.pages === "number" && m.pages > 0 ? `${m.pages} trang` : null, expires ? `Kết quả tự xoá ngày ${expires}` : null]
            .filter((s): s is string => s !== null)
            .join(" · ")}
        </p>
        {anyLow && <p className="md-body-small rounded-m3-md bg-surface-container-low px-4 py-3 text-on-surface-variant">Mới có ít đề nên số đề có từng chương có thể còn thay đổi.</p>}
        {chapters.length === 0 ? (
          <Empty title="Chưa tách được chương nào từ slide này" />
        ) : (
          <ol className="space-y-3">
            {chapters.map((c, i) => (
              <ChapterSection key={`${c.number}-${i}`} chapter={c} subjectCode={m.subjectCode} />
            ))}
          </ol>
        )}
        {unmatched > 0 && <p className="md-body-small text-on-surface-variant">Có {unmatched} trang slide chưa xếp được vào chương nào.</p>}
      </div>
    </Card>
  );
}
