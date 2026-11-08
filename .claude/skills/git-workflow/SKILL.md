---
name: git-workflow
description: How to create branches, commit and open PRs in this repo. Use for EVERY task that changes files (feature, fix, refactor, docs, chore) before the first edit and at every commit.
---

# Git workflow

## 1. One task = one branch

Before editing anything:

```
git checkout main && git pull
git checkout -b <type>/<short-kebab-description>
```

- Branch type = commit type: `feat/`, `fix/`, `refactor/`, `docs/`, `chore/`, `test/`, `perf/`, `style/`.
- Name: 2-5 English words, lowercase, hyphens: `feat/exam-store-tabs`, `fix/page-titles`.
- Never commit on `main`. Never reuse a merged branch for a new task.
- If the task depends on an unmerged branch, branch from that one and say so in the PR.

## 2. Commit as small as possible

- One logical change per commit: a new file, one fix, one rename, one migration. If the message needs "and", split it.
- Stage explicitly (`git add <files>`), never `git add -A` blindly. Check `git status` and `git diff --staged` first.
- Commit as you go, do not batch a whole task into one commit.
- Renames/moves in their own commit, separate from edits.

## 3. Message format

```
<type>: <subject>
```

- Types: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `perf`, `style`, `build`, `ci`.
- English only. No Vietnamese, no emoji.
- Imperative, lowercase, no trailing period, at most 72 characters: `fix: show every subject in the picker`.
- Concise: say what changed, not how. No body unless the reason is not obvious (then 1-3 short lines).
- Optional scope only when it adds clarity: `fix(backend): ...`, `feat(extension): ...`.
- Never add `Co-Authored-By`, "Generated with", or any AI attribution.

Good: `feat: add exam store subject tab`, `fix: clamp page after deleting last row`, `chore: ignore codegraph index`.
Bad: `update stuff`, `fix bug`, `Feat: Thêm tab mới`, `feat: add tab and fix titles and refactor api`.

## 4. Pull requests

- One PR per branch, opened only when the task is done. Title follows the commit style (English). Body: 2-5 short English bullets (what, why, how it was verified, anything not verified).
- Push with `git push -u origin HEAD`. Do not force-push shared branches.
- Do not merge unless the user says to. When asked to merge several PRs, merge in dependency order and resolve conflicts by keeping both sides.
- Never commit: `.env*`, exported data files (`fuo-catalog-*.json`, `flm-syllabus-*.json`), `.codegraph/`, build output, personal paths, IPs or keys.

## 5. Checklist before every commit

1. On a task branch (not `main`).
2. Only the files of this change are staged.
3. Message matches `<type>: <subject>`, English, <= 72 chars.
4. No secrets or personal data in the diff.
