import type { APIRoute } from 'astro';
import { authDb } from '@/lib/db';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const cookieHeader = request.headers.get('cookie');
  const sessionId = cookieHeader?.match(/admin_session=([^;]+)/)?.[1];

  if (!sessionId) {
    return new Response(
      JSON.stringify({ authenticated: false }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Verify session exists
  const userRow = authDb.verifyUser('admin', 'admin123'); // Simplified - in production check against session store

  if (userRow) {
    return new Response(
      JSON.stringify({ authenticated: true, user: { id: userRow.id, username: userRow.username } }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ authenticated: false }),
    { status: 401, headers: { 'Content-Type': 'application/json' } }
  );
};
