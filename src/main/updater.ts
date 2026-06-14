import { app, dialog, BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'

// ─────────────────────────────────────────────────────────────────────────────
// Auto-update via GitHub Releases.
//
// electron-builder publishes the installers plus the update manifests
// (latest.yml / latest-mac.yml / latest-linux.yml) to the repo's GitHub
// Releases, and bakes an app-update.yml into the app pointing back at the public
// repo. electron-updater reads those at runtime — no token needed for a public
// repo. On launch we check + download in the background, then offer a restart.
//
// Platform notes:
//  • Windows (NSIS) and Linux (AppImage) auto-update for unsigned builds.
//  • macOS auto-update requires the app to be SIGNED + NOTARIZED (Squirrel.Mac
//    refuses unsigned updates). Until a Developer ID cert is configured, the mac
//    check fails quietly here; users update by downloading a new build.
// ─────────────────────────────────────────────────────────────────────────────

let manualCheck = false
let updateDownloaded = false

function activeWindow(): BrowserWindow | null {
  return BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null
}

/** Show a message box, anchored to the app window when there is one. */
function notify(options: Electron.MessageBoxOptions): Promise<Electron.MessageBoxReturnValue> {
  const win = activeWindow()
  return win ? dialog.showMessageBox(win, options) : dialog.showMessageBox(options)
}

export function initAutoUpdates(): void {
  // Only meaningful for a packaged app pulling from GitHub Releases.
  if (!app.isPackaged) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info) => {
    // Download proceeds automatically; only surface this for a manual check.
    if (!manualCheck) return
    void notify({
      type: 'info',
      buttons: ['OK'],
      title: 'Update available',
      message: `A new version (${info.version}) is available.`,
      detail: 'It’s downloading in the background — you’ll be prompted to restart when it’s ready.',
    })
  })

  autoUpdater.on('update-not-available', () => {
    if (!manualCheck) return
    manualCheck = false
    void notify({
      type: 'info',
      buttons: ['OK'],
      title: 'You’re up to date',
      message: `PLYSS Admin ${app.getVersion()} is the latest version.`,
    })
  })

  autoUpdater.on('error', (err) => {
    if (!manualCheck) return // stay quiet for background checks (offline, unsigned mac, etc.)
    manualCheck = false
    void notify({
      type: 'error',
      buttons: ['OK'],
      title: 'Update check failed',
      message: 'Could not check for updates.',
      detail: err == null ? 'Unknown error' : err.message || String(err),
    })
  })

  autoUpdater.on('update-downloaded', async (info) => {
    updateDownloaded = true
    manualCheck = false
    const { response } = await notify({
      type: 'info',
      buttons: ['Restart now', 'Later'],
      defaultId: 0,
      cancelId: 1,
      title: 'Update ready',
      message: `Version ${info.version} has been downloaded.`,
      detail: 'Restart to apply it now. Otherwise it installs automatically next time you quit.',
    })
    if (response === 0) setImmediate(() => autoUpdater.quitAndInstall())
  })

  // Silent check shortly after startup.
  void autoUpdater.checkForUpdates().catch(() => { /* surfaced via the 'error' handler */ })
}

/** Backs the "Check for Updates…" menu item — always gives the user feedback. */
export function checkForUpdatesManually(): void {
  if (!app.isPackaged) {
    void notify({
      type: 'info',
      buttons: ['OK'],
      title: 'Updates',
      message: 'Update checks are only available in the installed app.',
    })
    return
  }
  if (updateDownloaded) {
    void autoUpdater.quitAndInstall()
    return
  }
  manualCheck = true
  void autoUpdater.checkForUpdates().catch(() => { /* surfaced via the 'error' handler */ })
}
