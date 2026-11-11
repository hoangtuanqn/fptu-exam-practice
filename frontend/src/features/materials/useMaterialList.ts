import { useApi } from "@/shared/hooks/useApi";
import { isActive, materialsApi } from "./materials.api";
import { usePolledData } from "./usePolledData";

// Danh sách file đã tải lên; hỏi lại ngầm khi còn file đang chờ/đang phân tích
export function useMaterialList() {
  const q = useApi(() => materialsApi.list(), []);
  const data = usePolledData(q.data, materialsApi.list, (items) => items.some(isActive));
  const items = data ?? [];
  return { query: { ...q, data }, items, active: items.some(isActive), reload: q.reload };
}
