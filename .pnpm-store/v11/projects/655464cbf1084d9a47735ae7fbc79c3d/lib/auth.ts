const SESSION_COOKIE = 'farmland_session';
const SESSION_DURATION_SECONDS = 8 * 60 * 60;
const textEncoder = new TextEncoder();

function getPassword() {
  return process.env.FARMLAND_PASSWORD ?? 'LX';
}

function getSessionSecret() {
  return (
    process.env.FARMLAND_SESSION_SECRET ??
    `farmland-survey-session:${getPassword()}:2026-09`
  );
}

function encodeBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/u, '');
}

function decodeBase64Url(value: string) {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function sha256(value: string) {
  return new Uint8Array(
    await crypto.subtle.digest('SHA-256', textEncoder.encode(value)),
  );
}

async function hmac(value: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(getSessionSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint8Array(
    await crypto.subtle.sign('HMAC', key, textEncoder.encode(value)),
  );
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

export async function verifyPassword(candidate: string) {
  const [candidateDigest, expectedDigest] = await Promise.all([
    sha256(candidate),
    sha256(getPassword()),
  ]);
  return constantTimeEqual(candidateDigest, expectedDigest);
}

export async function createSessionToken() {
  const expiresAt = Date.now() + SESSION_DURATION_SECONDS * 1000;
  const payload = String(expiresAt);
  const signature = encodeBase64Url(await hmac(payload));
  return `${payload}.${signature}`;
}

export async function verifySessionToken(token: string | undefined) {
  if (!token) return false;

  const separator = token.indexOf('.');
  if (separator < 1 || separator === token.length - 1) return false;

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expiresAt = Number(payload);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Date.now()) return false;

  try {
    const expected = await hmac(payload);
    const supplied = decodeBase64Url(signature);
    return constantTimeEqual(supplied, expected);
  } catch {
    return false;
  }
}

export function getSessionCookie(request: Request) {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return undefined;

  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    const name = part.slice(0, separator).trim();
    if (name !== SESSION_COOKIE) continue;
    return part.slice(separator + 1).trim();
  }

  return undefined;
}

export async function isAuthenticated(request: Request) {
  return verifySessionToken(getSessionCookie(request));
}

export function createSessionCookie(token: string, requestUrl: string) {
  const secure = new URL(requestUrl).protocol === 'https:' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_DURATION_SECONDS}${secure}`;
}

export function clearSessionCookie(requestUrl: string) {
  const secure = new URL(requestUrl).protocol === 'https:' ? '; Secure' : '';
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}

export const privateResponseHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
  Pragma: 'no-cache',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
};
