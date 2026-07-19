import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// 博客文章内容验证
// 注意：astro/loaders 的 glob 不支持 ignore 参数
// 如果用 Obsidian 等工具的 _templates/ 等辅助目录，请用更精确的 pattern 或者建子目录区分
const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: () => z.object({
    title: z.string().min(1).max(100),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    description: z.string().min(1).max(200),
    category: z.string().max(50).optional(),
    tags: z.array(z.string().max(30)).max(10).optional(),
    backgroundImage: z.string().url().optional(),
    draft: z.boolean().default(false).optional(),
  }),
});

export const collections = {
  blog,
};
