# `apps/desktop` — PLYSS Admin (desktop)

A native desktop build of the PLYSS admin console for **macOS, Windows, and
Linux**, built with **Electron + electron-vite**. It is the same admin console
that lives under `/admin` in `apps/landing` — same Hallmark heritage design,
same data, same backend — wrapped in a secure, installable desktop shell with
native menus, window-state persistence, and a CORS-free networking path.

```bash
cd apps/desktop
npm install
npm run dev        # launches the app with hot reload
npm run build      # compiles main + preload + renderer into out/
npm run dist:mac   # build a signed-installable .dmg/.zip (also dist:win / dist:linux)
```

The app talks to the production API at `https://api.plyss.ng` out of the box —
no `.env` is required.

---

## Why a desktop app (and how it reuses the web admin)

The admin UI is **copied verbatim** from `apps/landing/src` into
`src/renderer/src/` (the `contexts/`, `components/`, `pages/admin/`, `lib/`, and
`index.css` files). Those copies are intentionally left **byte-for-byte
identical** to the originals so the two stay easy to diff and re-sync. All
desktop-specific behaviour is injected from files this app owns:

| This app's file | Purpose |
| --- | --- |
| `src/main/*` | The Electron main process — window, menu, security, API proxy |
| `src/preload/index.ts` | The context-isolated bridge exposed as `window.plyss` |
| `src/renderer/src/App.tsx` | Desktop routing (HashRouter, admin routes only) |
| `src/renderer/src/main.tsx` | Renderer entry — installs the fetch shim, mounts React |
| `src/renderer/src/desktop/api.ts` | Transparent `fetch` → IPC redirect for API calls |

### Re-syncing with `apps/landing`

When the web admin changes, refresh the copies:

```bash
cd apps/desktop
L=../landing/src D=src/renderer/src
cp "$L/index.css" "$D/index.css"
cp "$L"/contexts/*.tsx "$D/contexts/"
cp "$L"/components/{ProtectedRoute,Logo,HeritageMotif,Turnstile}.tsx "$D/components/"
cp "$L"/components/admin/*.tsx "$D/components/admin/"
cp "$L"/pages/admin/*.tsx "$D/pages/admin/"
cp "$L"/lib/*.ts "$D/lib/"
cp "$L"/assets/plyss-logo.jpeg "$D/assets/"
```

Don't edit the copied files; keep all desktop logic in the table above.

---

## Architecture

```
┌────────────────────────────── Electron ──────────────────────────────┐
│                                                                       │
│  Renderer (Chromium, sandboxed)         Main (Node)                   │
│  ┌──────────────────────────┐           ┌─────────────────────────┐   │
│  │ React admin console       │           │ BrowserWindow, menu      │   │
│  │  · HashRouter             │  preload  │ window-state, CSP        │   │
│  │  · fetch shim ────────────┼──ipc────► │ plyss:apiRequest handler │   │
│  │    (intercepts api.plyss) │  bridge   │  └─ net.fetch ──────────►│──► api.plyss.ng
│  │  · localStorage session   │           │ external links → browser │   │
│  └──────────────────────────┘           └─────────────────────────┘   │
└───────────────────────────────────────────────────────────────────────┘
```

### Networking — the CORS solution

The PLYSS backend uses a **strict CORS allowlist** (`https://plyss.ng`,
`https://www.plyss.ng`, …). An Electron renderer's origin is `file://`, which is
not on that list, so a direct `fetch` from the renderer would be blocked by
Chromium's CORS enforcement.

Instead, every call to the API base is routed through the **main process**:

1. `src/renderer/src/desktop/api.ts` monkey-patches `window.fetch`. Only requests
   to `API_BASE` (`https://api.plyss.ng`) are intercepted; fonts, Cloudinary
   images, and QR rendering use the normal path.
2. Intercepted calls go over the `plyss:apiRequest` IPC channel to the main
   process, which performs the request with Electron's `net.fetch`. **There is no
   browser context in main, so CORS never applies.**
3. The main process enforces a host allowlist (`ALLOWED_API_HOSTS`) over HTTPS so
   the renderer can't use it as an open proxy (SSRF guard).

This is why the copied admin code needs no edits — its plain `fetch` calls "just
work", and the bearer token continues to flow through the `Authorization` header.

### Security posture

- `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`.
- The renderer's only privileged surface is the small, typed `window.plyss`
  bridge (`apiRequest`, `onMenu`, `platform`).
- The API proxy only allows HTTPS to `api.plyss.ng`.
- A Content-Security-Policy is applied in packaged builds.
- All external links (`http(s)`, `mailto:`) open in the user's real browser; the
  app window itself can't be navigated away from the shell.

### Routing

The renderer loads from `file://` in production, so it uses **HashRouter**
(`BrowserRouter`'s History-API paths don't resolve under `file://`). Routes are
admin-only: `/admin`, `/admin/records`, `/admin/enumerators`, `/admin/team`, and
`/admin/id/:type/:id`; anything else redirects to `/admin`.

### Login & Turnstile

The web admin can show a Cloudflare Turnstile captcha on login, gated by a public
site key (`VITE_TURNSTILE_SITEKEY`) on the front end and the `TURNSTILE_SECRET`
on the backend. The desktop build ships **without** a site key, so the widget
renders nothing — appropriate, since Turnstile can't run a domain-bound challenge
from `file://`.

This was verified safe against production: the backend only enforces Turnstile
when `TURNSTILE_SECRET` is set, and it currently is **not** (a tokenless login
returns `401 Invalid credentials`, not `403 Captcha verification failed`). So
desktop login works today.

> ⚠️ If `TURNSTILE_SECRET` is ever provisioned on the backend, **all desktop
> logins would start failing with a 403.** At that point the backend would need a
> desktop-aware exception (e.g. a separate desktop login path or a signed client
> assertion in place of the captcha). Re-run the probe before enabling Turnstile:
> ```bash
> curl -s -o /dev/null -w "%{http_code}\n" -X POST https://api.plyss.ng/api/auth/login \
>   -H "Content-Type: application/json" \
>   --data '{"email":"probe@example.com","password":"x"}'   # 401 = ok, 403 = Turnstile on
> ```

### Offline & fonts

The app is fully usable offline apart from the API itself. The Fraunces / Hanken
Grotesk / JetBrains Mono type is **self-hosted** via `@fontsource` (bundled into
the app, no Google Fonts CDN) — see `src/renderer/src/desktop/fonts.ts`. The full
per-weight subsets (incl. latin-ext) are bundled so Yoruba names with diacritics
(ẹ, ọ, ṣ) render correctly. To change which weights ship, edit that file.

### Native niceties

- **App menu** with section shortcuts (⌘1–⌘4), Sign Out (⌘⇧Q), zoom, reload,
  dev tools, and Help links — wired to the renderer over `plyss:menu`.
- **Window-state persistence** — remembers size/position, re-clamps if a saved
  position is off-screen.
- **CSV export** uses Electron's native Save dialog (the admin's blob download
  triggers a normal "Save As").
- **ID-card photo export** works regardless of Cloudinary's CORS policy: the main
  process forces `Access-Control-Allow-Origin: *` onto image responses, so the
  cross-origin photo both renders on the card (`<img crossorigin>`) and embeds
  into the PNG via html-to-image — under the app's `file://` origin. The web
  admin's "Print / Save as PDF" fallback remains as a safety net.
- **Single-instance lock**, **no white flash on launch** (`backgroundColor` +
  `ready-to-show`), and the in-app **⌘K command palette** works as on the web.

---

## Scripts

| Script | Does |
| --- | --- |
| `npm run dev` | electron-vite dev server with HMR |
| `npm run build` | Build main + preload + renderer to `out/` |
| `npm run start` | Build then launch the production bundle (preview) |
| `npm run typecheck` | Type-check renderer and node code |
| `npm run dist` | Build + package installers for the current OS |
| `npm run dist:mac` / `dist:win` / `dist:linux` | Package for a specific OS |

Packaging is configured in `electron-builder.yml`. Icons for every platform are
auto-derived from `build/icon.png`. To enable auto-update, uncomment and point
the `publish` block at your release host.

### Installing an unsigned local build

Builds made without an Apple Developer certificate are **unsigned/ad-hoc**, so
macOS Gatekeeper will block the first launch. To build and open one:

```bash
# Skip code signing (no certs needed for local testing)
CSC_IDENTITY_AUTO_DISCOVERY=false npm run dist:mac
# → dist-app/PLYSS Admin-<version>-arm64.dmg  (+ .zip and the .app bundle)
```

Open the `.dmg`, drag **PLYSS Admin** to Applications, then either right-click
the app ▸ **Open** (and confirm once), or clear the quarantine flag:

```bash
xattr -dr com.apple.quarantine "/Applications/PLYSS Admin.app"
```

For distribution to other machines without the Gatekeeper prompt, sign and
notarize with a Developer ID (set `CSC_LINK`/`CSC_KEY_PASSWORD` and the
`notarize` options in `electron-builder.yml`).

> **Note:** When running under automation that sets `ELECTRON_RUN_AS_NODE=1`,
> Electron starts in Node mode and `app` is undefined. Unset that variable to
> launch the real GUI (`env -u ELECTRON_RUN_AS_NODE npm run start`).
