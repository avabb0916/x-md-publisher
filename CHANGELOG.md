# Changelog

## 0.1.0 — 2026-10-29

首个可用版本。

- Markdown → X 文章草稿（标题 / 正文 / 正文图 / 封面）
- 图片走 `upload.x.com` 的 INIT/APPEND/FINALIZE，三步上传
- 正文一次性写入 DraftJS（含图片实体定位）
- 支持更新已有草稿（`--article <id>`），避免堆同名草稿
- 自动拉起独立 Chrome（独立 profile，不干扰日常浏览器）
- `--dry-run` 离线解析
- Markdown 降级规则：`###` → `▍` 段落；表格 / 代码块丢弃；加粗样式剥离
