import type { ReactNode } from "react";
import { ErrorBox, Loading } from "./Feedback";

interface Query<T> {
  data: T | null | undefined;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

// Ba trạng thái của một lần tải dữ liệu (useApi) ở một nơi: đang tải lần đầu -> Loading, lỗi -> ErrorBox có nút thử lại,
// có dữ liệu -> render children (mờ đi nhẹ khi đang tải lại, ví dụ đổi trang). Thay cho đoạn
// "x.loading && !x.data ? <Loading/> : x.error ? <ErrorBox/> : ..." lặp ở nhiều trang.
export function QueryBoundary<T>({ query, loadingLabel, children }: { query: Query<T>; loadingLabel?: string; children: (data: T) => ReactNode }) {
  if (query.loading && !query.data) return <Loading label={loadingLabel} />;
  if (query.error) return <ErrorBox message={query.error} onRetry={query.reload} />;
  if (!query.data) return null;
  return <div className={query.loading ? "opacity-60 transition" : "transition"}>{children(query.data)}</div>;
}
