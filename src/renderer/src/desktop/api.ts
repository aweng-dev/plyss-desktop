import { API_BASE } from '../lib/auth'

// ─────────────────────────────────────────────────────────────────────────────
// Renderer-side fetch shim.
//
// The copied admin code (lib/auth.ts, lib/adminApi.ts) talks to the API with the
// standard `fetch(`${API_BASE}…`)`. In Electron that would hit a CORS wall, so
// here we transparently redirect *only* those calls through the main-process
// proxy (window.plyss.apiRequest). Everything else — Google Fonts, Cloudinary
// images pulled by html-to-image, QR rendering — uses the normal network path.
//
// This keeps the reused admin source byte-for-byte identical to apps/landing.
// ─────────────────────────────────────────────────────────────────────────────

function normaliseHeaders(h?: HeadersInit): Record<string, string> {
  const out: Record<string, string> = {}
  if (!h) return out
  if (h instanceof Headers) h.forEach((value, key) => (out[key] = value))
  else if (Array.isArray(h)) h.forEach(([key, value]) => (out[key] = value))
  else Object.assign(out, h)
  return out
}

export function installApiBridge(): void {
  // Outside Electron (e.g. running the renderer in a plain browser) there is no
  // bridge — leave the native fetch untouched.
  if (typeof window === 'undefined' || !window.plyss?.apiRequest) return

  const nativeFetch = window.fetch.bind(window)

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input instanceof Request
            ? input.url
            : String(input)

    // Proxy only plain (string/URL) calls to the API base. Fall back to native
    // for Request objects and any other origin.
    if (input instanceof Request || !url.startsWith(API_BASE)) {
      return nativeFetch(input as RequestInfo, init)
    }

    const method = (init?.method ?? 'GET').toUpperCase()
    const headers = normaliseHeaders(init?.headers)
    const body = typeof init?.body === 'string' ? init.body : undefined

    const res = await window.plyss.apiRequest({ url, method, headers, body })

    // 204/205 must not carry a body when constructing a Response.
    const hasBody = res.status !== 204 && res.status !== 205
    return new Response(hasBody ? res.body : null, {
      status: res.status,
      statusText: res.statusText,
      headers: new Headers(res.headers),
    })
  }
}
