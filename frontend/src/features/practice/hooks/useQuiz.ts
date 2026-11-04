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
  total: number; // tổng số ảnh của đề (lớn hơn số câu + tài liệu đã có = đề còn đang được lấy về)
  references: Question[]; // tài liệu tham khảo (trang công thức...): không phải câu hỏi
}

// Đề chưa có đủ đáp án đúng (AI đang giải hoặc giải lỗi): chỉ xem, không làm bài
const isLocked = (source: AnswerSource | null) => source !== null && source !== "AI" && source !== "MANUAL";

// Trạng thái của một lượt làm dở dang cần khôi phục
export interface ResumeState {
  sessionId: number;
  answers: UserAnswers;
  checked: Record<number, boolean>;
  flagged: Record<number, boolean>;
  current: number;
  elapsedSec: number;
}

type IncomingQuestion = { number: number; imageUrl: string; correct: string[] };

// Gộp các câu mới về vào danh sách theo số câu (nhận lặp cũng không sao), giữ thứ tự tăng dần
const mergeQuestions = (prev: Question[], incoming: IncomingQuestion[], locked: boolean, skip: Set<number> = new Set()): Question[] => {
  const have = new Set([...prev.map((q) => q.number), ...skip]); // tài liệu tham khảo đã tách ra thì không thêm lại thành câu hỏi
  const fresh = incoming.filter((q) => !have.has(q.number)).map((q) => (locked ? { ...q, answerPending: true } : q));
  return fresh.length === 0 ? prev : [...prev, ...fresh].sort((a, b) => a.number - b.number);
};

// Tách ảnh tài liệu tham khảo khỏi các câu hỏi: tài liệu không có số câu hiển thị, không tính điểm, nằm trong mục "Tài liệu"
const splitReferences = (list: Question[]) => ({ questions: list.filter((q) => !q.isReference), references: list.filter((q) => q.isReference) });

export function useQuiz() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [references, setReferences] = useState<Question[]>([]);
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
  const [sessionId, setSessionId] = useState<number | null>(null); // lượt làm lưu trên server (null = chưa tạo / đề mở từ thư mục)
  const [resumedElapsed, setResumedElapsed] = useState(0); // số giây đã làm ở lượt được làm tiếp

  // Đồng hồ chỉ chạy khi có đáp án để làm: chờ AI phân tích xong mới bắt đầu tính, dừng khi nộp bài
  const timing = questions.length > 0 && !submitted && !answersPending;
  const elapsed = useStopwatch(timing, session, resumedElapsed);

  const last = questions.length - 1;

  function clearProgress() {
    setAnswers({});
    setChecked({});
    setFlagged({});
    setSubmitted(false);
    setCurrent(0);
    setSessionId(null);
    setResumedElapsed(0);
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
    setPending({ questions: parsed, title: folderName, examId: null, answerSource: null, total: parsed.length, references: [] });
  }

  // Đề đã có sẵn câu hỏi (nhập từ link FuOverflow): cũng chờ xác nhận như đề mở từ thư mục
  function loadExam(examQuestions: Question[], examTitle: string, id: number, source: AnswerSource = "AI", examTotal = examQuestions.length) {
    setNotFound(false);
    const split = splitReferences(examQuestions);
    setPending({
      questions: isLocked(source) ? split.questions.map((x) => ({ ...x, answerPending: true })) : split.questions,
      references: split.references,
      title: examTitle,
      examId: id,
      answerSource: source,
      total: examTotal,
    });
  }

  // Mở thẳng vào làm bài, bỏ qua bước xác nhận (khi liên kết đã nói rõ chế độ, ví dụ /exam/12?mode=exam)
  function openExam(
    examQuestions: Question[],
    examTitle: string,
    id: number,
    chosenMode: Mode,
    source: AnswerSource = "AI",
    examTotal = examQuestions.length,
    resume?: ResumeState, // có thì làm tiếp lượt dở dang thay vì bắt đầu mới
  ) {
    setNotFound(false);
    setPending(null);
    const split = splitReferences(examQuestions);
    setQuestions(isLocked(source) ? split.questions.map((x) => ({ ...x, answerPending: true })) : split.questions);
    setReferences(split.references);
    setTitle(examTitle);
    setExamId(id);
    setAnswerSource(source);
    setTotal(examTotal);
    setMode(chosenMode);
    clearProgress();
    if (resume) {
      setAnswers(resume.answers);
      setChecked(resume.checked);
      setFlagged(resume.flagged);
      setCurrent(Math.max(0, Math.min(resume.current, split.questions.length - 1)));
      setResumedElapsed(resume.elapsedSec);
      setSessionId(resume.sessionId);
    }
  }

  // Bước 2: người dùng xác nhận và chọn chế độ
  function startExam(chosenMode: Mode) {
    if (!pending) return;
    setQuestions(pending.questions);
    setReferences(pending.references);
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
    const known = new Set(references.map((r) => r.number));
    setQuestions((prev) => mergeQuestions(prev, incoming, isLocked(answerSource), known));
    setPending((p) =>
      p ? { ...p, questions: mergeQuestions(p.questions, incoming, isLocked(p.answerSource), new Set(p.references.map((r) => r.number))), total: examTotal } : p,
    );
    setTotal(examTotal);
  }

  // Lấy đề thất bại giữa chừng: đề bị gỡ, thoát khỏi màn hình làm bài
  function closeExam() {
    setPending(null);
    setQuestions([]);
    setReferences([]);
    setTitle("");
    setExamId(null);
    setAnswerSource(null);
    setTotal(0);
    clearProgress();
  }

  // AI phân tích xong: gắn đáp án đúng vào các câu đang làm (không đụng tới đáp án người dùng đã chọn)
  // `referenceNumbers`: các câu AI cho là tài liệu tham khảo (trang công thức...): chuyển sang mục "Tài liệu", bỏ khỏi danh sách câu
  function applyAnswers(list: { number: number; correct: string[] }[], source: AnswerSource, referenceNumbers: number[] = []) {
    const byNumber = new Map(list.map((a) => [a.number, a.correct]));
    const refSet = new Set(referenceNumbers);
    if (refSet.size > 0) {
      const moved = questions.filter((qn) => refSet.has(qn.number)).map((qn) => ({ ...qn, isReference: true, answerPending: false }));
      if (moved.length > 0) setReferences((prev) => [...prev.filter((r) => !refSet.has(r.number)), ...moved].sort((a, b) => a.number - b.number));
      const rest = questions.length - moved.length;
      setCurrent((c) => Math.max(0, Math.min(c, rest - 1))); // đang xem đúng tài liệu đó thì lùi về câu cuối
      const omit = <T,>(rec: Record<number, T>) => Object.fromEntries(Object.entries(rec).filter(([k]) => !refSet.has(Number(k)))) as Record<number, T>;
      setAnswers(omit); // đã lỡ chọn đáp án cho tài liệu lúc AI chưa xong thì bỏ đi, không tính vào số câu đã làm
      setChecked(omit);
      setFlagged(omit);
    }
    setQuestions((prev) => prev.filter((qn) => !refSet.has(qn.number)).map((qn) => ({ ...qn, correct: byNumber.get(qn.number) ?? qn.correct, answerPending: false })));
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
    references,
    loadingMore: examId !== null && total > questions.length + references.length,
    pendingLoadingMore: pending !== null && pending.total > pending.questions.length + pending.references.length,
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
    timing,
    sessionId,
    setSessionId,
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
