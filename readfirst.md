# AstroBlog 项目架构详解

## 一、整体技术栈

- **框架**：Astro 6.3 + MDX
- **主题**：Starlight 风格（基于 NexT Muse 演化）
- **部署**：Cloudflare Pages（静态站点）
- **语言**：TypeScript

## 二、目录结构

```
astroblog/
├── src/
│   ├── components/              # 组件库
│   │   ├── Giscus.astro         # 评论系统（配置走 yaml）
│   │   ├── NextHeader.astro     # 头部 + 导航
│   │   ├── NextFooter.astro     # 页脚（备案信息）
│   │   └── PostCardNext.astro   # 文章列表卡片
│   ├── layouts/
│   │   └── NextLayout.astro     # 主布局（背景/头部/页脚/返回顶部/代码高亮）
│   ├── pages/
│   │   ├── index.astro          # 首页（分页第 1 页）
│   │   ├── page/[page].astro    # 分页第 2 页起
│   │   ├── blog/[...slug].astro # 文章详情（含上下篇导航 + 评论）
│   │   ├── tags.astro + tags/[tag].astro
│   │   ├── categories.astro + categories/[category].astro
│   │   ├── archive.astro        # 归档
│   │   ├── search.astro         # 搜索
│   │   ├── about.astro          # 关于
│   │   └── 404.astro
│   ├── content/
│   │   └── blog/**/*.md         # 文章 Markdown 源
│   ├── lib/
│   │   ├── config.ts            # 加载 site-config.yaml
│   │   └── search-index.ts      # 构建期生成搜索索引
│   ├── content.config.ts        # 内容集合 schema 定义
│   └── env.d.ts
├── public/
│   ├── css/next.css             # 主样式（Starlight 风格 CSS 变量）
│   └── images/                  # 图标、头像等
├── site-config.yaml             # 全局配置（单一配置源）
├── astro.config.mjs
├── remark-custom-blockquotes.js # Markdown 扩展（Aside 容器）
├── wrangler.toml                # Cloudflare 部署配置
├── CLAUDE.md / readfirst.md     # 项目文档
└── package.json
```

## 三、配置文件

### `site-config.yaml`（单一配置源）

通过 `src/lib/config.ts` 的 `loadConfig()` 加载。加载失败会直接抛错（fail fast）。

主要字段：

```yaml
site:          # 标题、描述、关键词、作者
background:    # 背景模式（png / mp4 / player）
header:        # 头部标题副标题
navigation:    # 导航菜单（NextHeader 读取此字段渲染）
footer:        # 页脚（当前代码未读取，NextFooter 硬编码）
search:        # 搜索开关
features:      # 功能开关（当前代码未读取，保留扩展位）

# Giscus 评论系统
comment:
  enabled: true
  giscus:
    repo: 'xiting-it/commentgiscus'
    repoId: 'R_kgDOTdc47g'
    category: 'Announcements'
    categoryId: 'DIC_kwDOTdc47s4DBiTv'
    mapping: 'pathname'
    reactionsEnabled: true
    inputPosition: 'bottom'
    lang: 'zh-CN'
    theme: 'light_tritanopia'        # 亮色主题
    darkTheme: 'dark_tritanopia'     # 暗色主题
```

### `astro.config.mjs`

关键配置：
- `output: 'static'` + `build.format: 'directory'`（目录式 URL）
- `markdown.syntaxHighlight: false`（关闭构建期高亮，由客户端 highlight.js 处理）
- `markdown.gfm: true` + `smartypants: true`
- remark 插件：`remarkDirective` + `customBlockquotes`
- 启用 `experimental.clientPrerender`

### `content.config.ts`

只有一个集合 `blog`：

```typescript
schema: {
  title: string              // 必填
  pubDate: Date              // 必填
  description: string        // 必填
  updatedDate?: Date
  category?: string
  tags?: string[]
  backgroundImage?: string   // 文章头图
  draft?: boolean            // 默认 false
}
```

**文章 URL 规则**：`/blog/{相对路径去掉 .md}/`
例：`src/content/blog/AI扫盲/aiabstract.md` → `/blog/AI扫盲/aiabstract/`

## 四、布局

```
NextLayout.astro（唯一主布局）
    ↓
页面组件（index.astro / blog/[...slug].astro 等）
```

**NextLayout** 提供：
- 背景渲染（三种模式：PNG / MP4 / DogeCloud 播放器）
- 返回顶部按钮（滚动百分比）
- 动态标题（切换标签时显示提示语）
- 点击水波纹效果
- highlight.js 客户端代码高亮（atom-one-light 主题）
- 代码块复制按钮（hover 显示）
- Font Awesome 6.5.2（图标）

## 五、字体和配色（Starlight 风格）

### 字体

**系统字体栈**，零网络请求：
- **正文**：`-apple-system` / `PingFang SC`（macOS）/ `Microsoft YaHei`（Windows）
- **代码**：`ui-monospace` / `SF Mono`（macOS）/ `Consolas`（Windows）

### 配色

CSS 变量驱动，定义在 `public/css/next.css` 顶部：
- **灰度阶梯**：`--color-gray-1`（最深）到 `--color-gray-7`（最浅）
- **强调色**：`--color-accent`（Starlight 蓝 `hsl(234, 90%, 60%)`）
- **语义色**：`--color-success`（绿）/ `--color-warning`（橙）/ `--color-danger`（红）
- **背景**：`--bg-page`（页面）/ `--bg-card`（卡片）/ `--bg-inline-code`（行内代码）

### 代码块

- **主题**：atom-one-light（Xcode Light 风格）
- **背景**：浅色 `#fafafa`
- **圆角**：6px
- **复制按钮**：hover 时右上角显示

## 六、Markdown 扩展

所有扩展集中在 `remark-custom-blockquotes.js` 一个文件里，采用 **Astro Starlight 风格** 的 Aside 容器。

### Aside 容器（4 种）

```markdown
:::note
备注内容
:::

:::tip
小技巧
:::

:::caution
注意内容
:::

:::danger
警告内容
:::
```

| 语法 | 标题 | 图标 | 主色 |
|------|------|------|------|
| `:::note` | Note | ℹ️ | 蓝色 |
| `:::tip` | Tip | 💡 | 绿色 |
| `:::caution` | Caution | ⚠️ | 橙色 |
| `:::danger` | Danger | 🚫 | 红色 |

> 行内彩色标签 `[!labelblue]@内容@` 已移除，需要高亮请用**粗体**或行内代码。

## 七、关键组件

| 组件 | 说明 |
|------|------|
| `NextHeader.astro` | 头部 + 导航菜单（从 yaml 读 `navigation`，图标按 URL 映射） |
| `NextFooter.astro` | 页脚（社区备案、CDN、版权） |
| `PostCardNext.astro` | 文章列表卡片（首页 + 分页页用） |
| `Giscus.astro` | 评论组件（懒加载 + 跟随暗色模式自动切换主题） |

## 八、特殊功能

1. **动态标题**：切换标签页时显示"zzz睡觉了晚安"，返回时显示"打起精神来ing"
2. **背景模式**：支持 PNG 静态图 / MP4 动态视频 / DogeCloud 播放器三选一
3. **评论系统**：Giscus（基于 GitHub Discussions，仓库 `xiting-it/commentgiscus`）
4. **分页**：每页 5 篇文章（`POSTS_PER_PAGE = 5`）
5. **本地搜索**：构建期生成 JSON 索引注入到 `/search` 页面，客户端模糊匹配
6. **代码块复制**：hover 显示复制按钮，点击复制到剪贴板

## 九、常用命令

```bash
npm run dev      # 开发服务器 (localhost:4321)
npm run build    # 构建（含 astro check 类型检查）
npm run preview  # 预览构建产物
```

## 十、部署

- 推送 `main` 分支到 GitHub → Cloudflare Pages 自动构建
- 域名：`blog.xiting3.xyz` / `blog.xitingit.top`
- 部署配置见 `wrangler.toml`
