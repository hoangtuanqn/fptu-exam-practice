# Saved questions Implementation Plan

> **For agentic workers:** In this repo the delivery method is the `fepass-feature` skill (backend-engineer, frontend-engineer, qa-reviewer). Steps use checkbox syntax.

**Goal:** Logged-in users can save a question while practising and look at their saved questions later on a "Câu đã lưu" page.

**Architecture:** One new table `saved_questions` referencing `(exam_id, question_number)`; four additive endpoints under `/api/v1/saved-questions`; a menu item in the question tools menu and a new account page. Routes -> controllers -> services -> repository, zod validators in `rules/requests`.

**Tech Stack:** Express 5, Prisma + MySQL, node:test; React + Vite + Tailwind (`md-*`).

**Spec:** `docs/superpowers/specs/2026-11-14-saved-questions-design.md`

## Global Constraints

- API additive only; migration additive in its own commit; backend deploys before frontend.
- UI text Vietnamese; code, commits, PRs English; no `Co-Authored-By`/"Generated with" lines; no secrets or internal limits in UI.
- Hard ceiling 500 saved questions per user (never shown in the UI; Vietnamese error message at the limit).
- Only logged-in users; guests never see the save item.
- Reuse `frontend/src/shared` and existing patterns (`useApi`, `useToast`, `useConfirm`, `PageHeader`, `Pagination`, account nav in `App.tsx` / `features/account`).
- Keep each file's existing line endings; `git diff --numstat` must show only real changes.

## Review Focus

- Saving a question of an exam the user never opened is rejected (404 or 403), not stored.
- Saving the same question twice is idempotent (no duplicate row, no error).
- Question number that does not exist in the exam is rejected.
- Exams without real answers (DEFAULT/PENDING/FAILED) never show a fake "A" in `correct`.
- Another user cannot list or delete my saved questions (ids always scoped to `req.user.id`).

---

### Task 1: migration 0070 + schema
**Files:** Create `backend/prisma/migrations/0070_saved_questions/migration.sql`; modify `backend/prisma/schema.prisma`.
**Produces:** model `SavedQuestion` (`id`, `userId`, `examId`, `questionNumber`, `createdAt`), `@@unique([userId, examId, questionNumber])`, `@@index([userId, createdAt])`, FK cascade on user and exam; relations added on `User` and `Exam`.
- [ ] Hand-written additive SQL per `prisma-migration`; `npx prisma validate && npx prisma generate`; `migrate diff` against a throwaway DB is empty. Commit `feat: add saved questions table` (own commit).

### Task 2: backend endpoints
**Files:** create `backend/src/repositories/saved-question.repository.ts`, `backend/src/services/saved-question.service.ts`, `backend/src/controllers/saved-question.controllers.ts`, `backend/src/routes/saved-question.routes.ts`, `backend/src/rules/requests/saved-question.request.ts`; modify `backend/src/routes/root.routes.ts`; test `backend/test/saved-question-db.test.ts` (throwaway DB helper as in `marketing-db.test.ts`).
**Produces (all authenticated, `{data, meta?, message?}`):**
- `POST /saved-questions` body `{examId: int>0, questionNumber: int>0}` -> `{saved: true}`; idempotent; 404 if the exam is not in the user's `UserExam` or the question number does not exist in the exam; 409 `"Bạn đã lưu quá nhiều câu, hãy bỏ bớt câu cũ"` at 500.
- `DELETE /saved-questions/:examId/:number` -> `{saved: false}`; deleting a missing row is not an error.
- `GET /saved-questions/exam/:examId` -> `number[]` (saved question numbers of that exam for the caller).
- `GET /saved-questions?page&limit&subject` -> `{id, examId, examTitle, threadId, subjectCode: string|null, number, imageUrl, correct: string[], topic: string|null, savedAt}[]` + meta, newest first, `subject` filters by exam `subjectCode`; `correct` is `[]` unless the exam `answerSource` is in `USABLE_ANSWER_SOURCES` (use `withTrustedAnswers`-style logic / the constant from `constants/exam.ts`), split into letters like other endpoints do.
- [ ] Tests (DB, throwaway): save/idempotent/delete; cannot save for an exam not opened; cannot save a nonexistent question; list scoped to caller; `correct` empty for a DEFAULT exam; ceiling 500 returns 409 (set the limit through a constant exported for the test). Implement. Run `npm run typecheck`, `npm test`, the DB test. Commit repository/service/controller/routes together; tests with them.

### Task 3: frontend
**Files:** create `frontend/src/features/saved/saved.api.ts`, `frontend/src/features/saved/SavedPage.tsx`; modify `frontend/src/features/practice/components/quiz/QuestionToolsMenu.tsx` (+ the props chain from `QuizWorkspace` -> `QuestionCard`), `frontend/src/app/App.tsx` (lazy route `account/saved`), the account navigation where "Sổ câu sai" is listed, `frontend/seo.config.ts` (page title entry for the new route; run the SEO check in `npm run build`).
**Consumes:** the Task 2 endpoints.
- Menu item "Lưu câu này" / "Bỏ lưu câu này" (bookmark icon) shown only for logged-in users with a real `examId`; state loaded once per exam via `GET /saved-questions/exam/:examId`; toggling calls POST/DELETE, toast "Đã lưu câu N" / "Đã bỏ lưu câu N" or the server message on error; the "…" button shows the dot when flagged OR saved.
- `SavedPage`: `PageHeader` "Câu đã lưu"; subject filter (select of the subjects present, from the returned items or a `subject` query in the URL); cards as in the spec (exam title, "Câu N", topic chip, image thumbnail that opens a larger view reusing existing viewer/modal, "Đáp án: A C" line only when `correct` is non-empty, "Mở đề" link to `/exam/:threadId`, "Bỏ lưu" with confirm); pagination; empty state "Chưa có câu nào. Mở menu … ở câu hỏi và chọn Lưu câu này."; one column on phones.
- [ ] `npx tsc --noEmit -p .` and `npm run build` pass. Commits: api client; menu item; page + route + nav.

### Task 4: review and deliver
- [ ] qa-reviewer on the branch (contract, scoping, ceiling, line endings, copy); fix findings; open the PR (do not merge unless asked).
