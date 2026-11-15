# Admin review badges

- Context: admins had no signal for new answer reports or "not helpful" AI explanation ratings. Migration 0077 adds `resolved_at`/`resolved_by_id` to `answer_reports` and `explanation_feedback` (additive, existing rows are unresolved).
- Pending = report `status = PENDING AND resolved_at IS NULL`; rating `helpful = false AND resolved_at IS NULL`. `GET /api/admin/review-counts` returns both counts (no cache: two covering-index COUNTs, so the badge drops right after `POST .../:id/resolve`). Resolve is idempotent (first admin/time kept); approved/rejected reports are returned unchanged.
- A member who submits a new complaint (switches to "not helpful" or changes reason/comment) re-opens the rating; an identical resubmit keeps it resolved. Reports cannot be re-submitted (unique per user/question), so they never re-open.
