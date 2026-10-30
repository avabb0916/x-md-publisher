#!/usr/bin/env node
// xpub — 把 Markdown 发成 X 文章草稿（含图与封面），不发布，只建草稿。
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import puppeteer from 'puppeteer-core';
import { defaults } from '../lib/config.mjs';
import { ensureChrome } from '../lib/chrome.mjs';
import { readMarkdown, buildContentState, appendFooter } from '../lib/md.mjs';
import { uploadMedia, createDraft, updateContent, setCover } from '../lib/x.mjs';

const args = process.argv.slice(2);
const has = n => args.includes(n);
const flag = (n, d = null) => { const i = args.indexOf(n); return i < 0 ? d : (args[i + 1] ?? d); };
const file = args.find(a => !a.startsWith('--'));

function usage() {
  console.log(`xpub — Markdown → X 文章草稿

用法:
  xpub <article.md> [选项]

选项:
  --cover <图片>        封面图（默认取 frontmatter 的 cover_image）
  --no-cover            不设封面
  --title <标题>        覆盖文章标题（默认取第一个 # 标题）
  --article <id>        更新已有草稿（不新建）
  --dry-run             只解析，不联网、不建草稿
  --port <端口>         CDP 端口（默认 9222 / XPUB_CDP_PORT）
  --profile <目录>      Chrome 独立配置目录（默认 ~/.xpub-chrome-profile）
  --verbose             打印更多过程信息

示例:
  xpub post.md --cover cover.png
  xpub post.md --article 1234567890
  xpub post.md --dry-run
`);
}

if (has('--help') || has('-h')) { usage(); process.exit(0); }
if (!file) { usage(); process.exit(1); }

let parsed = readMarkdown(file);
// 默认文末：~/.config/xpub/footer.md（可用 --no-footer 关闭，--footer 指定）
const FOOTER_DEFAULT = path.join(os.homedir(), '.config', 'xpub', 'footer.md');
if (!has('--no-footer')) {
  const footerPath = flag('--footer', FOOTER_DEFAULT);
  if (fs.existsSync(footerPath)) parsed = appendFooter(parsed, footerPath);
}
const title = flag('--title') || parsed.title;
const coverFromFm = (() => {
  const txt = fs.readFileSync(file, 'utf8');
  const m = txt.match(/cover_image:\s*(.+)/);
  if (!m) return null;
  const p = m[1].trim();
  if (path.isAbsolute(p)) return p;
  const relMd = path.resolve(path.dirname(path.resolve(file)), p);
  return fs.existsSync(relMd) ? relMd : path.resolve(process.cwd(), p);
})();
const cover = has('--no-cover') ? null : (flag('--cover') || coverFromFm);

const summary = {
  file: path.basename(file),
  title,
  blocks: parsed.blocks.length,
  images: parsed.imagePaths.length,
  cover: cover ? path.basename(cover) : null,
};

if (has('--dry-run')) {
  console.log(JSON.stringify({ ok: true, dryRun: true, ...summary }, null, 2));
  process.exit(0);
}

const port = Number(flag('--port', defaults.cdpPort));
const profile = flag('--profile', defaults.chromeProfile);
const verbose = has('--verbose');
const log = (...a) => verbose && console.log(...a);

const { started } = await ensureChrome({ port, profile });
log(started ? '已启动独立 Chrome' : '复用已打开的 Chrome');

const browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${port}`, defaultViewport: null });
const out = { ok: false, ...summary };
try {
  const page = (await browser.pages()).find(p => p.url().includes('x.com')) || await browser.newPage();
  if (!page.url().includes('x.com')) await page.goto('https://x.com/home', { waitUntil: 'domcontentloaded', timeout: 60000 });

  // 1) 上传正文图
  const uploaded = {};
  for (const p of [...new Set(parsed.imagePaths)]) {
    let up = null;
    for (let attempt = 1; attempt <= 3 && !(up && up.ok); attempt++) {
      up = await uploadMedia(page, p);
      if (!up.ok) await new Promise(r => setTimeout(r, 500));
    }
    uploaded[p] = up;
    if (!up || !up.ok) throw new Error('图片上传失败: ' + path.basename(p));
    log('上传', path.basename(p), '→', up.mediaId);
  }
  out.uploaded = Object.values(uploaded).filter(u => u.ok).length;

  // 2) 草稿：新建或复用
  const reuse = flag('--article');
  const articleId = reuse ? String(reuse) : (await createDraft(page, title)).articleId;
  out.articleId = articleId;
  out.reused = !!reuse;

  // 3) 写正文（X 的建草稿接口对块数有上限，所以正文单独写）
  const content = buildContentState(parsed, uploaded, { randomUUID: crypto.randomUUID });
  const saved = await updateContent(page, articleId, content);
  out.savedBlocks = saved.savedBlocks;
  out.savedMedia = saved.savedMedia;
  if (saved.savedBlocks === 0) throw new Error('正文未写入（savedBlocks=0）：检查是否有不支持的块类型');

  // 4) 封面
  if (cover) {
    if (!fs.existsSync(cover)) throw new Error('封面文件不存在: ' + cover);
    let up = uploaded[cover] || await uploadMedia(page, cover);
    if (up && up.ok) {
      const r = await setCover(page, articleId, up.mediaId);
      out.cover = { ok: r.ok, status: r.status };
    }
  }

  out.draftUrl = `https://x.com/compose/articles/edit/${articleId}`;
  out.ok = true;
} catch (e) {
  out.error = String(e).slice(0, 400);
} finally {
  try { await browser.disconnect(); } catch { }
  console.log(JSON.stringify(out, null, 2));
  process.exit(out.ok ? 0 : 1);
}
