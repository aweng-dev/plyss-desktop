// Ambient declaration of the preload bridge for the renderer's TypeScript.

interface PlyssApiRequest {
  url: string
  method?: string
  headers?: Record<string, string>
  body?: string
}

interface PlyssApiResponse {
  ok: boolean
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
}

type PlyssMenuMessage = { type: 'navigate'; path: string } | { type: 'signout' }

interface PlyssBridge {
  platform: string
  apiRequest: (req: PlyssApiRequest) => Promise<PlyssApiResponse>
  onMenu: (handler: (msg: PlyssMenuMessage) => void) => () => void
}

interface Window {
  plyss: PlyssBridge
}
