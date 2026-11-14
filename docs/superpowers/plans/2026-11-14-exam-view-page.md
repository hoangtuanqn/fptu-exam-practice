# Exam view page Implementation Plan

> **For agentic workers:** In this repo the delivery method is the `fepass-feature` skill (frontend-engineer, qa-reviewer). Steps use checkbox syntax.

**Goal:** A read-only page `/exam/:threadId/view` that shows a whole exam, reachable from "Câu đã lưu" and the exam library.

**Architecture:** Frontend only. New feature folder `frontend/src/features/exam-view/`, one new route, reuse `examImportApi.examByThread`, `savedApi`, `useExamQuestionsLive`, shared UI. No backend or schema change.

**Tech Stack:** React + Vite + Tailwind (`md-*`).

**Spec:** `docs/superpowers/specs/2026-11-14-exam-view-page-design.md`

## Global Constraints

- UI text Vietnamese; code, commits, PRs, route names English (`/exam/:threadId/view`).
- Read-only: no answer selection, grading, timer, attempts, AI explain or report buttons.
- Never show answers for exams whose `answerStatus` is not `AI` or `MANUAL`.
- Reuse `frontend/src/shared`; keep each file's line endings (`git diff --numstat` must show only real changes); no new dependency; no secrets.

## Review Focus

- Exam not in the viewer's library -> friendly not-found state, no crash, no leaked data.
- Exam with `answerStatus` PENDING/FAILED/DEFAULT -> answers never rendered, toggle hidden with a note.
- `?q=` with a number that does not exist or is not a number -> page still opens at the top, no error.
- Exam still being fetched (fewer questions than total) -> banner, new questions append without losing scroll position.
- Guest (not logged in) -> can view their own exam, no save buttons.

---

### Task 1: view page
**Files:** create `frontend/src/features/exam-view/ExamViewPage.tsx` (+ small helper components in the same folder if it keeps files short); modify `frontend/src/app/App.tsx` (lazy route `/exam/:threadId/view`, declared so it is not captured by `/exam/:threadId`), `frontend/seo.config.ts` and/or `frontend/scripts/check-seo.mjs` if the SEO check requires an entry for the new path (non-indexed like the practice page), and the places that hide floating widgets on `/exam/` paths only if the view page needs them visible (default: leave as is).
**Consumes:** `examImportApi.examByThread(threadId): Promise<ImportedExam>` (`answerStatus`, `questions[{number, imageUrl, correct[], isReference, topic}]`, `totalQuestions`, `title`, `threadId`, `id`); `savedApi` from `frontend/src/features/saved/saved.api.ts` (`save`, `remove`, saved numbers of an exam); `useExamQuestionsLive(examId, enabled, onQuestions, onFailed)`.
- [ ] Header: title, "N câu", button "Làm bài ngay" -> `/exam/:threadId`, switch "Hiện đáp án" (default on, remembered in `localStorage` with try/catch, hidden with the note "Đề này chưa có đáp án" when `answerStatus` is not AI/MANUAL).
- [ ] Body: reference documents first (own section), then question cards in one column with lazy images, topic chip, "Đáp án: A C" line, and a save/unsave button (logged-in only, same toasts as the practice menu: "Đã lưu câu N" / "Đã bỏ lưu câu N").
- [ ] `?q=N` scrolls to the card and highlights it for a few seconds; invalid or missing N is ignored.
- [ ] Question jump bar: sticky row of numbers on wide screens; a "Câu" button opening a number grid on phones.
- [ ] Still-fetching banner and live append via `useExamQuestionsLive`; not-found / error states with links to the home page and the exam library.
- [ ] `npx tsc --noEmit -p .` and `npm run build` (includes the SEO check). Commit in small steps: route + page; jump bar and live append if separate.

### Task 2: entry points
**Files:** modify `frontend/src/features/saved/SavedPage.tsx` ("Mở đề" -> `/exam/${threadId}/view?q=${number}`), `frontend/src/features/exam-store/MyExamsTab.tsx` (a "Xem đề" link to `/exam/${threadId}/view` next to the existing open/practice link, both the table and the phone list).
- [ ] tsc + build pass. Commit `feat: open saved questions and library exams in the view page`.

### Task 3: review and deliver
- [ ] qa-reviewer on the branch; fix findings; push and open the PR (merge only when asked).
