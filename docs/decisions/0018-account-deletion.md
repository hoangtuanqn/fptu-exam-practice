# 0018. Self-service account deletion

**Context.** Users need to delete their account. More than 40 tables point at `users`, and money records must be kept for accounting.

**Decision.**
- `POST /users/me/deletion` closes the account at once (all sessions revoked, no mails). Signing in again within the grace period cancels it.
- A nightly job (inside the session cleanup cron) anonymises due accounts in one transaction per account: personal data is deleted or scrubbed, the user row, money records, statistics and shared contributions stay. Hard delete is never used.
- The remaining balance is written off with a `CREDIT_EXPIRED` ledger entry, so no new enum value is needed.
- A keyed hash of the erased email is kept so re-registering does not grant signup or referral bonuses again.
- Deposits arriving for an erased account stay "unmatched" for an admin to handle.

**Consequences.** Every new query that mails or rewards members must exclude `deleteRequestedAt`, and every new table holding personal data must be added to `accountDeletionRepository.purge`. Ledger notes written for other users may still contain the old display name. Rotating `JWT_SECRET` makes old email hashes stop matching.
