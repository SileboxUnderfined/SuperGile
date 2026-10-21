# Changelog

## 0.1.1 — 2026-10-21

- Requires Super Productivity 19.2.0: earlier versions lack the plugin API for time logging and batch refresh.
- Escape double quotes when notes are sent to YouGile, so a link cannot break out of its `href`.

## 0.1.0 — 2026-10-21

First version.

- Imports open YouGile tasks assigned to you into the project backlog.
- Two-way sync of done state, title, deadline (day or date-time) and time estimate.
- Description pulled from YouGile, HTML converted to Markdown.
- Tracked time added to YouGile's spent hours when a task is done.
- Tasks deleted in YouGile are removed from Super Productivity.
- `npm run api-key` helper to get a YouGile API key.
