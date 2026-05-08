import type { APIRoute } from 'astro';
import { postDb } from '@/lib/db';
import { triggerRebuild } from '@/lib/rebuild';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  try {
    const id = params.id;
    if (!id) {
      return new Response(
        JSON.stringify({ error: '文章ID不能为空' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const post = postDb.getById(id);

    if (!post) {
      return new Response(
        JSON.stringify({ error: '文章不存在' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ post }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: '获取文章失败' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const id = params.id;
    if (!id) {
      return new Response(
        JSON.stringify({ error: '文章ID不能为空' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await request.json();
    const post = postDb.update(id, data);

    if (!post) {
      return new Response(
        JSON.stringify({ error: '文章不存在' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Trigger rebuild in background (don't wait for it)
    triggerRebuild().catch(err => console.error('Background rebuild failed:', err));

    return new Response(
      JSON.stringify({ success: true, post, message: '文章已更新，网站正在重新构建中...' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || '更新文章失败' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const DELETE: APIRoute = async ({ params }) => {
  try {
    const id = params.id;
    if (!id) {
      return new Response(
        JSON.stringify({ error: '文章ID不能为空' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const success = postDb.delete(id);

    if (!success) {
      return new Response(
        JSON.stringify({ error: '文章不存在' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Trigger rebuild in background (don't wait for it)
    triggerRebuild().catch(err => console.error('Background rebuild failed:', err));

    return new Response(
      JSON.stringify({ success: true, message: '文章已删除，网站正在重新构建中...' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: '删除文章失败' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
