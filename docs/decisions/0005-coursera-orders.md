# Coursera orders stored in FEPass

- Context: members need to select a course and submit their Coursera account details and notes for manual processing.
- Decision: maintain an admin-managed local course catalog and authenticated order endpoints. There is no FuOverflow integration or automatic charge.
- Each order snapshots the course title and URL; catalog edits do not rewrite order history.
- A per-user request UUID deduplicates retries, including concurrent submissions.
- Status updates use a conditional write against the expected status. Members can cancel only their own pending orders.
- Account passwords use authenticated encryption with a dedicated environment key. Lists and mutation responses explicitly exclude credentials.
- Admins reveal credentials through a separate authenticated, rate-limited endpoint. The last viewer and view time are recorded.
- Terminal status updates erase the encrypted password in the same write. Terminal orders cannot be reopened.
- Coursera responses use no-store; unexpected persistence failures return a sanitized error without logging account details.
- Migration 0073 is additive. Apply migrations and deploy the backend before the frontend.
- Configure COURSERA_ENCRYPTION_KEY with a securely generated 32-byte key encoded as 64 hexadecimal characters. Keep it outside source control and retain it while active orders exist; replacing it makes existing credentials unreadable.
- Admins must populate the course catalog before members can place orders. No sample courses are inserted into live data.
- Catalog search uses bounded substring queries for the initial small catalog. Measure before introducing full-text search as it grows.
