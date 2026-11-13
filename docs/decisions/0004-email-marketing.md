# 0004 Automated email marketing (win-back, Pro upsell, Pro expiry)

**Context.** Students who stop coming back, keep paying per item, or are about to lose Pro get no reminder. Mails share the sending mailbox with verification and password-reset mails, so volume and relevance must stay tight to avoid the spam folder.

**Decision.**
- Daily cron `jobs/marketing.cron` (10:00 Asia/Ho_Chi_Minh) runs `marketingCampaignService.run`. Three campaigns, each with an on/off flag in `settings` (`marketing.<key>.enabled`, missing = off). Admin toggles, previews (sample sent only to the calling admin) and sees reach at `/admin/marketing/*`.
- Recipients are chosen by set-based SQL (`repositories/marketing.repository`): role USER, ACTIVE, verified email, not opted out, and no campaign mail in the last 7 days (except Pro expiry). Mail content uses real data loaded per batch (due reviews, last subject, new exams, expiring gift credit, net per-item spend, live plan prices from `planService.info`).
- Every mail is logged in `email_campaign_logs` BEFORE sending; `@@unique(userId, campaign, step)` makes re-runs and crashes safe (a crash after the insert loses one mail, never sends twice). A send error deletes the row so the next run retries. Repeating campaigns store `step = epochDay * 10 + step` (send day for upsell, expiry day for Pro expiry) so each cycle has its own row.
- `users.last_active_at` is written when a refresh token is issued (login of any kind, and rotation), at most once per hour per user via an in-memory TTL set. Users with no value yet fall back to their newest refresh token, then account creation.
- Unsubscribe: HMAC token `<userId>.<sig>` signed with `JWT_SECRET` (no expiry, no new env). Mail link goes to the web page `/unsubscribe?t=`; the `List-Unsubscribe` header points to `POST /api/v1/marketing/unsubscribe?t=` with `List-Unsubscribe-Post` (RFC 8058). Users can also toggle `marketingOptOut` in their profile.

**Consequences.** The win-back query coalesces three sources for last activity, so it scans `users` once a day (fine at current size). Daily cap `MARKETING_MAX_PER_RUN`; with many eligible users the rest wait for the next day. Flags are cached for one minute per process.
