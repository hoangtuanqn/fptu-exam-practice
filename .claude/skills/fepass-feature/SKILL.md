---
name: fepass-feature
description: Orchestrates a multi-part FEPass task (backend + frontend, new endpoint with UI, schema change with screens) using the backend-engineer, frontend-engineer and qa-reviewer agents. Use when a request spans both `backend/` and `frontend/`, or is large enough to review separately. Also use for follow-ups such as "fix the QA findings", "redo the frontend part", "update the feature", "rerun the review". Do not use for one-file fixes, questions, deploys (see `deploy-checklist`) or marketing work.
---

# FEPass feature orchestrator

**Execution mode:** sub-agent delegation (one-shot `Agent` calls), producer-reviewer pattern. Reason: the parts are independent briefs, and the reviewer must not share the author's context.

## Phase 0: context

1. Read the request. If this is a follow-up, check the current branch (`git status -sb`) and `_workspace/` for earlier reports; rerun only the affected phase.
2. Follow `git-workflow`: new branch from up-to-date `main`. The orchestrator is the only one who runs git.
3. Split the request into a backend brief and a frontend brief. State the API contract (endpoint, request, response) in both so they agree. If a part is empty, skip that agent.

## Phase 1: build

- Backend first when the frontend needs a new endpoint. Call `Agent` with `subagent_type: "backend-engineer"` and its brief.
- Then `Agent` with `subagent_type: "frontend-engineer"`, passing the backend engineer's reported response shapes.
- Independent parts (no new endpoint needed) run in parallel in one message.
- Save each report to `_workspace/{phase}_{agent}_report.md` (keep `_workspace/` untracked; never commit it).

## Phase 2: review

Call `Agent` with `subagent_type: "qa-reviewer"` with the brief, the changed file list and the contract. It reads the diff and runs type-check and build.

- `PASS`: go to phase 3.
- `NEEDS FIXES`: send the findings to the matching engineer (new `Agent` call with the findings and file paths), then run QA once more. Stop after two fix rounds and report what is still open.

## Phase 3: commit and report

1. Commit small, per `git-workflow` (explicit `git add <files>`, one logical change per commit, English `<type>: <subject>`, no AI attribution). Migration in its own commit.
2. If users will notice the change, apply `changelog-entry`.
3. Do not merge, push to `main`, deploy or touch production unless the user asked in that message.
4. Final report: what changed, what QA ran and found, what was NOT verified (browser, live server, real data), and follow-ups for the user (migrate, deploy order: backend first).

## Error handling

- An agent fails or returns nothing: retry once with a shorter brief; if it fails again, do that part yourself or report it as missing. Never fill in an agent's findings from guesses.
- Conflicting reports: keep both with their source and decide with the user.
- Permission denied or usage limit: do not retry; report and stop.

## Test scenarios

- **Normal:** "Add a Notes tab to the subject page with a notes endpoint." Backend adds route/service/repo and migration; frontend adds tab, api file, SEO entry; QA runs typecheck and build, finds nothing, orchestrator commits in small steps.
- **Error:** QA reports the frontend reads `data.items` while the backend returns a plain array. Orchestrator sends the finding to the frontend engineer, QA reruns and passes. If it still fails after two rounds, the open finding is reported to the user.
