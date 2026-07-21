/**
 * 生成搜索索引
 */

import { getCollection } from 'astro:content';

export interface SearchDocument {
  id: string;
  title: string;
  description: string;
  content: string;
  url: string;
  category?: string;
  tags?: string[];
  date: string;
}

/**
 * 把 Markdown 源码转成用于搜索的纯文本。
 *
 * 之所以不用渲染后的 HTML：Astro 6 的 render() 公开 API 只返回 Content 组件，
 * 不直接暴露 html 字符串（data-store.json 里的 rendered.html 是内部缓存）。
 * 所以这里直接处理 markdown 源码，足够支撑全文搜索。
 */
function markdownToPlainText(md: string): string {
  return md
    // 移除 frontmatter（保险起见，post.body 应该已经不含 frontmatter）
    .replace(/^---[\s\S]*?---\n/, '')
    // 移除代码块（```...``` 和 ~~~...~~~）—— 代码内容对搜索价值低且噪声大
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/~~~[\s\S]*?~~~/g, ' ')
    // 移除行内代码
    .replace(/`[^`]*`/g, ' ')
    // 移除图片和链接，保留链接文本
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    // 移除 HTML 标签（md 里可能内嵌）
    .replace(/<[^>]*>/g, ' ')
    // 移除 aside 容器标记
    .replace(/:::[a-z]*/g, ' ')
    // 移除 Obsidian callout 标记
    .replace(/>?\s*\[!(note|tip|caution|danger)\]/gi, ' ')
    // 移除 markdown 标题/强调符号
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_~]{1,3}/g, '')
    // 移除列表标记
    .replace(/^[\s]*[-*+]\s+/gm, ' ')
    .replace(/^[\s]*\d+\.\s+/gm, ' ')
    // 移除引用块标记
    .replace(/^>\s?/gm, '')
    // 折叠空白
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 生成搜索索引
 */
export async function generateSearchIndex(): Promise<SearchDocument[]> {
  try {
    const posts = await getCollection('blog');
    const publishedPosts = posts.filter(post => post.data.draft !== true);

    const searchIndex: SearchDocument[] = publishedPosts.map(post => {
      // Astro 6 glob loader：id 不带 .md 后缀（如 "ai扫盲/aiabstract"）
      const slug = post.id;
      const content = markdownToPlainText(post.body || '');

      return {
        id: post.id,
        title: post.data.title,
        description: post.data.description,
        content,
        url: `/blog/${slug}/`,
        category: post.data.category,
        tags: post.data.tags,
        date: post.data.pubDate.toISOString(),
      };
    });

    return searchIndex;
  } catch (error) {
    console.error('生成搜索索引失败:', error);
    return [];
  }
}

/**
 * 生成搜索索引 JSON
 */
export async function generateSearchIndexJSON(): Promise<string> {
  const searchIndex = await generateSearchIndex();
  return JSON.stringify(searchIndex);
}
