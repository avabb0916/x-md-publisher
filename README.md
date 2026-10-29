# xpub · Markdown → X 文章草稿

把一篇 Markdown（带图）一键变成 **X Articles 草稿**：标题、正文、正文配图、封面全部就位。
**只建草稿，不发布** —— 发布这一步永远留给人。

- 不需要 X 官方 API key（用你自己浏览器的登录态）
- 不需要 Obsidian / 插件 / 扩展
- 9 张图 + 150 个正文块的整篇，约 **15 秒**
- 支持"更新已有草稿"，改稿不会堆出一堆同名草稿

> ⚠️ 用的是 X 网页端的内部接口（非官方公开 API），可能随 X 改版失效。见 [docs/LIMITS.md](docs/LIMITS.md)。

## 为什么会有这个项目

想自动化发 X 长文，常见做法是"用浏览器插件模拟点击"。实测这条路很脆：每张图都要走「打开文件框 → 选文件 → 轮询 DOM 等图片出现 → 确认绑定」，图一多就卡死（我们在第 3 张、第 7 张各失败过一次）。

xpub 换了个思路：**不点 UI，直接调接口**。

```
上传图片  → upload.x.com 的 INIT / APPEND / FINALIZE 三步
写正文    → ArticleEntityUpdateContent（一次性写入带图片位置的 DraftJS）
设封面    → ArticleEntityUpdateCoverMedia
```

结果：稳定、快、位置精确，且不依赖任何插件的更新。

## 安装

```bash
git clone <this-repo> && cd x-md-publisher
npm install
```

要求：Node.js ≥ 20、本机有 Chrome。

## 三步跑通

**1. 启动一个独立 Chrome（独立 profile，不碰你日常浏览器）**

```bash
bash scripts/chrome-debug.sh
```

首次会打开一个 Chrome 窗口，**在里面登录一次 X**，之后登录态会保存在 `~/.xpub-chrome-profile`。

**2. 试运行（不联网、不建草稿）**

```bash
node bin/xpub.mjs --dry-run examples/sample-article.md
```

会打印：标题、正文块数、图片数、封面文件。

**3. 建草稿**

```bash
node bin/xpub.mjs examples/sample-article.md --cover examples/images/cover.png
```

输出里会有：

```json
{
  "ok": true,
  "articleId": "1234567890",
  "savedBlocks": 104,
  "savedMedia": 5,
  "draftUrl": "https://x.com/compose/articles/edit/1234567890"
}
```

打开 `draftUrl` 检查，满意后**自己点发布**。

## 用法

```bash
xpub <article.md> [选项]
```

| 选项 | 作用 |
|---|---|
| `--cover <图片>` | 封面图（不传则读 frontmatter 的 `cover_image`） |
| `--no-cover` | 不设封面 |
| `--title <标题>` | 覆盖标题（默认取第一个 `#`） |
| `--article <id>` | **更新已有草稿**，不新建（改稿必用） |
| `--dry-run` | 只解析，不联网 |
| `--port <端口>` | CDP 端口，默认 9222 |
| `--profile <目录>` | Chrome 独立配置目录 |
| `--verbose` | 打印上传明细 |

环境变量：`XPUB_CDP_PORT`、`XPUB_CHROME`、`XPUB_CHROME_PROFILE`、`XPUB_CONFIG_DIR`、`XPUB_BEARER`。

## Markdown 支持范围

| 写法 | 结果 |
|---|---|
| `# 标题` | 取第一个作为文章标题，其余丢弃 |
| `## 标题` | 真二级标题 |
| `### 标题` | 降级为 `▍标题` 段落（X 不支持三级标题） |
| `- 列表` | 原生列表 |
| `> 引用` | 引用块 |
| `![[图片]]` / `![](图片)` | 正文图片，按出现位置插入 |
| `**加粗**` | **样式被剥离**（X 文章接口拒绝 inline style），文字保留 |
| 表格 / 代码块 | 丢弃（X 不支持） |

frontmatter：

```yaml
---
title: 文章标题
cover_image: images/cover.png
---
```

## 常见问题

**Q：会不会把我的账号密码交给脚本？**
不会。脚本只用你 Chrome 里已登录的 session cookie；token 不出本机。

**Q：能不能自动发布？**
不提供。发布是内容责任，留给作者。xpub 只到"草稿"为止。

**Q：封面为什么被裁了？**
X 文章封面是 5:2，feed 预览还会按约 1.91:1 再裁一次。把关键信息放在中央安全区。

**Q：字符数 / 图片数有限制吗？**
单篇正文我们没有撞到硬上限（测试过 150 块 / 9 图）；但**建草稿接口一次只能接受约 15 块**，所以本项目是"先建空草稿，再单独写正文"。

更多见 [docs/FAQ.md](docs/FAQ.md) 与 [docs/LIMITS.md](docs/LIMITS.md)。

## 目录结构

```
bin/xpub.mjs        CLI 入口
lib/config.mjs      配置与默认值（无硬编码本机路径）
lib/chrome.mjs      独立 Chrome 启动与 CDP 连接
lib/md.mjs          Markdown → X blocks
lib/x.mjs           上传 + GraphQL 封装
scripts/chrome-debug.sh
examples/           示例文章与图片
docs/               SETUP / LIMITS / FAQ
```

## 免责声明

本项目使用 X 网页端内部接口，属于非官方实现，可能因 X 改版失效；请遵守 X 的服务条款，风险自负。
不提供、也不建议用于批量刷量、代发他人内容等用途。

## License

MIT
