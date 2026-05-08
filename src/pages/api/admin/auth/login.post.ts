import type { APIRoute } from 'astro';
import { authDb } from '@/lib/db';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: '用户名和密码不能为空' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const user = authDb.verifyUser(username, password);

    if (!user) {
      return new Response(
        JSON.stringify({ error: '用户名或密码错误' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Set simple session cookie (in production, use proper JWT/session)
    return new Response(
      JSON.stringify({ success: true, user: { id: user.id, username: user.username } }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': `admin_session=${user.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`
        }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: '服务器错误' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
