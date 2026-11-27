import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { ApiError } from "@/shared/api/client";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { useConfirm } from "@/shared/ui/ConfirmDialog";
import type { Paged } from "@/shared/types/api";
import type { CommentActions } from "./CommentThread";
import { commentApi, EXAM_TARGET, reactionOf, type CommentInput, type CommentOrder, type ExamComment } from "./exam-comments.api";

const FIND_REPLY_ROOTS = 10; // tìm phản hồi được nhắc tới trong phản hồi của chừng này bình luận gốc đầu tiên
const HIGHLIGHT_MS = 4000;

// 404 = bình luận không dùng được ở đây
export async function orGone<T>(p: Promise<T>): Promise<T | "gone"> {
  try {
    return await p;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return "gone";
    throw err;
  }
}

interface List {
  items: ExamComment[];
  page: number;
  totalPages: number;
  total: number;
}

interface Options {
  examId: string;
  question: number;
  order?: CommentOrder; // "oldest": bình luận mới gửi nằm cuối danh sách; không có thì lên đầu
  focusComment?: string | null; // mở từ thông báo: cuộn tới bình luận / phản hồi này nếu tìm thấy
  gateWhat: string; // "thích và bình luận"...: dùng trong lời nhắc đăng nhập / xác minh
  onChanged: () => void; // số bình luận của đích đổi
  onPosted?: () => void; // vừa gửi bình luận hoặc phản hồi (khung câu hỏi tải lại bình chọn)
}

// Danh sách bình luận gốc của một đích (câu, tệp, cả đề) cùng các thao tác: gửi, thích, báo cáo, xoá, tải thêm, mở từ thông báo
export function useCommentList({ examId, question, order, focusComment, gateWhat, onChanged, onPosted }: Options) {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { confirm, confirmDialog } = useConfirm();
  const canAct = !!user?.emailVerifiedAt;
  const from = location.pathname + location.search;

  // Máy chủ cũ chưa nhận đích 0 (bình luận chung) trả 422 thay vì 404: cũng coi là không dùng được
  const first = useApi(
    () =>
      orGone(commentApi.list(examId, question, 1, order)).catch((err: unknown) => {
        if (question === EXAM_TARGET && err instanceof ApiError && err.status === 422) return "gone" as const;
        throw err;
      }),
    [examId, question, order],
  );
  const [list, setList] = useState<List | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reported, setReported] = useState<Set<string>>(new Set());
  const [highlight, setHighlight] = useState<string | null>(null);
  const [preload, setPreload] = useState<{ rootId: string; data: Paged<ExamComment> } | null>(null);
  const focused = useRef(false);

  useEffect(() => {
    const d = first.data;
    if (d && d !== "gone") setList({ items: d.items, page: 1, totalPages: d.meta?.totalPages ?? 1, total: d.meta?.total ?? d.items.length });
  }, [first.data]);

  // Mở từ thông báo (một lần): bình luận gốc ở trang đầu thì làm nổi bật luôn; không thì tìm trong phản hồi của vài bình luận gốc đầu
  // shortcut: chưa có API tìm bình luận gốc của một phản hồi, nên dò phản hồi trang 1 của tối đa FIND_REPLY_ROOTS gốc; nâng cấp khi thông báo gửi kèm id gốc
  const firstItems = first.data && first.data !== "gone" ? first.data.items : null;
  useEffect(() => {
    if (!focusComment || !firstItems || focused.current) return;
    focused.current = true;
    let stop = false;
    const done = () => {
      setHighlight(focusComment);
      setTimeout(() => setHighlight(null), HIGHLIGHT_MS);
    };
    if (firstItems.some((c) => c.id === focusComment)) return done();
    void (async () => {
      for (const root of firstItems.filter((c) => (c.replyCount ?? 0) > 0).slice(0, FIND_REPLY_ROOTS)) {
        const data = await commentApi.replies(examId, root.id, 1).catch(() => null);
        if (stop) return;
        if (data?.items.some((c) => c.id === focusComment)) {
          setPreload({ rootId: root.id, data });
          return done();
        }
      }
    })();
    return () => {
      stop = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy khi trang bình luận đầu về
  }, [firstItems]);

  // Khách / chưa xác minh: chỉ xem; bấm thao tác thì nhắc đăng nhập hoặc xác minh
  const gate = () => {
    if (canAct) return true;
    if (!user) toast.error(`Đăng nhập để ${gateWhat}`, { action: { label: "Đăng nhập", onClick: () => navigate("/login", { state: { from } }) } });
    else toast.error(`Xác minh email để ${gateWhat}`);
    return false;
  };

  const fail = (fallback: string) => (err: unknown) => toast.error(errorMessage(err, fallback));
  const patchItem = (id: string, patch: Partial<ExamComment>) => setList((l) => l && { ...l, items: l.items.map((c) => (c.id === id ? { ...c, ...patch } : c)) });

  const post = async (input: CommentInput) => {
    const c = await commentApi.create(examId, question, input);
    const total = (l: List) => l.total + (c.status === "APPROVED" ? 1 : 0);
    setList((l) => l && { ...l, items: order === "oldest" ? [...l.items, c] : [c, ...l.items], total: total(l) });
    onPosted?.();
    if (c.status === "APPROVED") onChanged();
    else toast.success("Đã gửi, bình luận sẽ hiện với mọi người sau khi được duyệt");
  };

  // Thích / không thích: đổi ngay trên giao diện, lỗi thì trả lại như cũ; bấm lại cái đang chọn là bỏ
  const react: CommentActions["react"] = (c, kind, patch) => {
    if (!gate()) return;
    const prev = { likes: c.likes ?? 0, dislikes: c.dislikes ?? 0, reaction: reactionOf(c), liked: reactionOf(c) === "like" };
    const next = prev.reaction === kind ? null : kind;
    const bump = (k: "like" | "dislike") => (next === k ? 1 : 0) - (prev.reaction === k ? 1 : 0);
    patch(c.id, { likes: prev.likes + bump("like"), dislikes: prev.dislikes + bump("dislike"), reaction: next, liked: next === "like" });
    commentApi.react(examId, c.id, next).then(
      (res) => patch(c.id, { ...res, liked: res.reaction === "like" }),
      (err: unknown) => {
        patch(c.id, prev);
        fail("Chưa cập nhật được")(err);
      },
    );
  };

  const report = async (c: ExamComment) => {
    if (!gate()) return;
    if (!(await confirm({ title: "Báo cáo bình luận này?", message: "Quản trị viên sẽ xem và gỡ nếu bình luận không phù hợp.", confirmLabel: "Báo cáo" }))) return;
    try {
      await commentApi.report(examId, c.id);
      setReported((s) => new Set(s).add(c.id));
      toast.success("Đã gửi báo cáo, cảm ơn bạn");
    } catch (err) {
      fail("Chưa gửi được báo cáo")(err);
    }
  };

  const remove = async (c: ExamComment, onRemoved: () => void) => {
    const withReplies = !c.parentId && (c.replyCount ?? 0) > 0;
    const message = withReplies ? "Bình luận và các phản hồi của nó sẽ bị xoá hẳn, không khôi phục được." : "Bình luận sẽ bị xoá hẳn, không khôi phục được.";
    if (!(await confirm({ title: c.parentId ? "Xoá phản hồi này?" : "Xoá bình luận này?", message, confirmLabel: "Xoá", tone: "danger" }))) return;
    try {
      await commentApi.remove(examId, c.id);
      onRemoved();
      onChanged(); // số bình luận đã gồm cả phản hồi
    } catch (err) {
      fail("Chưa xoá được bình luận")(err);
    }
  };

  const more = async () => {
    if (!list) return;
    setLoadingMore(true);
    try {
      const next = await commentApi.list(examId, question, list.page + 1, order);
      setList((l) => {
        if (!l) return l;
        const have = new Set(l.items.map((c) => c.id));
        return { ...l, items: [...l.items, ...next.items.filter((c) => !have.has(c.id))], page: l.page + 1, totalPages: next.meta?.totalPages ?? l.totalPages };
      });
    } catch (err) {
      fail("Chưa tải thêm được bình luận")(err);
    } finally {
      setLoadingMore(false);
    }
  };

  const removeRoot = (c: ExamComment) => setList((l) => l && { ...l, items: l.items.filter((x) => x.id !== c.id), total: l.total - (c.status === "APPROVED" ? 1 : 0) });

  // Phản hồi vừa gửi: số bình luận của đích đổi; chưa duyệt thì báo
  const posted = (c: ExamComment) => {
    onPosted?.();
    if (c.status === "APPROVED") onChanged();
    else toast.success("Đã gửi, phản hồi sẽ hiện với mọi người sau khi được duyệt");
  };

  const act: CommentActions = { gate, react, report: (c) => void report(c), remove: (c, done) => void remove(c, done), posted, reported: (id) => reported.has(id) };

  return { user, canAct, from, first, gone: first.data === "gone", list, loadingMore, more, post, act, patchItem, removeRoot, highlight, preload, confirmDialog, gate };
}
