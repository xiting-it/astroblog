import type { APIRoute } from 'astro';
import { postDb } from '@/lib/db';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const status = url.searchParams.get('status') as 'draft' | 'published' | 'all' || 'all';

  try {
    const posts = postDb.getAll(status);
    return new Response(
      JSON.stringify({ posts }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: '获取文章列表失败' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
