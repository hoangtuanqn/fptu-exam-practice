# Email marketing UI and measurement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. In this repo the delivery method is the `fepass-feature` skill (backend-engineer, frontend-engineer, qa-reviewer). Steps use checkbox syntax.

**Goal:** Turn the existing automated mail sender into an admin-operable marketing tool: measure results, tune without deploys, preview, user preference center, manual broadcast, log.

**Architecture:** Additive changes on top of `feat/email-marketing` (unmerged). Three stages, one branch and PR each, backend deploys before frontend. Click tracking via a signed redirect; "mua Pro" is computed at read time from `PlanPurchase`; "quay lại" is stored in a log column. Settings live in the existing marketing setting service; the cron stays the single sender.

**Tech Stack:** Express 5, Prisma + MySQL (raw `Prisma.sql` for set queries), node-cron, node:test; React + Vite + Tailwind with `md-*` classes.

**Spec:** `docs/superpowers/specs/2026-11-14-email-marketing-ui-design.md`

## Global Constraints

- API changes additive only; backend deploys first. Migrations additive, in their own commit, matching `schema.prisma`.
- User-facing text Vietnamese; code, commits, PRs, branches English. No `Co-Authored-By` or "Generated with" lines. No secrets, IPs, caps or day-windows in user-facing copy.
- Hard ceilings in code: daily cap <= 300; minimum gap between mails >= 3 days. Defaults stay the current constants in `backend/src/constants/marketing.ts`.
- Conversion window 7 days; clicks within 30 s of `sentAt` are ignored; funnel counts only mails sent >= 7 days ago, newer ones shown as "đang chờ kết quả".
- Send priority per day: `pro_expiry`, then broadcast (`news`), then `pro_upsell`, then `winback`. Run hour 10:00 is read-only.
- Pause 30 days does NOT block `pro_expiry`; muting topic `renewal` or opt-out-all does.
- Everything stays default-off; no path may exceed the daily cap or the 1-mail-per-7-days rule (except `pro_expiry` for the gap only).

## Review Focus

- A forged or tampered click token redirects to the site home and never to an arbitrary URL.
- A mail scanner opening the link within 30 s of sending does not count as a click.
- Admin sets daily cap 99999 or gap 0: rejected with 400, nothing stored.
- Opt-out, topic mute or pause that happens after the batch is built but before the send still blocks the mail.
- A broadcast to a segment whose members already got a mail in the last 7 days skips them (no double mail).

---

## Stage 1: measurement and global control (branch `feat/marketing-measurement`)

### Task 1: migration 0067 (log columns + index)
**Files:** Create `backend/prisma/migrations/0067_marketing_tracking/migration.sql`; modify `backend/prisma/schema.prisma`.
**Produces:** `EmailCampaignLog` gains `target String? @db.VarChar(120)`, `clickedAt DateTime?`, `returnedAt DateTime?`, index `@@index([campaign, sentAt])`.
- [ ] Add columns and index (SQL by hand, per `prisma-migration`); `npx prisma validate && npx prisma generate`; verify `migrate diff` against a throwaway DB is empty.
- [ ] Commit: `feat: add click and return tracking columns to email campaign logs` (own commit).

### Task 2: click tracking
**Files:** Create `backend/src/utils/marketing-click.ts`; modify `backend/src/utils/marketing-token.ts` (reuse mac), `backend/src/mail/templates/marketing.ts`, `backend/src/services/marketing-campaign.service.ts`, `backend/src/repositories/marketing.repository.ts`, `backend/src/controllers/marketing.controllers.ts`, `backend/src/routes/marketing.routes.ts`; test `backend/test/marketing-click.test.ts`.
**Produces:**
- `CLICK_PLACEHOLDER: string` (exported const) used by builders as the CTA url; `CampaignJob.target: string` (internal path such as `/pro`).
- `signClickToken(secret: string, logId: number): string`, `verifyClickToken(secret: string, token: string): number | null` (separate purpose string from unsubscribe).
- `marketingRepository.claim(userId, campaign, step, target): Promise<number | null>` stores `target`.
- `marketingRepository.recordClick(logId: number, now: Date): Promise<string | null>` returns the stored `target` and sets `clickedAt` only if null and `now - sentAt >= 30 s`.
- Route `GET /api/v1/marketing/click?t=<token>`: 302 to `CLIENT_URL + target`; invalid, unknown or empty target -> 302 to `CLIENT_URL`; rate limited like unsubscribe.
- `deliver()` replaces `CLICK_PLACEHOLDER` with the click URL in both html and text after `claim` succeeds.
- [ ] Tests (node:test): token roundtrip + tamper returns null; `recordClick` ignores < 30 s then records once; target never taken from the URL.
- [ ] Implement; run `npm run typecheck` and the tests. Commit: `feat: track clicks on marketing mail buttons`.

### Task 3: "quay lại" marker
**Files:** modify `backend/src/repositories/marketing.repository.ts`, `backend/src/services/refresh-token.service.ts`; extend `backend/test/marketing-db.test.ts`.
**Produces:** `marketingRepository.markReturned(userId: number, now: Date): Promise<void>` doing `UPDATE email_campaign_logs SET returned_at = now WHERE user_id = ? AND returned_at IS NULL AND sent_at >= now - 7d`, called from the existing hourly-throttled `touchActive` path.
- [ ] DB test: log sent 2 days ago gets `returnedAt` after a touch; a log older than 7 days or already marked is untouched. Implement. Commit: `feat: mark when a mailed user returns`.

### Task 4: overview and pause
**Files:** modify `backend/src/services/marketing-setting.service.ts` (add `paused` flag: `isPaused(): Promise<boolean>`, `setPaused(v: boolean)`), `marketing-campaign.service.ts` (`run()` returns early when paused), `marketing.repository.ts`, `controllers/admin.marketing.controllers.ts`, `routes/admin.routes.ts`; new `backend/src/services/marketing-stats.service.ts`.
**Produces:**
- `GET /admin/marketing/overview` -> `{ status: { sentToday: number; dailyCap: number; nextRun: string (ISO); smtpConfigured: boolean; optOutRate: number; paused: boolean }, funnel: Record<CampaignKey, { sent: number; clicked: number; bought: number; returned: number; pending: number }> }` (30 days, per spec rules; `returned` only meaningful for winback, 0 elsewhere).
- `PUT /admin/marketing/paused` body `{ paused: boolean }` -> `{ paused }`.
- `bought` = log has a `PlanPurchase` for that user within 7 days after `sentAt` and the log is the user's latest mail before the purchase (last touch), query set-based.
- [ ] DB tests: funnel excludes mails < 7 days (counted in `pending`), last-touch attributes one purchase to one log, admin-granted Pro not counted; paused run sends nothing. Implement. Commit per file group (`feat: marketing overview stats`, `feat: pause all marketing mail`).

### Task 5: admin UI shell, Tổng quan, Chiến dịch
**Files:** modify `frontend/src/features/admin/marketing/MarketingPage.tsx`, `marketing.api.ts`; create `OverviewStrip.tsx`, `CampaignCard.tsx` in the same folder.
**Consumes:** the Task 4 endpoints. **Produces:** tabs "Tổng quan | Chiến dịch" (other tabs added in later stages); status strip with "Tạm dừng tất cả"; each card shows Gửi → Bấm → Mua Pro (or Quay lại), "đang chờ kết quả: N", Xem thư/Gửi thử; enable-confirm dialog states eligible count and `ceil(eligible / dailyCap)` days.
- [ ] Implement; `npx tsc --noEmit -p .` and `npm run build`; check 390px layout by reading classes (no browser claim). Commit: `feat: marketing overview tab and results funnel`.

### Stage 1 gate
- [ ] qa-reviewer on the branch; fix findings; open PR (do not merge).

## Stage 2: tune, preview, preferences (branch `feat/marketing-preferences`, from Stage 1)

### Task 6: tunable parameters
**Files:** modify `marketing-setting.service.ts`, `constants/marketing.ts` (defaults + `PARAM_LIMITS`), `marketing-campaign.service.ts`, `marketing.repository.ts`, admin controller/routes, `rules/requests/marketing.request.ts`.
**Produces:** `marketingSettingService.params(): Promise<MarketingParams>` (stored values merged over defaults), `setParams(p: Partial<MarketingParams>)`; `GET /admin/marketing/params`, `PUT /admin/marketing/params` (zod; 400 outside `PARAM_LIMITS`; `dailyCap` 1..300, `minGapDays` 3..30, winback steps strictly increasing within 7..365, other fields per spec); `POST /admin/marketing/params/reset`.
- [ ] Tests: ceilings enforced (cap 99999, gap 0 -> 400); the campaign run reads params, not constants. Commit.

### Task 7: preview
**Files:** admin controller/routes, `marketing-campaign.service.ts` (`samples` already exists).
**Produces:** `GET /admin/marketing/campaigns/:key/preview?step=n` -> `{ subject: string; html: string }` with `cid:` images replaced by public asset URLs or removed.
- [ ] Test: unknown key/step -> 400/404; html contains no `cid:`. Commit.

### Task 8: topics and pause (migration 0068 + backend)
**Files:** migration `0068_marketing_preferences`; `schema.prisma`; `user.repository.ts` (`publicUserSelect`), `rules/requests/user.request.ts`, `marketing.repository.ts` (ELIGIBLE filters), `marketing.service.ts` and unsubscribe controller, `mail/templates/marketing.ts` (link gets `&c=<topic>`).
**Produces:** `users.marketing_muted_topics INT NOT NULL DEFAULT 0` (bits: review=1, offers=2, renewal=4, news=8), `users.marketing_muted_until DATETIME NULL`; `PATCH /users/me` accepts `{ marketingMutedTopics?: number; pauseMarketingDays?: 0|30 }`; public user payload exposes `marketingMutedTopics`, `marketingMutedUntil`; `POST /marketing/unsubscribe` body `{ token, mode?: "all"|"pause"|"topic", topic?: "review"|"offers"|"renewal"|"news" }` (default `all`, so the one-click POST is unchanged). Each campaign's audience excludes muted topic; pause excludes everything except `pro_expiry`; `claim()` rechecks opt-out, topic and pause.
- [ ] DB tests: pause blocks winback/upsell but not expiry; muting `renewal` blocks expiry; recheck at claim time. Migration commit separate.

### Task 9: frontend preferences + admin tuning/preview
**Files:** `frontend/src/features/account/components/MarketingEmailCard.tsx` (4 switches + "Tạm dừng 30 ngày"), `frontend/src/features/marketing/UnsubscribePage.tsx` (choices: huỷ tất cả / tạm dừng 30 ngày / tắt loại thư này when `c` present, else pick), admin `ParamsDialog.tsx`, `PreviewDialog.tsx` (iframe `sandbox=""`, `srcDoc`), `marketing.api.ts`.
- [ ] Types updated (`User.marketingMutedTopics?`, `marketingMutedUntil?`), copy says expiry mails still arrive while paused. tsc + build. Commits split per feature.

### Stage 2 gate: qa-reviewer, fix, PR.

## Stage 3: broadcast and logs (branch `feat/marketing-broadcast`, from Stage 2)

### Task 10: broadcasts (migration 0069 + backend)
**Files:** migration `0069_marketing_broadcasts`; `schema.prisma` (`MarketingBroadcast`: id, subject, body, ctaLabel, ctaPath, segment, segmentDays Int?, status enum DRAFT/SENDING/DONE/CANCELLED, createdById, createdAt); new `backend/src/services/marketing-broadcast.service.ts`; `marketing.repository.ts` (`audience.broadcast(segment, days)`), `marketing-campaign.service.ts` (ORDER: expiry, news, upsell, winback), `mail/templates/marketing.ts` (`renderBroadcast`: escaped plain-text paragraphs, one button).
**Produces:** segments `all | pro | free | inactive | exam_soon`; `POST /admin/marketing/broadcasts` (create DRAFT, zod: subject <= 120, body <= 5000, ctaPath must start with `/`), `GET /admin/marketing/broadcasts`, `POST .../:id/test` (to caller only), `POST .../:id/start` body `{ confirm: "GỬI" }` (else 400; only one SENDING at a time), `POST .../:id/cancel`. Log campaign string `broadcast:<id>` (fits VarChar(20) for id up to 10 digits; widen column in the migration to VarChar(40) to be safe).
- [ ] Tests: start without confirm -> 400; second start while one is SENDING -> 409; broadcast respects cap, 7-day gap, opt-out, topic `news`; body HTML is escaped. Commits: migration, then service/endpoints.

### Task 11: log endpoint
**Produces:** `GET /admin/marketing/logs?campaign&from&to&email&page` -> `{ items: { id, sentAt, email, campaign, step, clicked: boolean, bought: boolean, returned: boolean }[], meta }`, paginated, set-based, email filter is a prefix/contains on one indexed user lookup.
- [ ] Test pagination and filters. Commit.

### Task 12: frontend tabs "Gửi thủ công" and "Nhật ký"
Composer (subject, body, button label/path, segment + days), preview, "Gửi thử cho tôi", confirm dialog with recipient estimate and days and a "GỬI" text field, list of broadcasts with Dừng; log table with filters (cards on mobile).
- [ ] tsc + build; commits per tab.

### Stage 3 gate: qa-reviewer, fix, PR.

## Self-review
Spec coverage: measurement, pause, status strip, confirm numbers (T1-5); tuning, preview, topics/pause, unsubscribe choices (T6-9); broadcast, log (T10-12). Types: `CampaignJob.target`, `claim(..., target)`, `MarketingParams`, topic bit values are defined once above and reused. Not covered by tests in this plan: real mail clients, browser rendering, cron firing at 10:00.
