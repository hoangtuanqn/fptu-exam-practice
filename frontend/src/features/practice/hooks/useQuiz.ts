import { useState } from "react";
import type { AnswerSource, Mode, Question, UserAnswers } from "@/features/practice/types.ts";
import { parseFolder } from "@/features/practice/utils/parseFolder";
import { grade } from "@/features/practice/utils/grade";
import { useStopwatch } from "./useStopwatch";
import { hasAnswer, isMultiple } from "@/features/practice/utils/question";

// Đề vừa upload, đang chờ người dùng xác nhận + chọn chế độ
interface PendingExam {
  questions: Question[];
  title: string;
  examId: number | null; // có khi đề lấy từ hệ thống (để ghi lịch sử), null khi mở từ thư mục
  answerSource: AnswerSource | null; // nguồn đáp án của đề hệ thống (null = đề mở từ thư mục)
  total: number; // tổng số câu của đề (lớn hơn questions.length = đề còn đang được lấy về)
}

// Đề chưa có đủ đáp án đúng (AI đang giải hoặc giải lỗi): chỉ xem, không làm bài
const isLocked = (source: AnswerSource | null) => source !== null && source !== "AI" && source !== "MANUAL";

type IncomingQuestion = { number: number; imageUrl: string; correct: string[] };

// Gộp các câu mới về vào danh sách theo số câu (nhận lặp cũng không sao), giữ thứ tự tăng dần
const mergeQuestions = (prev: Question[], incoming: IncomingQuestion[], locked: boolean): Question[] => {
  const have = new Set(prev.map((q) => q.number));
  const fresh = incoming.filter((q) => !have.has(q.number)).map((q) => (locked ? { ...q, answerPending: true } : q));
  return fresh.length === 0 ? prev : [...prev, ...fresh].sort((a, b) => a.number - b.number);
};

export function useQuiz() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<UserAnswers>({});
  const [checked, setChecked] = useState<Record<number, boolean>>({}); // câu đã hiện kết quả (chế độ luyện tập)
  const [submitted, setSubmitted] = useState(false);
  const [current, setCurrent] = useState(0); // vị trí câu đang xem (index)
  const [title, setTitle] = useState(""); // tên thư mục đề
  const [examId, setExamId] = useState<number | null>(null); // đề đang làm có trong hệ thống không
  const [answerSource, setAnswerSource] = useState<AnswerSource | null>(null); // nguồn đáp án; PENDING = AI đang phân tích
  const [total, setTotal] = useState(0); // tổng số câu của đề đang làm
  const answersPending = isLocked(answerSource); // chưa có đáp án: chỉ xem đề
  const [mode, setMode] = useState<Mode>("practice"); // chọn lúc bắt đầu, không đổi giữa chừng
  const [pending, setPending] = useState<PendingExam | null>(null);
  const [notFound, setNotFound] = useState(false); // upload thư mục không có ảnh hợp lệ
  const [flagged, setFlagged] = useState<Record<number, boolean>>({}); // câu đánh dấu cần xem lại
  const [session, setSession] = useState(0); // tăng mỗi lần bắt đầu/làm lại -> đặt lại đồng hồ

  // Đồng hồ chạy từ lúc bắt đầu, dừng khi nộp bài
  const elapsed = useStopwatch(questions.length > 0 && !submitted, session);

  const last = questions.length - 1;

  function clearProgress() {
    setAnswers({});
    setChecked({});
    setFlagged({});
    setSubmitted(false);
    setCurrent(0);
    setSession((s) => s + 1);
  }

  function toggleFlag(number: number) {
    setFlagged((prev) => ({ ...prev, [number]: !prev[number] }));
  }

  // Bước 1: đọc thư mục, chưa vào làm bài -> chờ xác nhận
  async function loadFolder(files: File[], folderName: string) {
    const parsed = await parseFolder(files);
    if (parsed.length === 0) {
      setNotFound(true);
      return;
    }
    setNotFound(false);
    setPending({ questions: parsed, title: folderName, examId: null, answerSource: null, total: parsed.length });
  }

  // Đề đã có sẵn câu hỏi (nhập từ link FuOverflow): cũng chờ xác nhận như đề mở từ thư mục
  function loadExam(examQuestions: Question[], examTitle: string, id: number, source: AnswerSource = "AI", examTotal = examQuestions.length) {
    setNotFound(false);
    setPending({
      questions: isLocked(source) ? examQuestions.map((x) => ({ ...x, answerPending: true })) : examQuestions,
      title: examTitle,
      examId: id,
      answerSource: source,
      total: examTotal,
    });
  }

  // Mở thẳng vào làm bài, bỏ qua bước xác nhận (khi liên kết đã nói rõ chế độ, ví dụ /exam/12?mode=exam)
  function openExam(examQuestions: Question[], examTitle: string, id: number, chosenMode: Mode, source: AnswerSource = "AI", examTotal = examQuestions.length) {
    setNotFound(false);
    setPending(null);
    setQuestions(isLocked(source) ? examQuestions.map((x) => ({ ...x, answerPending: true })) : examQuestions);
    setTitle(examTitle);
    setExamId(id);
    setAnswerSource(source);
    setTotal(examTotal);
    setMode(chosenMode);
    clearProgress();
  }

  // Bước 2: người dùng xác nhận và chọn chế độ
  function startExam(chosenMode: Mode) {
    if (!pending) return;
    setQuestions(pending.questions);
    setTitle(pending.title);
    setExamId(pending.examId);
    setAnswerSource(pending.answerSource);
    setTotal(pending.total);
    setMode(chosenMode);
    clearProgress();
    setPending(null);
  }

  // Đề đang được lấy về: có thêm câu mới thì thêm vào cuối (cả đề đang làm lẫn đề đang chờ chọn chế độ)
  function appendQuestions(incoming: IncomingQuestion[], examTotal: number) {
    setQuestions((prev) => mergeQuestions(prev, incoming, isLocked(answerSource)));
    setPending((p) => (p ? { ...p, questions: mergeQuestions(p.questions, incoming, isLocked(p.answerSource)), total: examTotal } : p));
    setTotal(examTotal);
  }

  // Lấy đề thất bại giữa chừng: đề bị gỡ, thoát khỏi màn hình làm bài
  function closeExam() {
    setPending(null);
    setQuestions([]);
    setTitle("");
    setExamId(null);
    setAnswerSource(null);
    setTotal(0);
    clearProgress();
  }

  // AI phân tích xong: gắn đáp án đúng vào các câu đang làm (không đụng tới đáp án người dùng đã chọn)
  function applyAnswers(list: { number: number; correct: string[] }[], source: AnswerSource) {
    const byNumber = new Map(list.map((a) => [a.number, a.correct]));
    setQuestions((prev) => prev.map((qn) => ({ ...qn, correct: byNumber.get(qn.number) ?? qn.correct, answerPending: false })));
    setAnswerSource(source);
  }

  // AI giải lỗi (đề vẫn chỉ xem được)
  function markFailed() {
    setAnswerSource("FAILED");
  }

  // Người dùng bấm "Thử lại": quay về trạng thái chờ AI
  function waitForAnswers() {
    setAnswerSource("PENDING");
  }

  function cancelPending() {
    pending?.questions.forEach((q) => URL.revokeObjectURL(q.imageUrl));
    setPending(null);
  }

  function goTo(index: number) {
    setCurrent(Math.max(0, Math.min(index, last)));
  }

  // Câu đã hiện đáp án đúng/sai chưa?
  function isRevealed(question: Question) {
    return submitted || !!checked[question.number];
  }

  function choose(question: Question, option: string) {
    const { number } = question;
    if (isRevealed(question) || answersPending) return; // đã có kết quả, hoặc AI chưa xong đáp án: chỉ xem đề

    setAnswers((prev) => {
      const selected = prev[number] ?? [];
      const next = isMultiple(question)
        ? selected.includes(option)
          ? selected.filter((o) => o !== option)
          : [...selected, option]
        : [option];
      return { ...prev, [number]: next };
    });
  }

  // Luyện tập: chọn đáp án chưa tính ngay, phải bấm "Xác nhận" mới chốt và hiện kết quả
  // (trong lúc chưa xác nhận vẫn đổi đáp án thoải mái)
  function canCheck(question: Question) {
    return (
      mode === "practice" &&
      hasAnswer(question) &&
      !isRevealed(question) &&
      (answers[question.number] ?? []).length > 0
    );
  }

  function check(question: Question) {
    if (canCheck(question)) setChecked((prev) => ({ ...prev, [question.number]: true }));
  }

  return {
    questions,
    answers,
    checked,
    submitted,
    current,
    title,
    examId,
    session,
    answersPending,
    answerSource,
    total,
    loadingMore: examId !== null && total > questions.length,
    pendingLoadingMore: pending !== null && pending.total > pending.questions.length,
    pendingExamId: pending?.examId ?? null,
    appendQuestions,
    closeExam,
    applyAnswers,
    markFailed,
    waitForAnswers,
    mode,
    pending,
    notFound,
    flagged,
    elapsed,
    toggleFlag,
    answeredCount: Object.values(answers).filter((a) => a.length > 0).length,
    result: submitted ? grade(questions, answers) : null,
    loadFolder,
    loadExam,
    openExam,
    startExam,
    cancelPending,
    dismissNotFound: () => setNotFound(false),
    choose,
    check,
    canCheck,
    isRevealed,
    goTo,
    next: () => goTo(current + 1),
    prev: () => goTo(current - 1),
    submit: () => setSubmitted(true),
    reset: clearProgress, // làm lại cùng đề, cùng chế độ
  };
}

export type Quiz = ReturnType<typeof useQuiz>;
