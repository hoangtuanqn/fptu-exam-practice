# Tracking plan

Follows the `analytics` skill. Rule: measure only what a decision needs, first-party, no personal data beyond the user id.

## Already measured (from the database, admin funnel page)
| Step | Source |
|---|---|
| Registered | users |
| Verified email | users.emailVerifiedAt |
| First exam fetched | exams in the user's store |
| First submit | exam attempts |
| Deposited | paid deposit orders |
| Bought Pro | plan purchases |
Also: exam fetch failure rate, unpaid deposit orders, abandoned practice sessions.

## Measured since migration 0052 (prompt events)
Event names are `<surface>.<event>`.
| Surface | Shown when | Click | Dismiss |
|---|---|---|---|
| `result-upgrade` | Result dialog, free logged-in user with 3 or more wrong answers, within frequency cap | Link to /pro | X button |
| `review-cap` | Wrong-answer notebook nearly full, within frequency cap | Link to /pro | X button |
| `first-run` | Home page, logged-in member who has not submitted a first attempt, once per session | Any step link in the checklist | X button (stays hidden afterwards) |
| `deposit-tier` | Deposit amount is close to the next bonus tier, once per visit | "Nạp {amount}" button | none (inline hint) |
| `library-page` | Public exam library (/kho-de) opened | none | none |
| `library-open` | none | Click on the open button of an exam in the public library | none |

Definitions: click rate = click / shown, dismiss rate = dismiss / shown. A "shown" row is written when the prompt appears, not on each re-render.

## Not measured yet (decide before building)
| Gap | Why it matters | Suggested approach |
|---|---|---|
| Visitor to signup (guests) | Cannot tell how many landing visitors register | Server-side count of landing hits is not available; needs an analytics tool, which is a separate decision (cost, privacy notice) |
| Prompt click to purchase | Revenue per prompt | Join `prompt_events` with plan purchases and paid deposits by user within 24 hours (query, no new data) |
| Signup form drop-off | Evaluate the shorter form (3 fields) | Compare registered per day before and after; there is no field-level tracking |
| Variant assignment | A/B tests need random, sticky assignment | Not built; see `experiments.md` |

## Metric hygiene
- Rates divide matching windows: events in a period over users or sessions in the same period.
- Exclude admin and impersonated sessions from every report.
- Do not log question text, emails or balances in events.
