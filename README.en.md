# xpub · Markdown → X Article drafts

[简体中文](README.md) | **English**

Turn a Markdown file (with images) into an **X Articles draft** — title, body, inline images and cover all in place.
**Drafts only. Nothing is published automatically** — publishing always stays with the author.

- No official X API key needed — it reuses your own browser session
- No plugins, no Obsidian, no browser extensions
- ~15 seconds for a 150-block article with 9 images
- Supports updating an existing draft, so re-edits don't pile up duplicate drafts

> ⚠️ Uses X's internal web endpoints (unofficial API). It may break when X ships changes. See [docs/LIMITS.md](docs/LIMITS.md).

## Why this exists

The usual way to automate long-form posting on X is a browser plugin that simulates clicks. In practice that is fragile: every image needs “open file dialog → pick file → poll the DOM until the image block appears → confirm binding”. With many images it stalls — we hit failures on the 3rd and the 7th image.

xpub takes a different route: **call the endpoints instead of clicking the UI.**

```
upload media → upload.x.com  INIT / APPEND / FINALIZE
write body   → ArticleEntityUpdateContent (one call, DraftJS with image positions)
set cover    → ArticleEntityUpdateCoverMedia
```

The result: stable, fast, positions exact, and not tied to any plugin's release cycle.

## Install

```bash
git clone https://github.com/avabb0916/x-md-publisher.git
cd x-md-publisher
npm install
```

Requires Node.js ≥ 20 and a local Chrome.

## Quick start

**1. Launch a dedicated Chrome (separate profile, your daily browser stays untouched)**

```bash
bash scripts/chrome-debug.sh
```

A Chrome window opens. **Log into X once there**; the session is stored in `~/.xpub-chrome-profile`.

**2. Dry run (no network, no draft created)**

```bash
node bin/xpub.mjs --dry-run examples/sample-article.md
```

It prints the title, block count, image count and cover file.

**3. Create the draft**

```bash
node bin/xpub.mjs examples/sample-article.md --cover examples/images/cover.png
```

Sample output:

```json
{
  "ok": true,
  "articleId": "1234567890",
  "savedBlocks": 104,
  "savedMedia": 5,
  "draftUrl": "https://x.com/compose/articles/edit/1234567890"
}
```

Open `draftUrl`, review it, then **publish it yourself**.

## Usage

```bash
xpub <article.md> [options]
```

| Option | Description |
|---|---|
| `--cover <file>` | Cover image (falls back to `cover_image` in frontmatter) |
| `--no-cover` | Do not set a cover |
| `--title <title>` | Override the title (defaults to the first `#` heading) |
| `--article <id>` | **Update an existing draft** instead of creating a new one |
| `--dry-run` | Parse only, no network |
| `--port <port>` | CDP port, default 9222 |
| `--profile <dir>` | Dedicated Chrome profile directory |
| `--verbose` | Print upload details |

Environment variables: `XPUB_CDP_PORT`, `XPUB_CHROME`, `XPUB_CHROME_PROFILE`, `XPUB_CONFIG_DIR`, `XPUB_BEARER`.

## Markdown support

| Syntax | Result |
|---|---|
| `# Heading` | First one becomes the article title, others dropped |
| `## Heading` | Real heading (header-two) |
| `### Heading` | Downgraded to a `▍Heading` paragraph (X has no header-three) |
| `- item` | Native list item |
| `> quote` | Blockquote |
| `![[image]]` / `![](image)` | Inline image, inserted at its position in the flow |
| `**bold**` | **Style stripped** (X Article API rejects inline styles), text kept |
| Tables / code fences | Dropped (unsupported by X) |

Frontmatter:

```yaml
---
title: Article title
cover_image: images/cover.png
---
```

## FAQ

**Does the script get my password?**
No. It only uses the session cookie already present in your Chrome profile; nothing leaves your machine.

**Can it publish automatically?**
No, by design. Publishing is an editorial responsibility and stays with the author. xpub stops at the draft.

**Why is my cover cropped?**
X article covers are 5:2, and feed previews crop again to roughly 1.91:1. Keep key content inside the centered safe area.

**Any limits on length or image count?**
We did not hit a hard limit on body size (tested 150 blocks / 9 images). However, **the draft-creation endpoint accepts only ~15 blocks at a time**, which is why xpub creates an empty draft first and then writes the body separately.

More: [docs/FAQ.md](docs/FAQ.md) and [docs/LIMITS.md](docs/LIMITS.md).

## Project layout

```
bin/xpub.mjs        CLI entry
lib/config.mjs      Configuration and defaults (no hard-coded local paths)
lib/chrome.mjs      Dedicated Chrome launch + CDP connection
lib/md.mjs          Markdown → X blocks
lib/x.mjs           Media upload + GraphQL wrappers
scripts/chrome-debug.sh
examples/           Sample article and images
docs/               SETUP / LIMITS / FAQ
```

## Disclaimer

This project uses X's internal web endpoints. It is unofficial and may break whenever X changes. Comply with X's Terms of Service at your own risk.
It is not intended for spam, bulk automation, or posting content on behalf of others.

## License

MIT
