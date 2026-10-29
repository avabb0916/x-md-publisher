# 已知限制（重要）

xpub 用的是 **X 网页端内部接口**，不是官方公开 API。下面这些约束都是实测出来的。

## 1. 接口不是稳定契约

| 用途 | 接口 | 备注 |
|---|---|---|
| 建草稿 | `ArticleEntityDraftCreate` (queryId `fCkdrI6zrnw_UtVa3WDHhw`) | queryId 会随前端发版变化 |
| 写正文 | `ArticleEntityUpdateContent` (`FMC9CKP145f5wgXYCsmtiA`) | 同上 |
| 设封面 | `ArticleEntityUpdateCoverMedia` (`Rlvhkuecg1z_7O5vC2G1fQ`) | 同上 |
| 传图片 | `upload.x.com/i/media/upload.json` (INIT/APPEND/FINALIZE) | 相对稳定 |

X 一改版就可能失效。失效的典型表现：HTTP 200 但 `data: {}` 里带 `errors`。

## 2. 建草稿接口一次只能塞约 15 个块

实测：11 块成功，19 块报 `Internal: Unspecified`。
**所以本项目必须先建一个占位小草稿，再用"写正文"接口写整篇。**

## 3. 正文不支持的东西

| 元素 | 结果 |
|---|---|
| `header-three`（三级标题） | 服务端报 `Internal: Unspecified`；strategy 里降级为 `▍` 段落 |
| 加粗 / 斜体等 inline style | 一律被拒（`inline_style_ranges` 任何写法都不行） |
| 表格 | 不支持，会被丢弃 |
| 代码块 | 不支持，会被丢弃 |

## 4. 图片

- 上传用 `media_category=tweet_image`
- 正文引用时用 `media_category=DraftTweetImage`
- 图片实体结构（唯一正确写法）：

```json
{
  "key": "0",
  "value": {
    "type": "MEDIA",
    "mutability": "Immutable",
    "data": {
      "entity_key": "<uuid>",
      "media_items": [{ "local_media_id": 1, "media_category": "DraftTweetImage", "media_id": "<id>" }]
    }
  }
}
```

对应 block：`{ "type": "atomic", "text": " ", "entity_ranges": [{ "key": 0, "offset": 0, "length": 1 }] }`
注意 `entity_ranges[].key` 是**数字**，而 `entity_map[].key` 是**字符串**。

## 5. 封面

- X 文章封面比例 **5:2**
- feed 预览会再按约 **1.91:1** 裁切 → 关键信息放中央安全区

## 6. 登录态

- 使用独立 Chrome profile（默认 `~/.xpub-chrome-profile`）
- 首次需手动登录一次；session 过期后需要重新登录
- 不读取、不导出任何凭证

## 7. 不做的事

- 不自动发布（只建草稿）
- 不批量代发
- 不处理视频、投票、引用帖嵌入
