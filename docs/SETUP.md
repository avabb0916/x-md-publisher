# 详细安装与排错

## 1. 环境

```bash
node -v      # 需要 >= 20
npm -v
```

## 2. 安装依赖

```bash
npm install
```

只有两个运行依赖：`puppeteer-core`（连接现有 Chrome，不下载浏览器）。

## 3. Chrome 路径

默认按平台猜：

| 平台 | 默认路径 |
|---|---|
| macOS | `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` |
| Windows | `C:\Program Files\Google\Chrome\Application\chrome.exe` |
| Linux | `/usr/bin/google-chrome` |

不在默认位置就设置：

```bash
export XPUB_CHROME="/path/to/chrome"
```

## 4. 登录

```bash
bash scripts/chrome-debug.sh
```

在弹出的窗口里登录 x.com。登录态保存在 `~/.xpub-chrome-profile`，后续不需要重复登录。

验证是否已登录：

```bash
curl -s http://127.0.0.1:9222/json/version | head -3
```

## 5. 第一次跑

```bash
node bin/xpub.mjs --dry-run examples/sample-article.md   # 只解析
node bin/xpub.mjs examples/sample-article.md             # 建草稿
```

## 6. 常见报错

| 报错 | 原因 | 处理 |
|---|---|---|
| `未登录 X` | profile 里没有 session | 在自动化 Chrome 窗口登录一次 |
| `无法启动 Chrome 调试端口` | Chrome 路径不对 / 端口占用 | 设置 `XPUB_CHROME`；换 `--port 9223` |
| `建草稿失败 status=200 ... errors` | queryId 失效 | 见 LIMITS.md，需要抓新 queryId |
| `正文未写入（savedBlocks=0）` | 有不支持的块类型 | 正文只用 `##` 和普通段落 |
| `图片上传失败` | 路径错 / 格式不支持 | 用 `--verbose` 查看；仅支持 png/jpg/webp |

## 7. 获取新的 queryId（X 改版后）

1. 打开 `https://x.com/compose/articles`，新建一篇草稿
2. 在 DevTools → Network 里筛选 `graphql`
3. 找 `ArticleEntityDraftCreate` / `ArticleEntityUpdateContent` / `ArticleEntityUpdateCoverMedia`
4. 把 URL 中的那串 ID 填进 `lib/x.mjs` 的 `OPS`
