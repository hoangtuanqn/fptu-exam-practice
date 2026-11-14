# Coursera orders stored in FEPass

- Context: members need to select a course and submit their Coursera account details and notes for manual processing.
- Decision: maintain an admin-managed local course catalog and authenticated order endpoints. Each course has a price in wallet credits; there is no FuOverflow integration.
- Order creation snapshots the confirmed catalog price and charges the wallet in one transaction. A missing quote from an older client is accepted only for free courses.
- Cancellation or rejection refunds the stored amount once, in the same transaction as the terminal status change. Completion does not refund. Existing orders retain a zero charged amount.
- Price changes apply only to future orders. The catalog row is locked during checkout; a stale quote is rejected before charging.
- Each order snapshots the course title and URL; catalog edits do not rewrite order history.
- A per-user request UUID deduplicates retries, including concurrent submissions.
- Status updates use a conditional write against the expected status. Members can cancel only their own pending orders.
- Account passwords use authenticated encryption with a dedicated environment key. Lists and mutation responses explicitly exclude credentials.
- Admins reveal credentials through a separate authenticated, rate-limited endpoint. The last viewer and view time are recorded.
- Terminal status updates erase the encrypted password in the same write. Terminal orders cannot be reopened.
- Coursera responses use no-store; unexpected persistence failures return a sanitized error without logging account details.
- Migrations 0073 and 0074 are additive (0074 adds pricing fields and wallet transaction enum values). Apply migrations and deploy the backend before the frontend. This pricing branch depends on the original Coursera feature branch.
- Configure COURSERA_ENCRYPTION_KEY with a securely generated 32-byte key encoded as 64 hexadecimal characters. Keep it outside source control and retain it while active orders exist; replacing it makes existing credentials unreadable.
- Admins must populate the course catalog and set each course price before members can place paid orders. Zero means free. No sample courses or prices are inserted into live data.
- Catalog search uses bounded substring queries for the initial small catalog. Measure before introducing full-text search as it grows.
