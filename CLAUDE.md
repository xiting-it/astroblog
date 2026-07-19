# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Astro 静态博客，使用 BlackWhite 主题。中文内容为主，支持 MDX、自定义 Markdown 容器区块、标签颜色。

## 常用命令

```bash
npm run dev      # 开发服务器 (localhost:4321)
npm run build    # 构建（包含类型检查 astro check）
npm run preview  # 预览构建产物
```

## 核心架构

### 内容集合
- `blog` - 主文章集合 (`src/content/blog/*.md`)
- `posts` - 兼容旧文章集合 (`src/content/posts/*.md`)
- `resources` - 资源下载 (`src/content/resources/*.md`)

Frontmatter 必需字段：`title`, `pubDate`, `description`。

### 全局配置
`site-config.yaml` 是单一配置源，通过 `src/lib/config.ts` 加载。包含：
- 站点信息、导航菜单
- 背景模式（PNG/MP4/播放器）
- 功能开关（搜索、返回顶部、代码高亮）

### Markdown 扩展
自定义 remark 插件：
- `remark-custom-blockquotes.js` - 容器区块 (`:::info`, `:::warning` 等)
- `remark-custom-label-tags.js` - 标签颜色 (`[!labelblue]@内容@`)

### 布局层次
`BaseLayout` → `NextLayout` / `PostLayout` → 页面组件

`src/lib/config.ts` 在服务端加载 YAML，客户端通过 `window.__SITE_CONFIG__` 访问。
