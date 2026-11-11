# 0002 Local question similarity, frequency stats and FSRS

**Context.** We want cross-exam groups of repeated questions, per-chapter and per-group exam frequency, and a per-question FSRS review schedule, at no running cost (no LLM, no paid API, no vector DB). Questions are images, so there is no question text to embed. `frequent-questions.service` already matches repeats in memory using the 1536-bit image fingerprint (`utils/question-hash`).

**Decision.**
- `question_embeddings` (migration 0057) stores one float32 vector per question and model. The only working model is `image-fingerprint-v1`, which expands the stored fingerprint to a +-1 unit vector (cosine = 1 - 2 * hamming / 1536). Providers implement `EmbeddingProvider` (`services/embedding`); a text/OCR provider is a stub that throws until it is configured.
- `npm run groups:build` clusters a subject (pure function `utils/question-clustering`, greedy union-find by descending cosine that never puts two questions of one exam in a group) and replaces the subject's `question_groups` in one transaction (0058).
- `npm run stats:refresh` fills `chapter_stats` and `question_group_stats` (0059) with SQL, in one transaction per subject. Recency weight is 0.5^(age / half-life), with age counted from the subject's newest exam. These are frequency statistics, never called predictions.
- FSRS endpoints check exam access like other exam APIs (404 outside the user's library, usable answer source only); the due list only returns cards whose exam is still in the user's library. Parallel submits are serialised with INSERT IGNORE + SELECT ... FOR UPDATE and retried on deadlock.
- FSRS uses the `ts-fsrs` package (new dependency: the scheduling model is not something to hand-roll) with its own tables `user_question_cards` / `user_review_logs` (0060) and endpoints under `/reviews`. The Leitner notebook (`/review`) is unchanged.
- Tests use Node's built-in runner (`npm test`, no new test framework). Database tests run only with `TEST_DB=1` and use a throwaway `fepass_test_*` database that is dropped afterwards.

**Consequences.**
- Grouping is O(n^2) per chapter (fine for a manual command). Rebuilding groups gives them new ids and deletes their stats, so a non-dry `groups:build` refreshes the subject's stats right after writing (opt out with `--no-stats`, which prints a warning to run `stats:refresh`).
- The default threshold depends on the model (`GROUP_THRESHOLD_BY_MODEL`); the fingerprint default matches `FREQUENT_MATCH_BITS`.
- Questions without a fingerprint are skipped until "Cau hay ra" has hashed them.
- Nightly job (`jobs/similarity.cron.ts`, 04:00 Vietnam time, `npm run job:similarity` by hand) runs the same pipeline as `groups:build` (`services/similarity-pipeline.service`) for subjects whose usable exams changed, that still miss fingerprints, or have fingerprinted questions without a vector, with a per-night image cap split across subjects. It remembers each subject in `similarity_job_runs` (0061: exam signature = count, id sum, newest created/refreshed time, plus a hash cursor so unreadable images are not retried every night); `computed_at` of the stats tables was not enough (no rows for subjects without chapters or groups, also written by a bare `stats:refresh`, and blind to an exam turning from DEFAULT to AI).
- Not detected: chapter relabelling of existing questions (no timestamp on questions); run `npm run job:similarity -- --force` after relabelling.
