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
 * 生成搜索索引
 */
export async function generateSearchIndex(): Promise<SearchDocument[]> {
  try {
    const posts = await getCollection('blog');
    const publishedPosts = posts.filter(post => post.data.draft !== true);

    const searchIndex: SearchDocument[] = publishedPosts.map(post => {
      // 移除 HTML 标签，提取纯文本
      const body = post.body || '';
      const plainText = body
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      return {
        id: post.id,
        title: post.data.title,
        description: post.data.description,
        content: plainText,
        url: `/blog/${post.id.replace('.md', '')}/`,
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
