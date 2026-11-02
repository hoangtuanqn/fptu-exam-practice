import { useState } from "react";
import type { Mode, Question, UserAnswers } from "../types";
import { parseFolder } from "../utils/parseFolder";
import { grade } from "../utils/grade";
import { useStopwatch } from "./useStopwatch";
import { hasAnswer, isMultiple } from "../utils/question";

// Đề vừa upload, đang chờ người dùng xác nhận + chọn chế độ
interface PendingExam {
  questions: Question[];
  title: string;
}

export function useQuiz() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<UserAnswers>({});
  const [checked, setChecked] = useState<Record<number, boolean>>({}); // câu đã hiện kết quả (chế độ luyện tập)
  const [submitted, setSubmitted] = useState(false);
  const [current, setCurrent] = useState(0); // vị trí câu đang xem (index)
  const [title, setTitle] = useState(""); // tên thư mục đề
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
    setPending({ questions: parsed, title: folderName });
  }

  // Bước 2: người dùng xác nhận và chọn chế độ
  function startExam(chosenMode: Mode) {
    if (!pending) return;
    setQuestions(pending.questions);
    setTitle(pending.title);
    setMode(chosenMode);
    clearProgress();
    setPending(null);
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
    if (isRevealed(question)) return; // đã có kết quả thì khóa

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
    mode,
    pending,
    notFound,
    flagged,
    elapsed,
    toggleFlag,
    answeredCount: Object.values(answers).filter((a) => a.length > 0).length,
    result: submitted ? grade(questions, answers) : null,
    loadFolder,
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
