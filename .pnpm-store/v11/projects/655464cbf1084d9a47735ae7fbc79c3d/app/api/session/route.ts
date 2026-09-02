import { isAuthenticated, privateResponseHeaders } from '@/lib/auth';

export async function GET(request: Request) {
  const authenticated = await isAuthenticated(request);
  return Response.json(
    { authenticated },
    { headers: privateResponseHeaders },
  );
}
