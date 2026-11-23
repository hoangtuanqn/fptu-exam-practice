import { termRank } from "./term";

/**
 * Thứ tự "mới nhất trước" của Kho đề theo môn, so lần lượt (thứ tự toàn phần, không phụ thuộc thứ tự đầu vào, không ném lỗi):
 * kỳ trong tên đề mới trước (không có kỳ xếp cuối), ngày đăng mới trước (không có ngày = 0), ID dài hơn trước, rồi ID lớn hơn trước.
 * threadId dạng số của các đề cũ tăng theo thời gian nên "dài hơn rồi lớn hơn" = đề đăng sau; đề tải tay ("m<hex>") chỉ cần thứ tự ổn định.
 */
export function catalogOrder(a: { term: string | null; threadId: string; postedAt: Date | null }, b: typeof a): number {
  return (
    (b.term ? termRank(b.term) : 0) - (a.term ? termRank(a.term) : 0) ||
    (b.postedAt?.getTime() ?? 0) - (a.postedAt?.getTime() ?? 0) ||
    b.threadId.length - a.threadId.length ||
    (b.threadId > a.threadId ? 1 : b.threadId < a.threadId ? -1 : 0)
  );
}
