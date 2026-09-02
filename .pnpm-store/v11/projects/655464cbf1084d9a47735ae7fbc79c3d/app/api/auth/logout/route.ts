import { clearSessionCookie, privateResponseHeaders } from '@/lib/auth';

export async function POST(request: Request) {
  const headers = new Headers(privateResponseHeaders);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('Set-Cookie', clearSessionCookie(request.url));
  return new Response(JSON.stringify({ ok: true }), { headers });
}
