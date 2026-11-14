# Coursera orders stored in FEPass

- Context: members need to select a course and submit their Coursera account details and notes for manual processing.
- Decision: maintain an admin-managed local course catalog and authenticated order endpoints. Each course has a price in wallet credits; there is no FuOverflow integration.
- Order creation snapshots the confirmed catalog price and charges the wallet in one transaction. A missing quote from an older client is accepted only for free courses.
- Cancellation or rejection refunds the stored amount once, in the same transaction as the terminal status change. Completion does not refund. Existing orders retain a zero charged amount.
- Price changes apply only to future orders. The catalog row is locked during checkout; a stale quote is rejected before charging.
- Each order snapshots the course title and URL; catalog edits do not rewrite order history. Courses without a URL snapshot an empty string.
- Courses have an optional unique `code` and an optional URL (the FuOverflow catalog has no Coursera link). `scripts/import-coursera-courses.ts` upserts the catalog by code, using the FuOverflow point price 1:1 as wallet credits; re-imports change only title and price and never re-activate a paused course.
- A per-user request UUID deduplicates retries, including concurrent submissions.
- Status updates use a conditional write against the expected status. Members can cancel only their own pending orders.
- Account passwords are stored as plaintext (owner decision, 2026-11). Risk: anyone with database or backup access can read active orders' Coursera passwords; exposure is limited by erasing them on terminal status and by never selecting them outside the reveal endpoint. Rows created before this change hold a `v1.` AES-256-GCM envelope and are still decrypted on reveal. Lists and mutation responses explicitly exclude credentials; passwords never appear in mails or admin notices.
- Admins reveal credentials through a separate authenticated, rate-limited endpoint. The last viewer and view time are recorded.
- Terminal status updates erase the stored password in the same write. Terminal orders cannot be reopened.
- Coursera responses use no-store; unexpected persistence failures return a sanitized error without logging account details.
- Migrations 0073, 0074 and 0075 are additive (0074 adds pricing fields and wallet transaction enum values; 0075 adds the course code and makes the course URL nullable). Apply migrations and deploy the backend before the frontend. This pricing branch depends on the original Coursera feature branch.
- COURSERA_ENCRYPTION_KEY is no longer needed for new orders. Keep it configured only while legacy `v1.` rows remain on pending or processing orders; without it those credentials cannot be revealed.
- New orders notify admins (`coursera.ordered`, important) and user cancellations add a `coursera.cancelled` notice. Members receive mails after commit for order receipt (amount, balance after) and admin status changes (processing, completed, rejected or cancelled with refund and balance after).
- Admins must populate the course catalog and set each course price before members can place paid orders. Zero means free. No sample courses or prices are inserted into live data.
- Catalog search uses bounded substring queries on title or code for the initial small catalog. Measure before introducing full-text search as it grows.

## Courses from a pasted link (2026-11)

- Members may paste a Coursera link (`/learn/<slug>`, `/specializations/<slug>`, `/professional-certificates/<slug>`, optional locale prefix). `POST /api/coursera/lookup` verifies the slug against Coursera's public catalog API and returns the matching catalog row plus `kind`; the order flow (`courseId` + `expectedPrice`) is unchanged.
- The Coursera API is unofficial and keyless: it may change or disappear without notice. Calls are bounded (timeout, capped body, no redirects, per-user rate limit) and failures return a generic 503. Links already in the catalog are answered from the database without calling Coursera.
- The title always comes from Coursera, never from the client. Rows are keyed by the canonical `https://www.coursera.org/<segment>/<slug>` URL; concurrent first lookups resolve to one row.
- New link rows are active, have no code, cost `COURSERA.linkPrice` (50,000 credits) and have `listed = false`, so they do not appear in the member catalog. Admins see every row and can set `listed` through the admin API to promote one (no admin screen for it yet). Migration 0076 adds `listed` (default true, additive; existing rows stay listed).
