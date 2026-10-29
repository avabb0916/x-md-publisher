// X 网页端内部接口封装（session cookie + 公开 bearer）
// 注意：这些是 X 网页端的内部接口，非官方公开 API，可能随版本变化。
import fs from 'fs';
import crypto from 'crypto';
import { defaults } from './config.mjs';

export const OPS = {
  draftCreate: { name: 'ArticleEntityDraftCreate', id: 'fCkdrI6zrnw_UtVa3WDHhw' },
  updateContent: { name: 'ArticleEntityUpdateContent', id: 'FMC9CKP145f5wgXYCsmtiA' },
  updateCover: { name: 'ArticleEntityUpdateCoverMedia', id: 'Rlvhkuecg1z_7O5vC2G1fQ' },
};

export const FEATURES = {
  profile_label_improvements_pcf_label_in_post_enabled: true,
  responsive_web_profile_redirect_enabled: true,
  rweb_tipjar_consumption_enabled: false,
  verified_phone_label_enabled: false,
  responsive_web_graphql_timeline_navigation_enabled: true,
};

export async function getCsrf(page) {
  const cookies = await page.cookies('https://x.com');
  const ct0 = cookies.find(c => c.name === 'ct0')?.value;
  const auth = cookies.find(c => c.name === 'auth_token')?.value;
  if (!auth || !ct0) {
    throw new Error('未登录 X：请在自动化 Chrome 窗口里登录一次（登录态会保存到独立 profile）。');
  }
  return ct0;
}

export async function gql(page, op, variables, { bearer = defaults.bearer } = {}) {
  const csrf = await getCsrf(page);
  return page.evaluate(async ({ opName, opId, variables, features, bearer, csrf }) => {
    const res = await fetch(`https://x.com/i/api/graphql/${opId}/${opName}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        authorization: 'Bearer ' + bearer,
        'x-csrf-token': csrf,
        'x-twitter-active-user': 'yes',
        'x-twitter-auth-type': 'OAuth2Session',
        'x-twitter-client-language': 'zh-cn',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ variables, features, queryId: opId }),
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { }
    return { status: res.status, json, raw: text.slice(0, 800) };
  }, { opName: op.name, opId: op.id, variables, features: FEATURES, bearer, csrf });
}

export async function uploadMedia(page, filePath, { mediaCategory = 'tweet_image' } = {}) {
  const buf = fs.readFileSync(filePath);
  const b64 = buf.toString('base64');
  const md5 = crypto.createHash('md5').update(buf).digest('hex');
  const mime = /\.jpe?g$/i.test(filePath) ? 'image/jpeg' : /\.webp$/i.test(filePath) ? 'image/webp' : 'image/png';
  return page.evaluate(async ({ b64, md5, mime, total, bearer, mediaCategory }) => {
    const csrf = document.cookie.split('; ').find(c => c.startsWith('ct0='))?.split('=')[1] || '';
    const H = {
      authorization: 'Bearer ' + bearer,
      'x-csrf-token': csrf,
      'x-twitter-active-user': 'yes',
      'x-twitter-auth-type': 'OAuth2Session',
      'x-twitter-client-language': 'zh-cn',
    };
    const U = 'https://upload.x.com/i/media/upload.json';
    const init = await fetch(`${U}?command=INIT&total_bytes=${total}&media_type=${encodeURIComponent(mime)}&media_category=${mediaCategory}`,
      { method: 'POST', credentials: 'include', headers: H });
    const j1 = await init.json();
    if (!j1.media_id_string) return { ok: false, step: 'INIT', detail: j1 };
    const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const fd = new FormData();
    fd.append('media', new Blob([bin], { type: mime }), 'file');
    const app = await fetch(`${U}?command=APPEND&media_id=${j1.media_id_string}&segment_index=0`,
      { method: 'POST', credentials: 'include', headers: H, body: fd });
    if (app.status >= 300) return { ok: false, step: 'APPEND', status: app.status };
    const fin = await fetch(`${U}?command=FINALIZE&media_id=${j1.media_id_string}&original_md5=${md5}`,
      { method: 'POST', credentials: 'include', headers: H });
    const j3 = await fin.json();
    return { ok: !!j3.media_id_string, mediaId: j3.media_id_string, mediaKey: j3.media_key };
  }, { b64, md5, mime, total: buf.length, bearer: defaults.bearer, mediaCategory });
}

export function numericIdFromBase64(b64) {
  try {
    const s = Buffer.from(b64, 'base64').toString('utf8');
    return (s.match(/:(\d+)$/) || [])[1] || null;
  } catch { return null; }
}

export async function createDraft(page, title) {
  const stub = {
    blocks: [{ data: {}, text: ' ', key: '00001', type: 'unstyled', entity_ranges: [], inline_style_ranges: [] }],
    entity_map: [],
  };
  const r = await gql(page, OPS.draftCreate, { content_state: stub, title });
  const result = r.json?.data?.articleentity_create_draft?.article_entity_results?.result;
  if (r.status !== 200 || !result) throw new Error('建草稿失败 status=' + r.status + ' raw=' + r.raw);
  return { articleId: numericIdFromBase64(result.id), raw: result };
}

export async function updateContent(page, articleId, contentState) {
  const r = await gql(page, OPS.updateContent, { content_state: contentState, article_entity: String(articleId) });
  const data = r.json?.data?.articleentity_update_content_state;
  if (r.status !== 200 || !data) throw new Error('写正文失败 status=' + r.status + ' raw=' + r.raw);
  return {
    savedBlocks: (data.content_state?.blocks || []).length,
    savedMedia: (data.media_entities || []).length,
  };
}

export async function setCover(page, articleId, mediaId) {
  const r = await gql(page, OPS.updateCover, {
    articleEntityId: String(articleId),
    coverMedia: { media_id: String(mediaId), media_category: 'DraftTweetImage' },
  });
  return { ok: r.status === 200, status: r.status, raw: r.raw };
}
