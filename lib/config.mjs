// 配置：全部可通过环境变量/命令行覆盖，不写死任何本机路径
import os from 'os';
import path from 'path';
import fs from 'fs';

export const CONFIG_DIR = process.env.XPUB_CONFIG_DIR || path.join(os.homedir(), '.config', 'xpub');

export const defaults = {
  cdpPort: Number(process.env.XPUB_CDP_PORT || 9222),
  chromeProfile: process.env.XPUB_CHROME_PROFILE || path.join(os.homedir(), '.xpub-chrome-profile'),
  chromePath: process.env.XPUB_CHROME ||
    (process.platform === 'darwin'
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : process.platform === 'win32'
        ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
        : '/usr/bin/google-chrome'),
  // X 网页版的公开 bearer（浏览器端常量，非用户凭证）；必要时可用 XPUB_BEARER 覆盖
  bearer: process.env.XPUB_BEARER ||
    'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
};

export function ensureConfigDir() {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  return CONFIG_DIR;
}

// 允许把上次用过的 Chrome 配置路径记住（可选）
export function loadUserConfig() {
  const f = path.join(CONFIG_DIR, 'config.json');
  if (!fs.existsSync(f)) return {};
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; }
}

export function saveUserConfig(patch) {
  ensureConfigDir();
  const f = path.join(CONFIG_DIR, 'config.json');
  const cur = loadUserConfig();
  fs.writeFileSync(f, JSON.stringify({ ...cur, ...patch }, null, 2));
  return f;
}
