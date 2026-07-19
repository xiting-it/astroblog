# CLAUDE.md

Claude Code 在本仓库工作时的指引。

## 项目概述

Astro 6 静态博客（Starlight 风格），中文内容为主，支持 MDX 和 Aside 容器。部署在 Cloudflare Pages。

## 核心架构

### 内容集合（`src/content.config.ts`）

- `blog` — 文章集合（`src/content/blog/**/*.{md,mdx}`）

Frontmatter 字段：
- 必填：`title`、`pubDate`、`description`
- 选填：`category`、`tags`、`updatedDate`、`backgroundImage`、`draft`

文章 URL：`/blog/{相对路径去掉.md}/`（例如 `AI扫盲/aiabstract.md` → `/blog/AI扫盲/aiabstract/`）。

### 全局配置（`site-config.yaml`）

单一配置源，通过 `src/lib/config.ts` 的 `loadConfig()` 在服务端加载。包含：
- `site` — 站点标题、描述、关键词
- `background` — 背景模式（`png` / `mp4` / `player`）
- `navigation` — 导航菜单（由 `NextHeader.astro` 读取渲染）
- `comment` — Giscus 评论配置（`repo` / `repoId` / `categoryId` 等）
- `search` / `features` — 其他开关（当前代码未读取，保留扩展位）

加载失败会直接抛错（fail fast，不静默 fallback）。

### Markdown 扩展

通过 `astro.config.mjs` 注册的 remark 插件（都在 `remark-custom-blockquotes.js` 一个文件里）：
- **Aside 容器**（Starlight 风格）：`:::note` / `:::tip` / `:::caution` / `:::danger`

### 布局层次

- `NextLayout.astro` — 唯一的主布局（背景、头部、页脚、返回顶部、highlight.js 客户端代码高亮、代码块复制按钮）
- 页面组件（`index.astro` / `blog/[...slug].astro` / `about.astro` 等）通过 `<NextLayout>` 包裹

### 关键组件

| 组件 | 用途 |
|------|------|
| `NextHeader.astro` | 头部 + 导航（从 yaml 读 `navigation`） |
| `NextFooter.astro` | 页脚（备案信息等，硬编码） |
| `PostCardNext.astro` | 文章列表卡片（首页、分页页） |
| `Giscus.astro` | 评论组件（配置走 yaml，懒加载，跟随暗色模式） |

### 代码高亮

- `astro.config.mjs` 里 `syntaxHighlight: false`，构建期不渲染代码颜色
- 由 `NextLayout.astro` 在客户端加载 highlight.js（atom-one-light 主题）处理
- 代码块自动添加复制按钮（hover 显示）
- `script` 标签必须加 `is:inline`，否则 Astro 会当模块处理导致不加载

### 字体和配色

- **字体**：系统字体栈（`-apple-system` / `PingFang SC` / `Microsoft YaHei`），零网络请求
- **配色**：CSS 变量驱动（Starlight 风格的灰度阶梯 + 蓝色强调色），定义在 `public/css/next.css` 顶部
- **代码字体**：系统等宽字体栈（`ui-monospace` / `SF Mono` / `Consolas`）

### 其他约定

- `src/lib/search-index.ts` — 构建期生成搜索索引 JSON 注入到 `/search` 页面
- 分页：每页 5 篇（`POSTS_PER_PAGE = 5`），首页是第 1 页，`/page/[N]` 是第 2 页起
- 文章详情页（`blog/[...slug].astro`）自带上下篇导航和 Giscus 评论区
