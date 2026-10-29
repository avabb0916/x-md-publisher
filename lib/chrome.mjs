// 启动/连接一个独立的 Chrome 实例（独立 profile，不干扰日常浏览器）
import { spawn } from 'child_process';
import fs from 'fs';
import { defaults, ensureConfigDir } from './config.mjs';

export function launchChrome({ port = defaults.cdpPort, profile = defaults.chromeProfile, chromePath = defaults.chromePath } = {}) {
  ensureConfigDir();
  fs.mkdirSync(profile, { recursive: true });
  const child = spawn(chromePath, [
    `--user-data-dir=${profile}`,
    `--remote-debugging-port=${port}`,
    '--remote-allow-origins=*',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1280,900',
    'https://x.com/home',
  ], { detached: true, stdio: 'ignore' });
  child.unref();
  return child;
}

export async function pingCdp(port = defaults.cdpPort) {
  try {
    const r = await fetch(`http://127.0.0.1:${port}/json/version`);
    return r.ok;
  } catch { return false; }
}

export async function ensureChrome(opts = {}) {
  const port = opts.port || defaults.cdpPort;
  if (await pingCdp(port)) return { started: false, port };
  launchChrome({ ...opts, port });
  for (let i = 0; i < 25; i++) {
    await new Promise(r => setTimeout(r, 1000));
    if (await pingCdp(port)) return { started: true, port };
  }
  throw new Error(
    `无法启动 Chrome 调试端口 ${port}。\n` +
    `请手动运行: google-chrome --remote-debugging-port=${port} --user-data-dir=<你的独立 profile>\n` +
    `或设置 XPUB_CHROME 指向 Chrome 可执行文件。`
  );
}
