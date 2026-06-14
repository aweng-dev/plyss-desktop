import { app, screen, type BrowserWindow, type Rectangle } from 'electron'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// Lightweight window-bounds persistence — remembers size and position between
// launches, and re-clamps to a visible display if the saved spot is off-screen
// (e.g. an external monitor was unplugged).

interface WindowState {
  width: number
  height: number
  x?: number
  y?: number
}

const DEFAULTS: WindowState = { width: 1280, height: 832 }
const MIN_WIDTH = 940
const MIN_HEIGHT = 600

const stateFile = (): string => join(app.getPath('userData'), 'window-state.json')

function isVisibleOn(bounds: Rectangle): boolean {
  return screen.getAllDisplays().some((display) => {
    const a = display.workArea
    return (
      bounds.x < a.x + a.width &&
      bounds.x + bounds.width > a.x &&
      bounds.y < a.y + a.height &&
      bounds.y + bounds.height > a.y
    )
  })
}

export function loadWindowState(): WindowState {
  try {
    const saved = JSON.parse(readFileSync(stateFile(), 'utf-8')) as WindowState
    const width = Math.max(MIN_WIDTH, saved.width || DEFAULTS.width)
    const height = Math.max(MIN_HEIGHT, saved.height || DEFAULTS.height)
    if (
      typeof saved.x === 'number' &&
      typeof saved.y === 'number' &&
      isVisibleOn({ x: saved.x, y: saved.y, width, height })
    ) {
      return { width, height, x: saved.x, y: saved.y }
    }
    return { width, height }
  } catch {
    return { ...DEFAULTS }
  }
}

/** Persist the window's bounds on resize/move/close. */
export function trackWindowState(win: BrowserWindow): void {
  const save = () => {
    if (win.isDestroyed() || win.isMinimized()) return
    // Use normal (non-maximised) bounds so we restore to a sensible size.
    const b = win.getNormalBounds()
    try {
      writeFileSync(stateFile(), JSON.stringify({ width: b.width, height: b.height, x: b.x, y: b.y }))
    } catch {
      /* best-effort — a failed write just means we fall back to defaults */
    }
  }

  let timer: NodeJS.Timeout | null = null
  const debouncedSave = () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(save, 400)
  }

  win.on('resize', debouncedSave)
  win.on('move', debouncedSave)
  win.on('close', save)
}

export const WINDOW_MIN = { width: MIN_WIDTH, height: MIN_HEIGHT }
