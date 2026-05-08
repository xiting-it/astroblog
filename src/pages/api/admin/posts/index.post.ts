import type { APIRoute } from 'astro';
import { postDb } from '@/lib/db';
import { triggerRebuild } from '@/lib/rebuild';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const { title, slug, content, excerpt, tags, status } = data;

    if (!title || !slug || !content) {
      return new Response(
        JSON.stringify({ error: '标题、slug和内容不能为空' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const post = postDb.create({
      title,
      slug,
      content,
      excerpt,
      pubDate: new Date(),
      tags: tags || [],
      status: status || 'draft',
    });

    // Trigger rebuild in background (don't wait for it)
    triggerRebuild().catch(err => console.error('Background rebuild failed:', err));

    return new Response(
      JSON.stringify({ success: true, post, message: '文章已创建，网站正在重新构建中...' }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || '创建文章失败' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
