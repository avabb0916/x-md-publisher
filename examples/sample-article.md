---
title: 一个示例：把 Markdown 发成 X 草稿
cover_image: images/cover.png
---

# 一个示例：把 Markdown 发成 X 草稿

这是一篇给 xpub 做冒烟测试用的示例文章。它演示了三件事：标题怎么取、图片怎么嵌、正文怎么写。

## 一、标题从哪来

默认取文件里第一个 `#` 一级标题；也可以用 `--title` 覆盖。

## 二、图片怎么嵌

支持两种写法（路径相对 md 文件所在目录）：

- Obsidian 风格：`![[images/step-by-step.png]]`
- 标准 Markdown：`![](images/step-by-step.png)`

下面这张会出现在正文里：

![[images/step-by-step.png]]

## 三、什么会被降级

| 元素 | 处理方式 |
|---|---|
| 三级标题 | 降级为 `▍` 段落 |
| 表格 | 丢弃（X 不支持） |
| 代码块 | 丢弃 |
| 加粗 | 剥离样式（X 文章接口不接受 inline style） |

## 四、跑起来

在终端执行 `xpub examples/sample-article.md --cover examples/images/cover.png`，会得到一条草稿链接。

注意：**xpub 只建草稿，不会替你发布。**
