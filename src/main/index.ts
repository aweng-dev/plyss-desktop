import { app, BrowserWindow, Menu, shell, session } from 'electron'
import { join } from 'node:path'
import { registerApiProxy } from './api'
import { buildMenu } from './menu'
import { loadWindowState, trackWindowState, WINDOW_MIN } from './windowState'
import { initAutoUpdates } from './updater'
import { BRAND_BG } from './config'

// electron-vite sets this to the dev-server URL while developing; it is undefined
// in a packaged build, where we load the bundled HTML from disk.
const RENDERER_DEV_URL = process.env.ELECTRON_RENDERER_URL

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  const state = loadWindowState()

  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: WINDOW_MIN.width,
    minHeight: WINDOW_MIN.height,
    show: false,
    backgroundColor: BRAND_BG,
    title: 'PLYSS Admin',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true,
    },
  })

  trackWindowState(mainWindow)

  // Reveal only once painted — avoids a blank/white flash on launch.
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Open every external link in the user's real browser, never an in-app window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:|^mailto:/.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })

  // Block in-app navigation away from the app shell (defence in depth); send
  // any external URL to the browser instead.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const isAppUrl = RENDERER_DEV_URL ? url.startsWith(RENDERER_DEV_URL) : url.startsWith('file://')
    if (!isAppUrl) {
      event.preventDefault()
      if (/^https?:|^mailto:/.test(url)) void shell.openExternal(url)
    }
  })

  if (RENDERER_DEV_URL) {
    void mainWindow.loadURL(RENDERER_DEV_URL)
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

/**
 * Response-header policy, applied via a single `onHeadersReceived` listener
 * (Electron only honours the last one registered, so both concerns live here):
 *
 *  1. CORS for images — the ID-card photos are served cross-origin by Cloudinary
 *     and rendered with `crossorigin="anonymous"`. Under the app's file:// origin
 *     that only works if the response is CORS-clean. We force
 *     `Access-Control-Allow-Origin: *` on image responses so the photo both
 *     displays on the card and can be embedded into the exported PNG by
 *     html-to-image — independent of Cloudinary's own CORS configuration. These
 *     are public image bytes, so this is safe.
 *  2. CSP — a strict policy on the app's own documents in packaged builds.
 */
function configureSessionHeaders(): void {
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    // Fonts are bundled locally now (@fontsource) — no external stylesheet host.
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self' data: blob: https:",
    // API traffic goes through the main process (IPC), so the renderer never
    // connects to the API directly. The remaining outbound need is html-to-image
    // embedding remote (Cloudinary) photos when exporting an ID card.
    "connect-src 'self' https:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders: Record<string, string[]> = { ...details.responseHeaders }

    const contentType = Object.entries(responseHeaders)
      .find(([key]) => key.toLowerCase() === 'content-type')?.[1]?.[0]
      ?.toLowerCase() ?? ''

    if (contentType.startsWith('image/')) {
      // Drop any existing (possibly origin-restricted) ACAO and allow all, so the
      // file:// renderer can read these public image bytes CORS-clean.
      for (const key of Object.keys(responseHeaders)) {
        if (key.toLowerCase() === 'access-control-allow-origin') delete responseHeaders[key]
      }
      responseHeaders['Access-Control-Allow-Origin'] = ['*']
    }

    if (app.isPackaged) {
      responseHeaders['Content-Security-Policy'] = [csp]
    }

    callback({ responseHeaders })
  })
}

// Single-instance: focus the existing window instead of opening a second copy.
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    app.setName('PLYSS Admin')

    configureSessionHeaders()
    registerApiProxy()
    Menu.setApplicationMenu(buildMenu(() => mainWindow))

    createWindow()
    initAutoUpdates()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
