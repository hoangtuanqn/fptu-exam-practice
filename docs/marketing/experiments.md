# Experiment plan

Follows the `ab-testing` skill. All tests: two-sided, alpha 0.05, power 80%, equal split, one primary metric per test.

## Prerequisites (nothing here can run yet)
1. **Variant assignment** is not built. It must be random, sticky per user (hash of user id), and stored with the events.
2. **Baselines** below are assumptions. Replace them with measured rates from `prompt_events` and the funnel after two weeks of data.
3. **Traffic.** Check weekly eligible users on the funnel page. If the needed sample would take more than 6 weeks, do not run a split test; use a before/after read and treat it as weak evidence.

## Tests
| # | Hypothesis | Primary metric | Guardrails | Assumed baseline to target | Per arm |
|---|---|---|---|---|---|
| A | On the result dialog, showing the real one-by-one explanation total next to the Pro price gets more clicks to /pro than a generic "Xem gói Pro" | Click rate of `result-upgrade` | Dismiss rate, practice-page bounce, support complaints | 3% to 4.5% | 2,518 |
| B | The notebook cap warning at 80% full raises Pro purchases within 7 days among users who saw it | Pro purchase within 7 days of `shown` | Refund requests, dismiss rate | 2% to 3% | 3,826 |
| C | Showing the gap to the next deposit bonus tier raises the share of deposits that reach a higher tier | Share of paid deposits at or above the next tier | Abandoned deposit orders, refund requests | 15% to 20% | 906 |

Sample sizes are users (or deposits for C) per arm. Run for at least one full week so weekday and exam-week effects are balanced.

## Stop rules
- Decide the sample and duration before starting; do not stop early on a good-looking number.
- Stop at once if a guardrail worsens clearly (complaints, refunds, practice bounce) and switch the prompt off in the admin promo settings.
- Log results in `.agents/product-marketing.md` under Learnings (status `active`, `watch` or `retired`).
