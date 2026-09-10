# Yue Douyin Knowledge

Import Douyin captions, keyword search results, and related recommendations into a local Obsidian Markdown knowledge base.

> This is an independent implementation created from a product and HTTP interface specification. It does not inherit source code or Git history from existing Douyin plugins.

## Features

- Import one share link or a batch of up to 10 links.
- Search Douyin by keyword and select results for import.
- Discover related content from a source link.
- Skip anything already stored in the current vault by its stable `douyin_id`.
- Prefer visible-caption OCR, with local Whisper speech recognition as fallback.
- Keep knowledge notes and metadata while temporary video/audio files are removed by the companion service.
- Save carousel images inside the vault when enabled.
- Show structured diagnostics with processing stage, error code, and request ID.

## Requirements

- Obsidian desktop 1.4.0 or newer.
- The separately installed Yue Douyin Knowledge companion service.
- Windows 10 or Windows 11 is the supported platform for the first release.
- FFmpeg and local transcription/OCR dependencies used by the companion service.

## Network and privacy disclosure

This plugin connects to the service URL configured in its settings. The default is the local address `http://127.0.0.1:5050`. The companion service connects to Douyin to resolve public share links, perform keyword searches, retrieve public media, and find related public content.

The plugin contains no analytics or client-side telemetry. It does not require a paid AI API. Notes and downloaded carousel images are written only to the current Obsidian vault. Video and audio are temporary by default and are removed by the companion service after knowledge extraction.

The companion service may use a local browser profile for a user-initiated Douyin login. Browser profiles, cookies, logs, cached models, and downloaded media are never part of this plugin repository or its releases.

## Install for development

1. Install dependencies with `npm install`.
2. Run `npm run check`.
3. Copy `main.js`, `manifest.json`, and `styles.css` into:

   `<vault>/.obsidian/plugins/yue-douyin-knowledge/`

4. Restart Obsidian and enable **Yue Douyin Knowledge** under Community plugins.
5. Start the companion service and use **Check local service connection** from the command palette.

## Use

- Run **Import Douyin knowledge** to paste one or more share links.
- Run **Search or discover Douyin knowledge** for keyword search or related recommendations.
- Existing notes created by earlier tools remain protected from duplicates when their frontmatter contains `douyin_id`.

## Companion service

Companion service: [yuegu7800/yue-douyin-knowledge-backend](https://github.com/yuegu7800/yue-douyin-knowledge-backend). Its Windows launcher starts the local service, asks which Obsidian vault to open, and installs/enables this plugin in that selected vault. The plugin keeps the existing API paths `/api/health`, `/api/video/info`, `/api/video/extract`, `/api/video/search`, and `/api/video/related`.

## License

[MIT](LICENSE)
