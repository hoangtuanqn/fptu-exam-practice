---
name: changelog-entry
description: How to write entries in the public changelog ("Co gi moi" page and What's New dialog). Use when a user-visible feature or fix is about to ship.
---

# Changelog entry

File: `frontend/src/features/changelog/changelog.json` with two lists, `web` and `extension`, newest first.

```json
{ "version": "1.6.0", "date": "2026-11-08", "title": "...", "highlights": ["..."], "changes": [{ "type": "new|improved|fixed", "text": "..." }] }
```

## Rules

- Only changes a user can see or feel. No refactors, infra, endpoints, URLs, limits, schedules, retention periods, prices of internal operations, security internals, or names of internal tools.
- Vietnamese, one short line per change, benefit first ("Biet minh yeu chu de nao", not "Added topic table").
- At most 3 highlights and about 8 changes per version. Merge related items.
- The newest `web` version drives the What's New dialog: a new version number shows the dialog to every user. Do not bump the version for every PR; fold work that ships together into one version. Add to the current unreleased version if it has not been deployed yet.
- `type`: `new` (new capability), `improved` (existing thing better), `fixed` (bug).
- Extension: the newest `extension` version must equal `chrome-extension/manifest.json` version (the release script warns on mismatch).
- Validate the JSON after editing: `node -e "require('./frontend/src/features/changelog/changelog.json')"`.
