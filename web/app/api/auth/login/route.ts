import {
  createSessionCookie,
  createSessionToken,
  privateResponseHeaders,
  verifyPassword,
} from '@/lib/auth';

const MAX_BODY_BYTES = 1024;

function json(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  for (const [name, value] of Object.entries(privateResponseHeaders)) {
    headers.set(name, value);
  }
  return new Response(JSON.stringify(body), { ...init, headers });
}

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return json(
      { ok: false, message: '요청 크기가 너무 큽니다.' },
      { status: 413 },
    );
  }

  const rawBody = await request.text();
  if (textLength(rawBody) > MAX_BODY_BYTES) {
    return json(
      { ok: false, message: '요청 크기가 너무 큽니다.' },
      { status: 413 },
    );
  }

  let password: unknown;
  try {
    const body = JSON.parse(rawBody) as { password?: unknown };
    password = body.password;
  } catch {
    return json({ ok: false, message: '올바르지 않은 요청입니다.' }, { status: 400 });
  }

  if (typeof password !== 'string' || !(await verifyPassword(password))) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    return json(
      { ok: false, message: '암호가 올바르지 않습니다.' },
      { status: 401 },
    );
  }

  const token = await createSessionToken();
  const response = json({ ok: true });
  response.headers.set('Set-Cookie', createSessionCookie(token, request.url));
  return response;
}

function textLength(value: string) {
  return new TextEncoder().encode(value).length;
}
