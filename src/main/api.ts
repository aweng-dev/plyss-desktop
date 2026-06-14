import { ipcMain, net } from 'electron'
import { ALLOWED_API_HOSTS } from './config'

// ─────────────────────────────────────────────────────────────────────────────
// Main-process API proxy.
//
// The PLYSS backend uses a strict CORS allowlist (only https://plyss.ng et al).
// An Electron renderer's origin (file://) is not on that list, so a direct fetch
// from the renderer would be blocked by Chromium's CORS enforcement.
//
// Instead, every admin API call is forwarded here and made from the main process
// with Electron's `net` module. There is no browser context, so CORS never
// applies — and we get a single, auditable network choke point. The renderer's
// fetch shim (src/renderer/src/desktop/api.ts) transparently redirects calls to
// the API base through this channel; the copied admin code is left untouched.
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiRequest {
  url: string
  method?: string
  headers?: Record<string, string>
  body?: string
}

export interface ApiResponse {
  ok: boolean
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
}

async function handleApiRequest(req: ApiRequest): Promise<ApiResponse> {
  let parsed: URL
  try {
    parsed = new URL(req.url)
  } catch {
    throw new Error('Invalid request URL')
  }

  // Hard security boundary: only the known API host(s), over HTTPS.
  if (parsed.protocol !== 'https:' || !ALLOWED_API_HOSTS.has(parsed.host)) {
    throw new Error(`Blocked request to disallowed host: ${parsed.host}`)
  }

  // Electron's `net` uses the OS network stack (honours proxies/VPNs) and, run
  // from main, is not subject to CORS.
  const res = await net.fetch(req.url, {
    method: req.method ?? 'GET',
    headers: req.headers ?? {},
    body: req.body,
    // We forward the bearer token explicitly; no ambient cookies.
    credentials: 'omit',
  })

  const headers: Record<string, string> = {}
  res.headers.forEach((value, key) => {
    headers[key] = value
  })

  const body = await res.text()

  return {
    ok: res.ok,
    status: res.status,
    statusText: res.statusText,
    headers,
    body,
  }
}

/** Register the `plyss:apiRequest` IPC channel. Call once during app startup. */
export function registerApiProxy(): void {
  ipcMain.handle('plyss:apiRequest', async (_event, req: ApiRequest): Promise<ApiResponse> => {
    return handleApiRequest(req)
  })
}
