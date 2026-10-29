# xpub · Markdown → X Article drafts

Turn a Markdown file (with images) into an **X Articles draft** — title, body, inline images and cover in place.
**Drafts only. Nothing is published automatically.**

- No official X API key needed — it reuses your own browser session
- No plugins, no extensions
- ~15s for a 150-block article with 9 images
- Supports updating an existing draft (`--article <id>`)

> ⚠️ Uses X's internal web endpoints (unofficial). May break when X changes. See [docs/LIMITS.md](docs/LIMITS.md).

## Install

```bash
git clone <this-repo> && cd x-md-publisher
npm install
```

Requires Node.js ≥ 20 and a local Chrome.

## Quick start

```bash
bash scripts/chrome-debug.sh            # log into x.com once in the opened window
node bin/xpub.mjs --dry-run examples/sample-article.md
node bin/xpub.mjs examples/sample-article.md --cover examples/images/cover.png
```

Output includes `draftUrl` — open it, review, publish yourself.

## Options

`--cover` `--no-cover` `--title` `--article <id>` `--dry-run` `--port` `--profile` `--verbose`

## Why not UI automation?

Simulating clicks (open file dialog → select → poll DOM → confirm) breaks with many images. xpub calls the endpoints directly: `upload.x.com` INIT/APPEND/FINALIZE for media, then one GraphQL call to write the whole body with image positions.

MIT licensed.
