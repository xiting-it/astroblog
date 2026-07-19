# AstroBlog 项目架构详解

## 一、整体技术栈

**框架**: Astro 6.3.1 + MDX 支持
**主题**: BlackWhite（基于 NexT Muse 风格）
**部署**: Cloudflare Pages（静态站点）
**语言**: TypeScript

---

## 二、目录结构

```
astroblog/
├── src/
│   ├── components/          # 组件库
│   │   ├── Giscus.astro    # 评论系统
│   │   ├── Header.astro    # 简单头部
│   │   ├── NextHeader.astro # NexT风格头部
│   │   ├── NextFooter.astro # 页脚
│   │   ├── NextSidebar.astro # 侧边栏
│   │   └── PostCardNext.astro # 文章卡片
│   ├── layouts/            # 布局模板
│   │   ├── BaseLayout.astro # 基础布局（暗色模式）
│   │   ├── NextLayout.astro # 主布局（NexT风格）
│   │   ├── PostLayout.astro # 文章布局
│   │   └── AdminLayout.astro # 管理后台布局
│   ├── pages/              # 路由页面
│   │   ├── index.astro     # 首页（分页）
│   │   ├── blog/[...slug].astro # 文章详情
│   │   ├── tags/[tag].astro # 标签页
│   │   ├── categories/[category].astro # 分类页
│   │   ├── page/[page].astro # 分页
│   │   ├── archive.astro   # 归档页
│   │   ├── search.astro    # 搜索页
│   │   └── about.astro     # 关于页
│   ├── content/            # 内容集合
│   │   ├── blog/*.md       # 主要文章
│   │   ├── posts/*.md      # 兼容旧文章
│   │   └── resources/*.md  # 资源下载
│   ├── lib/                # 工具库
│   │   ├── config.ts       # 配置加载器
│   │   ├── search-index.ts # 搜索索引
│   │   └── utils.ts        # 通用工具函数
│   ├── types/              # TypeScript类型定义
│   └── styles/             # 全局样式
├── public/                 # 静态资源
│   ├── css/                # 样式文件
│   ├── js/                 # JavaScript文件
│   ├── images/             # 图片
│   └── lib/                # 第三方库
├── site-config.yaml        # 全局配置（单一配置源）
├── astro.config.mjs        # Astro配置
├── content.config.ts       # 内容集合定义
├── remark-custom-blockquotes.js  # 容器区块插件
└── remark-custom-label-tags.js   # 标签颜色插件
```

---

## 三、配置文件详解

### 1. `site-config.yaml`（全局配置）

这是项目的**单一配置源**，通过 `src/lib/config.ts` 加载。

```yaml
# 站点信息
site:
  title: "Xiting's Blog"
  description: '网站描述'
  keywords: '关键词1,关键词2'
  author: 'Xiting'

# 背景设置（支持三种模式）
background:
  mode: 'mp4'  # 可选: png | mp4 | player

  # PNG静态图片背景
  png:
    url: '图片URL'
    opacity: 0.85
    size: 'cover'
    position: 'center'
    attachment: 'fixed'

  # MP4动态视频背景
  mp4:
    url: '视频URL'
    opacity: 0.85
    autoplay: true
    loop: true
    muted: true

  # 视频播放器背景（第三方）
  player:
    enabled: false
    container_id: ''
    user_id: 0
    vcode: ''
    auto_play: true

# 头部设置
header:
  title: "Xiting's Blog"
  subtitle: 'Stay Hungry, Stay Foolish'

# 导航菜单
navigation:
  - name: '首页'
    url: '/'
  - name: '归档'
    url: '/archive'

# 页脚
footer:
  copyright: '© 2024 Xiting. All rights reserved.'
  powered_by: 'Astro'

# 搜索功能
search:
  enabled: true
  placeholder: '搜索文章...'

# 功能开关
features:
  back_to_top: true        # 返回顶部
  pace_loading: true       # 加载动画
  code_highlight: true     # 代码高亮
  lazy_load_images: false  # 图片懒加载
```

---

### 2. `astro.config.mjs`（Astro配置）

```javascript
{
  integrations: [mdx()],              // MDX支持
  output: 'static',                    // 静态输出
  site: 'https://blog.xiting3.xyz',   // 站点URL
  build: {
    format: 'directory'               // 目录格式输出（URL更清晰）
  },
  markdown: {
    remarkPlugins: [
      remarkDirective,                // 容器指令支持
      customBlockquotes,              // 自定义容器区块
      customInlineLabels              // 自定义标签颜色
    ],
    syntaxHighlight: 'shiki',         // 语法高亮
    gfm: true                         // GitHub风格Markdown
  }
}
```

---

### 3. `content.config.ts`（内容集合配置）

定义三个内容集合：

**blog** - 主文章集合
```typescript
schema: {
  title: string,          // 必需
  pubDate: Date,          // 必需
  description: string,    // 必需
  updatedDate?: Date,     // 可选
  category?: string,
  tags?: string[],
  backgroundImage?: string,
  draft?: boolean
}
```

**posts** - 兼容旧文章（相同字段）
**resources** - 资源下载
```typescript
schema: {
  name: string,
  version?: string,
  description: string,
  downloadUrl: string,
  publishDate: Date
}
```

---

## 四、布局层次

```
BaseLayout (暗色模式、简单)
    ↓
NextLayout (NexT风格、背景、动画)
    ↓
页面组件 (index.astro, blog/[...slug].astro 等)
```

**NextLayout** 是主布局，包含：
- 背景图片/视频/播放器
- 时钟加载动画
- 返回顶部按钮
- 动态标题效果
- 水波纹点击效果
- 代码高亮（highlight.js）

---

## 五、Markdown扩展

### 容器区块
```markdown
:::info
信息内容
:::

:::warning
警告内容
:::

:::danger
危险内容
:::
```

支持的类型：note, warning, danger, info, primary, success, tip, flat

### 标签颜色
```markdown
[!labelblue]@蓝色标签@
[!labelred]@红色标签@
[!labelgreen]@绿色标签@
[!labelyellow]@黄色标签@
[!labelgrey]@灰色标签@
[!labelpink]@粉色标签@
[!labelorange]@橙色标签@
```

---

## 六、特殊功能

1. **动态标题**: 切换标签页时显示"zzz睡觉了晚安"，返回时显示"打起精神来ing"
2. **背景模式**: 支持PNG静态图、MP4动态视频、第三方播放器
3. **时钟加载动画**: Pace.js + 自定义时钟样式
4. **评论系统**: Giscus（基于GitHub Discussions）
5. **分页**: 每页5篇文章（`POSTS_PER_PAGE = 5`）

---

## 七、常用命令

```bash
npm run dev      # 开发服务器 (localhost:4321)
npm run build    # 构建（包含类型检查 astro check）
npm run preview  # 预览构建产物
```
