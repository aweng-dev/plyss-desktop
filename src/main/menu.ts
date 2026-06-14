import { app, Menu, shell, type BrowserWindow, type MenuItemConstructorOptions } from 'electron'
import { PUBLIC_SITE_URL } from './config'
import { checkForUpdatesManually } from './updater'

// A native application menu. Beyond the standard roles it adds quick navigation
// to each admin section and a Sign-out command, both delivered to the renderer
// over the `plyss:menu` channel (handled in src/renderer/src/App.tsx).

type MenuMessage =
  | { type: 'navigate'; path: string }
  | { type: 'signout' }

const send = (win: BrowserWindow | null, msg: MenuMessage) => {
  win?.webContents.send('plyss:menu', msg)
}

export function buildMenu(getWindow: () => BrowserWindow | null): Menu {
  const isMac = process.platform === 'darwin'

  const appMenu: MenuItemConstructorOptions[] = isMac
    ? [
        {
          label: app.name,
          submenu: [
            { role: 'about' },
            { label: 'Check for Updates…', click: () => checkForUpdatesManually() },
            { type: 'separator' },
            { role: 'services' },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideOthers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' },
          ],
        },
      ]
    : []

  const fileMenu: MenuItemConstructorOptions = {
    label: 'File',
    submenu: [
      {
        label: 'Sign Out',
        accelerator: 'CmdOrCtrl+Shift+Q',
        click: () => send(getWindow(), { type: 'signout' }),
      },
      { type: 'separator' },
      isMac ? { role: 'close' } : { role: 'quit' },
    ],
  }

  const editMenu: MenuItemConstructorOptions = {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      ...(isMac
        ? ([
            { role: 'pasteAndMatchStyle' },
            { role: 'delete' },
            { role: 'selectAll' },
          ] as MenuItemConstructorOptions[])
        : ([{ role: 'delete' }, { type: 'separator' }, { role: 'selectAll' }] as MenuItemConstructorOptions[])),
    ],
  }

  const goItems: MenuItemConstructorOptions[] = [
    { label: 'Overview', accelerator: 'CmdOrCtrl+1', click: () => send(getWindow(), { type: 'navigate', path: '/admin' }) },
    { label: 'Records', accelerator: 'CmdOrCtrl+2', click: () => send(getWindow(), { type: 'navigate', path: '/admin/records' }) },
    { label: 'Enumerators', accelerator: 'CmdOrCtrl+3', click: () => send(getWindow(), { type: 'navigate', path: '/admin/enumerators' }) },
    { label: 'Team', accelerator: 'CmdOrCtrl+4', click: () => send(getWindow(), { type: 'navigate', path: '/admin/team' }) },
  ]

  const viewMenu: MenuItemConstructorOptions = {
    label: 'View',
    submenu: [
      ...goItems,
      { type: 'separator' },
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' },
    ],
  }

  const windowMenu: MenuItemConstructorOptions = {
    label: 'Window',
    submenu: isMac
      ? [
          { role: 'minimize' },
          { role: 'zoom' },
          { type: 'separator' },
          { role: 'front' },
        ]
      : [{ role: 'minimize' }, { role: 'zoom' }, { role: 'close' }],
  }

  const helpMenu: MenuItemConstructorOptions = {
    role: 'help',
    submenu: [
      { label: 'PLYSS Website', click: () => shell.openExternal(PUBLIC_SITE_URL) },
      {
        label: 'Contact Data Lead',
        click: () => shell.openExternal('mailto:info@plyss.org'),
      },
      ...(!isMac
        ? ([
            { type: 'separator' },
            { label: 'Check for Updates…', click: () => checkForUpdatesManually() },
            { role: 'about' },
          ] as MenuItemConstructorOptions[])
        : []),
    ],
  }

  return Menu.buildFromTemplate([
    ...appMenu,
    fileMenu,
    editMenu,
    viewMenu,
    windowMenu,
    helpMenu,
  ])
}
