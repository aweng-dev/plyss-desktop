// Cloudflare Turnstile configuration (injected at build time).
// When no site key is set, the widget renders nothing and login stays usable.

export const TURNSTILE_SITEKEY = import.meta.env.VITE_TURNSTILE_SITEKEY;
export const turnstileEnabled = Boolean(TURNSTILE_SITEKEY);
