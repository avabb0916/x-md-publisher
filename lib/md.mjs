// Markdown → X Article blocks
// 支持: # 标题(取第一个作文章标题) / ## 二级标题 / ### 降级为 ▍段落（X 不支持 header-three）
// 列表 / 引用 / 图片(![[...]] 或 ![](...)) / **加粗**（X 文章 API 不接受 inline style，故剥离）
// 表格与代码块会被丢弃（X 不支持）
import fs from 'fs';
import path from 'path';

export function parseInline(raw) {
  let out = '';
  let boldOn = false;
  let start = 0;
  const ranges = [];
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === '*' && raw[i + 1] === '*') {
      if (boldOn) {
        const len = out.length - start;
        if (len > 0) ranges.push({ offset: start, length: len, style: 'bold' });
        boldOn = false;
      } else {
        start = out.length;
        boldOn = true;
      }
      i++;
      continue;
    }
    out += raw[i];
  }
  return { text: out.replace(/`/g, ''), ranges };
}

export function parseMarkdown(mdText, { baseDir = process.cwd() } = {}) {
  let text = mdText;
  if (text.startsWith('---')) {
    const idx = text.indexOf('\n---', 3);
    if (idx > 0) text = text.slice(idx + 4);
  }
  let title = '';
  let inFence = false;
  let inTable = false;
  const blocks = [];
  const imagePaths = [];

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (line.startsWith('```')) { inFence = !inFence; continue; }
    if (inFence) continue;
    if (!line) { inTable = false; continue; }

    // 表格：跳过表头与分隔行，单元格内容丢弃（也可以自行改成列表）
    if (line.startsWith('|')) { inTable = true; continue; }
    if (inTable) { inTable = false; }

    let m;
    if (!title && (m = line.match(/^#\s+(.+)$/))) { title = m[1].trim(); continue; }
    if (/^#\s+/.test(line)) continue;                    // 多余 H1 丢弃
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) continue;    // 分隔线
    if ((m = line.match(/^##\s+(.+)$/))) { blocks.push({ type: 'header-two', text: parseInline(m[1]).text }); continue; }
    if ((m = line.match(/^###\s+(.+)$/))) {               // X 不支持 header-three → ▍段落
      blocks.push({ type: 'unstyled', text: '▍' + parseInline(m[1]).text, ranges: [] });
      continue;
    }
    if ((m = line.match(/^[-*]\s+(.+)$/))) { blocks.push({ type: 'unordered-list-item', ...parseInline(m[1]) }); continue; }
    if ((m = line.match(/^>\s*(.+)$/))) { blocks.push({ type: 'blockquote', ...parseInline(m[1]) }); continue; }
    if ((m = line.match(/!\[\[([^\]]+)\]\]/)) || (m = line.match(/!\[[^\]]*\]\(([^)]+)\)/))) {
      let p = m[1].trim();
      if (!path.isAbsolute(p)) {
        const relMd = path.resolve(baseDir, p);
        p = fs.existsSync(relMd) ? relMd : path.resolve(process.cwd(), p);
      }
      blocks.push({ type: 'image', image: p });
      imagePaths.push(p);
      continue;
    }
    blocks.push({ type: 'unstyled', ...parseInline(line) });
  }

  return { title, blocks, imagePaths };
}

export function readMarkdown(file) {
  if (!fs.existsSync(file)) throw new Error('找不到 Markdown 文件: ' + file);
  return parseMarkdown(fs.readFileSync(file, 'utf8'), { baseDir: path.dirname(path.resolve(file)) });
}

// 组装 X 的 content_state（DraftJS 变体：snake_case + entity_map）
export function buildContentState(parsed, uploadedByPath, { randomUUID }) {
  const content = { blocks: [], entity_map: [] };
  let n = 0;
  const key = () => (n++).toString(36).padStart(5, '0');
  let localMedia = 0;

  for (const b of parsed.blocks) {
    if (b.type === 'image') {
      const up = uploadedByPath[b.image];
      if (!up || !up.ok) continue;
      localMedia++;
      const ek = String(content.entity_map.length);
      content.entity_map.push({
        key: ek,
        value: {
          type: 'MEDIA',
          mutability: 'Immutable',
          data: {
            entity_key: randomUUID(),
            media_items: [{ local_media_id: localMedia, media_category: 'DraftTweetImage', media_id: up.mediaId }],
          },
        },
      });
      content.blocks.push({
        data: {}, text: ' ', key: key(), type: 'atomic',
        entity_ranges: [{ key: Number(ek), offset: 0, length: 1 }],
        inline_style_ranges: [],
      });
      continue;
    }
    content.blocks.push({
      data: {},
      text: String(b.text || '').replace(/\*\*|`/g, ''),
      key: key(),
      type: b.type,
      entity_ranges: [],
      inline_style_ranges: [],   // X Article API 拒绝所有 inline style
    });
  }
  return content;
}


// 追加文末片段（用于「关于我」等固定结尾）
export function appendFooter(parsed, footerMdPath) {
  if (!footerMdPath || !fs.existsSync(footerMdPath)) return parsed;
  const extra = parseMarkdown(fs.readFileSync(footerMdPath, 'utf8'), { baseDir: path.dirname(footerMdPath) });
  return { ...parsed, blocks: [...parsed.blocks, ...extra.blocks], imagePaths: [...parsed.imagePaths, ...extra.imagePaths] };
}
