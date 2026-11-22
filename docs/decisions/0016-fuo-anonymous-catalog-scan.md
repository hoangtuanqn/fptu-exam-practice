# 0016 Anonymous, parallel FuOverflow catalog scan ("Load dữ liệu mới")

## Context
The FuOverflow account used by the crawler was locked once. "Load dữ liệu mới" used the stored cookie, could log in with the stored account, and paused for a fixed time between pages, so it was both risky and slow. Subject index and forum listing pages are public.

## Decision
- "Load dữ liệu mới" now only scans the catalog (subject index + forum listing pages). It records new thread names in `fuo_threads` and per-subject counts in `fuo_catalog_subjects.threads_new`. It does not start an import run. `fuoSourceService.startImport` keeps the old import path, but no route calls it.
- The catalog scan uses `createAnonymousFuoClient` (`services/crawler/fuo-anon-client.ts`): no cookie, referer or credentials, a generic browser User-Agent, and no login fallback. A page that needs login fails only that subject. After `FUO_CATALOG_LOGIN_STREAK_MAX` such failures in a row, the run stops.
- All anonymous requests in the process share one AIMD limiter (`utils/adaptive-limiter.ts`). It starts at 12 in flight and never goes above 24. It adds 1 after 10 successes and halves (floor 2) on 429/503/504, Cloudflare challenges, timeouts or resets. It honours Retry-After (capped at 60 s) by pausing every anonymous request. If it stays congested at the floor, it pauses for a long cool-down, and the run stops after `FUO_CATALOG_COOLDOWNS_MAX` cool-downs. Subjects and pages are fetched concurrently, with no fixed pauses.
- User crawl jobs, PE downloads and admin tools keep the cookie client unchanged.

## Consequences
- Much faster scans. The risk moves from the account to the server IP (rate limits or an IP ban), which the limiter and its stop rules are meant to contain.
- The limiter state lives in memory, per process (single PM2 process).
