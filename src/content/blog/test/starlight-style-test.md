---
title: Starlight 风格测试
pubDate: 2026-07-21
description: 测试字体、配色、代码块、Aside 容器等所有元素的渲染效果
category: 测试
tags:
  - 测试
  - 样式
draft: false
---

## 字体测试

### 中文系统字体

这是一段中文正文，应该显示为系统字体（macOS 萍方 / Windows 雅黑）。

行内包含**粗体**、*斜体*、~~删除线~~、`行内代码` 和 [链接](https://example.com)。

### 标题层级

# 一级标题（通常不在正文用）
## 二级标题
### 三级标题
#### 四级标题

## 代码块测试（GitHub Dark 风格）

### JavaScript

```javascript
// 这是一个 JavaScript 代码块
const greeting = 'Hello, World!';

function sayHello(name) {
  console.log(`${greeting}, ${name}!`);
  return { success: true, timestamp: Date.now() };
}

const result = sayHello('Xiting');
```

### TypeScript

```typescript
interface User {
  id: number;
  name: string;
  email?: string;
}

class UserService {
  private users: Map<number, User> = new Map();

  async getUser(id: number): Promise<User | null> {
    return this.users.get(id) ?? null;
  }
}
```

### Python

```python
from dataclasses import dataclass
from typing import List

@dataclass
class Article:
    title: str
    pub_date: str
    tags: List[str]

articles: List[Article] = [
    Article("第一篇", "2026-07-21", ["test"]),
    Article("第二篇", "2026-07-22", ["blog"]),
]

for article in articles:
    print(f"{article.pub_date}: {article.title}")
```

### Bash

```bash
# 常用命令
npm run dev      # 启动开发服务器
npm run build    # 构建生产版本
git push origin main  # 推送到远端
```

### JSON

```json
{
  "site": {
    "title": "Xiting's Blog",
    "description": "个人技术博客"
  },
  "features": {
    "darkMode": true,
    "comments": "giscus"
  }
}
```

> 鼠标 hover 到代码块上，右上角应该出现"复制"按钮，点击复制后变成绿色的"已复制"。

## 行内代码测试

配置项在 `site-config.yaml` 里，运行 `npm run dev` 启动，按 `Cmd+Shift+P` 上传图片。

## Aside 容器测试（Starlight 风格）

### 4 种新类型

:::note
这是 **note** 容器（蓝色）。用于备注、补充信息。

支持多行、`行内代码`、**粗体**、列表：

- 列表项 1
- 列表项 2
:::

:::tip
这是 **tip** 容器（绿色）。用于小技巧、推荐做法。
:::

:::caution
这是 **caution** 容器（橙色）。用于提醒注意的事项。
:::

:::danger
这是 **danger** 容器（红色）。用于警告、禁止的操作。
:::

## 表格测试

| 类型 | 颜色 | 图标 | 用途 |
|------|------|------|------|
| note | 蓝色 | ℹ️ | 备注 |
| tip | 绿色 | 💡 | 小技巧 |
| caution | 橙色 | ⚠️ | 注意 |
| danger | 红色 | 🚫 | 警告 |

## 引用测试

> 这是一段普通引用。
>
> 可以跨多行，第二段。

## 列表测试

### 无序列表

- 第一项
- 第二项
  - 嵌套子项 A
  - 嵌套子项 B
- 第三项

### 有序列表

1. 第一步
2. 第二步
3. 第三步

### 任务列表

- [x] 已完成项
- [ ] 未完成项
- [ ] 另一个未完成

## 分割线

---

以上内容下方应该有一条分割线。
