import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'

// The only surface the renderer can see of the main process. Everything is
// funnelled through here so the renderer stays sandboxed and context-isolated.

interface ApiRequest {
  url: string
  method?: string
  headers?: Record<string, string>
  body?: string
}

interface ApiResponse {
  ok: boolean
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
}

type MenuMessage = { type: 'navigate'; path: string } | { type: 'signout' }

const bridge = {
  /** OS platform string, e.g. 'darwin' | 'win32' | 'linux'. */
  platform: process.platform,

  /** Forward an admin API call to the main process (bypasses renderer CORS). */
  apiRequest: (req: ApiRequest): Promise<ApiResponse> => ipcRenderer.invoke('plyss:apiRequest', req),

  /** Subscribe to native-menu commands. Returns an unsubscribe function. */
  onMenu: (handler: (msg: MenuMessage) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, msg: MenuMessage) => handler(msg)
    ipcRenderer.on('plyss:menu', listener)
    return () => ipcRenderer.removeListener('plyss:menu', listener)
  },
}

export type PlyssBridge = typeof bridge

contextBridge.exposeInMainWorld('plyss', bridge)
