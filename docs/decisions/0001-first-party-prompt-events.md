# 0001 First-party prompt events

**Context.** Three upgrade/top-up prompts (result dialog, notebook cap, deposit bonus tier) shipped with admin switches but no way to know if they work. The admin funnel only reads existing tables (registered, verified, first exam, first submit, deposit, Pro).

**Decision.** Record `shown`, `click` and `dismiss` for each prompt in a small table `prompt_events` (migration 0052) through `POST /events/prompt` (login required, rate limited, surface and event names validated against a fixed list). The admin funnel page reads a per-prompt summary. No third-party analytics service, no cookies, no device identifiers; rows hold only the user id, prompt name, event name and time, and are deleted with the user.

**Consequences.**
- Prompts can be measured and switched off with evidence. Click rate = click / shown.
- Frequency cap keeps rows close to one per user per prompt per week, so the table stays small. If it grows, add a retention job.
- Adding a prompt means adding its name to `backend/src/constants/prompt-event.ts` and `frontend/src/shared/utils/trackPrompt.ts`.
- This measures prompts only. Revenue attribution (did a click become a purchase) joins `prompt_events` with `plan_purchases` / deposits by user and time; it is not automated yet.
