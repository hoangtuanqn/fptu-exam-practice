# Product Marketing Context

**Document version:** v1
**Last updated:** 2026-11-11

Drafted from the repo (README, BRAND.md, landing copy, plan constants, SEO config). Items marked **TODO(owner)** need real data from the owner; they are not guesses. Do not put secrets, internal limits or infrastructure details in this file.

## Product Overview
**One-liner:** FEPass (Luyện thi FE FPTU): paste a FuOverflow link and get an FE exam with AI answers, per-question AI explanations and a 10-point score.
**What it does:** Imports FE exams from the FuOverflow exam library, lets students practise or sit a timed mock, grades on a 10-point scale, keeps history, and adds a spaced-repetition wrong-answer notebook, topic strength reports and a "frequently asked questions" view per subject. AI solves answers and explains each question.
**Product category:** Exam practice web app for FPT University FE exams (plus a Chrome extension).
**Product type:** Freemium web app with a prepaid credit wallet (1 credit = 1 VND).
**Business model:** Free to import and practise. Pay-as-you-go credits for exam fetch, AI explanation per question, an "unlock whole exam" bundle and PE download. Plans: Pro (one payment, 4 months, 99,000đ) and Pro Sprint (14 days, 29,000đ). No auto-renewal. Top-up by bank transfer/QR with bonus tiers. Free hooks: signup credit, daily check-in, giftcodes, referrals, free explanation trials, watch-a-link-earn-turns.

## Target Audience
**Target users:** FPT University students (about 18-22) preparing for FE exams, mostly on phones, price-sensitive, paying by bank transfer/QR. Demand peaks in exam season.
**Decision-makers:** The student themself (no separate buyer).
**Primary use case:** Practise real FE exams and understand why an answer is wrong, quickly and cheaply.
**Jobs to be done:**
- Find out if I will pass this subject and what to study next.
- Understand my mistakes without hunting through forum comments.
- Not pay for a whole FuOverflow VIP when I only need a few weeks.
**Use cases:** Last-minute cram before an exam; steady semester revision; reviewing wrong answers daily.

## Problems & Pain Points
**Core problem:** FE exam answers on forums are scattered, unverified and unexplained; students do not know which answers are right or why.
**Why alternatives fall short:** Forum threads have conflicting comments; the original VIP gives access but no scoring, explanations or review loop.
**What it costs them:** Time before exams, failed or retaken subjects, and fees.
**Emotional tension:** Exam anxiety, fear of failing a subject, budget stress.

## Competitive Landscape
**Direct:** FuOverflow VIP (the source library; 192,000đ for the same 4-month period). Gives access to exams, not practice tooling.
**Secondary:** Class group chats, shared drives, photos of old exams.
**Indirect:** Studying from slides/notes only; asking friends.
**TODO(owner):** other FE-practice sites or apps students actually mention.

## Differentiation
**Key differentiators:**
- One link in, a full practice session out (answers, scoring, explanations).
- AI explanation per question, free forever once bought.
- Wrong-answer notebook with spaced repetition and topic strength report.
- Honest pricing: pay once, no auto-renew, cheaper than the VIP alternative.
**Why customers choose us:** Faster understanding for less money than the alternative.

## Objections
| Objection | Response |
|---|---|
| Is the AI answer correct? | Answers are cross-checked with exam comments and the result screen says when an answer is AI-derived. **TODO(owner):** publish a measured accuracy figure before claiming one. |
| Will I be charged without noticing? | Charges are shown before paying; Pro is a one-time payment with no auto-renewal. |
| I only need it for two weeks. | Pro Sprint (14 days). |

**Anti-persona:** Students who need no practice or only want the original forum access; users expecting guaranteed pass results.

## Switching Dynamics
**Push:** Scattered, unexplained answers; time pressure before exams.
**Pull:** Score on a 10-point scale in minutes, explanations, review loop.
**Habit:** Sharing photos in class chats and reading forum comments.
**Anxiety:** "Is the answer right?", "Will it eat my credit?", paying a stranger's site by bank transfer.

## Customer Language
**TODO(owner):** collect real verbatims (support chat, Facebook comments, reviews). None are recorded yet, so none are invented here.
**Words to use:** đề FE, luyện đề, điểm thang 10, giải thích từng câu, sổ câu sai, ôn gấp.
**Words to avoid:** corporate or English marketing jargon; fake urgency; guarantees of passing.
**Glossary:**
| Term | Meaning |
|---|---|
| credit | Wallet unit, 1 credit = 1 VND |
| Pro / Pro Nước rút | 4-month plan / 14-day plan, same benefits |
| Sổ câu sai | Spaced-repetition notebook of wrong answers |
| Cóc Pass | The mascot |

## Brand Voice
Source of truth: `BRAND.md` (colours, fonts, mascot). Voice: short, casual, Gen Z student tone, Vietnamese; plain words; honest about prices and limits. Friendly mascot, never pushy.
**Tone by context:**
- Support: calm, direct, fix first.
- Launch: what changed and why it helps, in one or two lines.
- Errors: say what happened and what to do next; never blame the user.
- Sales: show the real price and the real saving; always an easy "not now".
**Never use (and why):** fake countdowns, fake "X people buying now", confirm-shaming, pressure on low-balance users (they erode trust, which is the only long-term asset for this audience).

## Proof Points
**Metrics:** Saving versus the alternative: 93,000đ over 4 months (192,000đ vs 99,000đ).
**Testimonials / customers:** **TODO(owner):** none recorded.
**Value themes:**
| Theme | Proof |
|---|---|
| Cheaper than the alternative | 99,000đ vs 192,000đ, shown on the Pro page |
| Understand, not just memorise | Per-question AI explanation, wrong-answer notebook |

## Goals
**Business goal:** Sustainable revenue from Pro and credit top-ups without hurting trust.
**Conversion action:** Register, import the first exam, submit the first attempt, then Pro or top-up.
**Current metrics:** Admin funnel (registered, verified, first exam, first submit, deposit, Pro) is measured in the database. Prompt-level metrics start with the prompt-event tracking (see `docs/marketing/tracking-plan.md`).

## Learnings
| Date | Learning | Evidence | Applies to | Status |
|---|---|---|---|---|
| | | | | |

## Changelog
- v1 (2026-11-11) — Initial context drafted from the repo.
