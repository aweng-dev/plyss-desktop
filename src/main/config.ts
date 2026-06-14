// Shared main-process constants.

/**
 * Hosts the renderer is allowed to reach through the main-process API proxy.
 * Keeping this to an explicit allowlist means a compromised renderer can't turn
 * the desktop app into an open proxy (SSRF). Mirrors API_BASE in the admin
 * client (src/renderer/src/lib/auth.ts → https://api.plyss.ng).
 */
export const ALLOWED_API_HOSTS = new Set<string>(['api.plyss.ng'])

/** The PLYSS public site, opened from menu/help links. */
export const PUBLIC_SITE_URL = 'https://plyss.ng'

/** Brand colour used for the window background (no white flash on launch). */
export const BRAND_BG = '#1f3d2b'
