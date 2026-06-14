// ─────────────────────────────────────────────────────────────────────────────
// PLYSS admin auth client
//
// This is the ONLY file that knows the shape of your custom API. To wire the
// login to your backend, adjust the four marked values in the ADAPT block below.
//
// Security notes (please read):
//  • The session token is kept in localStorage. That is convenient but readable
//    by any script on the page, so it is vulnerable to XSS. For stronger security
//    have your API set an httpOnly, Secure, SameSite cookie instead and switch
//    `credentials: 'include'` on (see apiFetch) — then you can stop storing the
//    token here entirely.
//  • The /admin route guard is a UX convenience, NOT a security boundary. Real
//    protection must live on the server: every admin endpoint must reject requests
//    that lack a valid token. The frontend cannot keep anyone out on its own.
//  • Your API must allow this site's origin via CORS.
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminSession {
  token: string;
  admin: { email: string; name?: string };
}

/** Thrown for any login failure; `message` is safe to show the user. */
export class AuthError extends Error {}

const STORAGE_KEY = 'plyss.admin.session';

// ╔═══════════════════════ ADAPT TO YOUR API ═══════════════════════╗
// 1) Base URL of your API. Hardcoded to the production API. For local/staging,
//    edit this literal (e.g. 'http://localhost:8787').
export const API_BASE = 'https://api.plyss.ng';
// 2) Path of the login endpoint, appended to API_BASE.
const LOGIN_PATH = '/api/auth/login';
// 3) Build the request body your API expects from the email + password.
const loginBody = (email: string, password: string, turnstileToken?: string) => ({
  email,
  password,
  ...(turnstileToken ? { turnstileToken } : {}),
});
// 4) Pull the token (and any admin info) out of your API's success response.
const readToken = (data: Record<string, unknown>): string | undefined =>
  (data.token ?? data.accessToken ?? data.access_token) as string | undefined;
const readAdmin = (data: Record<string, unknown>, email: string): AdminSession['admin'] => {
  const a = (data.admin ?? data.user ?? {}) as { email?: string; name?: string };
  return { email: a.email ?? email, name: a.name };
};
// ╚═════════════════════════════════════════════════════════════════╝

export function isConfigured(): boolean {
  return API_BASE.length > 0;
}

export async function login(email: string, password: string, turnstileToken?: string): Promise<AdminSession> {
  if (!isConfigured()) {
    throw new AuthError(
      'Login isn’t connected yet. Set VITE_API_BASE_URL in a .env file to your API, then restart the dev server.',
    );
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${LOGIN_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(loginBody(email, password, turnstileToken)),
      // If you switch to httpOnly cookies, set this to 'include' and drop the token storage.
      credentials: 'omit',
    });
  } catch {
    throw new AuthError('Couldn’t reach the server. Check your connection and try again.');
  }

  if (res.status === 401 || res.status === 403) {
    throw new AuthError('Incorrect email or password.');
  }
  if (res.status === 429) {
    throw new AuthError('Too many attempts. Please wait a moment and try again.');
  }
  if (!res.ok) {
    throw new AuthError('Something went wrong signing in. Please try again.');
  }

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const token = readToken(data);
  if (!token) {
    throw new AuthError('Signed in, but the server didn’t return a session token.');
  }

  const session: AdminSession = { token, admin: readAdmin(data, email) };
  saveSession(session);
  return session;
}

export function saveSession(session: AdminSession): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* storage unavailable (private mode) — session simply won't persist */
  }
}

export function getSession(): AdminSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as AdminSession) : null;
    return parsed && typeof parsed.token === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function getToken(): string | null {
  return getSession()?.token ?? null;
}

/**
 * Authenticated fetch for future admin API calls. Adds the Bearer token.
 * Usage: const res = await apiFetch('/admin/figures', { method: 'PUT', body: ... })
 */
export function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
