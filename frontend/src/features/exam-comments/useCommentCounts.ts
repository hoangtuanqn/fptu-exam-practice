import { ApiError } from "@/shared/api/client";
import { useApi } from "@/shared/hooks/useApi";
import { commentApi } from "./exam-comments.api";

// Số bình luận theo đích (câu "5", tệp đính kèm "-12") của một đề. null = không có thảo luận ở đây (404 do không có quyền hoặc máy chủ cũ, hay lỗi lần đầu)
export function useCommentCounts(examId: string) {
  const query = useApi(async () => {
    try {
      return (await commentApi.counts(examId)).counts ?? {};
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  }, [examId]);
  return { counts: query.data, reload: query.reload };
}
