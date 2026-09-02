import boundaryData from '@/data/farmland-boundaries.json?raw';
import { isAuthenticated, privateResponseHeaders } from '@/lib/auth';

export async function GET(request: Request) {
  if (!(await isAuthenticated(request))) {
    return Response.json(
      { error: '인증이 필요합니다.' },
      { status: 401, headers: privateResponseHeaders },
    );
  }

  const headers = new Headers(privateResponseHeaders);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  return new Response(boundaryData, { headers });
}
