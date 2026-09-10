# Yue Douyin Knowledge — independent product specification

This document defines observable behavior only. The implementation starts from an empty repository and does not inherit source code from existing Douyin plugins.

## Goal

Turn Douyin share text, links, keyword search results, and related recommendations into durable Markdown knowledge notes in an Obsidian vault.

## First release scope

1. Desktop-only Obsidian plugin with the unique ID `yue-douyin-knowledge`.
2. Connect to a user-managed HTTP service, defaulting to `http://127.0.0.1:5050`.
3. Check backend health and show actionable dependency status.
4. Import one or many share links, with a maximum of 10 items per batch.
5. Search by keyword and select up to 10 new results.
6. Find related results from a source link.
7. Prevent duplicates across the current vault by the stable `douyin_id` frontmatter field.
8. Prefer knowledge extraction: keep Markdown and metadata; video/audio are not retained by default.
9. Save carousel images inside the vault when enabled.
10. Produce clear Chinese error messages containing stage, error code, and request ID when available.

## Backend contract

### `GET /api/health`

Returns `success`, `pipeline_ready`, and optional dependency details under `checks`.

### `POST /api/video/info`

Request: `{ "url": "share text or URL" }`.

Returns stable identity and metadata including `video_id`, `title`, `author`, `content_type`, `source_url`, and optional media URLs.

### `POST /api/video/extract`

Request fields: `url`, `model`, `transcript_mode`, `keep_media`, and optional `mode`.

Returns `video_id`, `title`, `author`, `content_type`, `text`, `transcript_source`, `source_url`, `download_url`, and `images`.

### `POST /api/video/search`

Request: `{ "query": "...", "limit": 20 }`. Returns `items` containing identity, title, author, content type, and source URL.

### `POST /api/video/related`

Request: `{ "url": "...", "limit": 20 }`. Returns the same discovery item shape.

### Errors

Non-success responses may contain `error`, `error_code`, `stage`, `request_id`, and `retryable`. The plugin must preserve these fields in its user-facing diagnostic message.

## Note contract

Every created note contains YAML frontmatter with:

- `douyin_id`
- `source_url`
- `author`
- `content_type`
- `transcript_source`
- `imported_at`

Duplicate detection is independent of note name or folder. Existing notes remain compatible as long as they contain `douyin_id`.

## Security and privacy

- No analytics or telemetry.
- No paid AI API is required.
- The plugin never reads arbitrary backend filesystem paths.
- Media is fetched through explicit HTTP URLs and written only inside the vault.
- Network usage and the companion service requirement must be disclosed in the README and listing.

