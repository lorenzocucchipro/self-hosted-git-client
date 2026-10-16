import type { ThemeMode } from '../branding'
import type { GitProfile } from '@shared/types'

/** User preferences persisted locally (renderer-side, survives restarts). */
export interface Prefs {
  theme: ThemeMode
  /** background auto-fetch interval in minutes; 0 disables it */
  autoFetchMinutes: number
  /** how the diff editor opens by default */
  defaultDiffView: 'inline' | 'split'
  /** left sidebar visible */
  sidebarOpen: boolean
  /** left sidebar width in px */
  sidebarWidth: number
  /** right sidebar visible */
  rightOpen: boolean
  /** right sidebar width in px */
  rightWidth: number
  /** saved git identity profiles */
  profiles: GitProfile[]
}

const KEY = 'app-prefs'
const DEFAULTS: Prefs = {
  theme: 'dark',
  autoFetchMinutes: 5,
  defaultDiffView: 'split',
  sidebarOpen: true,
  sidebarWidth: 240,
  rightOpen: true,
  rightWidth: 504,
  profiles: []
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max)
}

function asBoolean(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback
}

function asNumber(v: unknown, fallback: number, min?: number, max?: number): number {
  let n = typeof v === 'number' && !Number.isNaN(v) ? v : fallback
  if (min !== undefined) n = Math.max(n, min)
  if (max !== undefined) n = Math.min(n, max)
  return n
}

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const p = JSON.parse(raw) as Partial<Prefs>
      const centerMin = 480
      const innerWidth = typeof window !== 'undefined' ? window.innerWidth : 1200
      const maxSidebar = Math.max(180, innerWidth - 504 - centerMin)
      const maxRight = Math.max(360, innerWidth - 240 - centerMin)
      return {
        theme: p.theme === 'light' ? 'light' : 'dark',
        autoFetchMinutes: asNumber(p.autoFetchMinutes, DEFAULTS.autoFetchMinutes, 0),
        defaultDiffView: p.defaultDiffView === 'inline' ? 'inline' : 'split',
        sidebarOpen: asBoolean(p.sidebarOpen, DEFAULTS.sidebarOpen),
        sidebarWidth: asNumber(p.sidebarWidth, DEFAULTS.sidebarWidth, 180, maxSidebar),
        rightOpen: asBoolean(p.rightOpen, DEFAULTS.rightOpen),
        rightWidth: asNumber(p.rightWidth, DEFAULTS.rightWidth, 360, maxRight),
        profiles: Array.isArray(p.profiles) ? p.profiles : []
      }
    }
  } catch {
    /* corrupt/unavailable — fall back to defaults */
  }
  return { ...DEFAULTS }
}

export function savePrefs(p: Prefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    /* storage unavailable — preferences just won't persist */
  }
}

const EXPANDED_KEY = (repoPath: string) => `app-expanded-${repoPath}`

/** Per-repository set of expanded folder paths in the sidebar reference tree. */
export function loadExpandedFolders(repoPath: string): Set<string> {
  try {
    const raw = localStorage.getItem(EXPANDED_KEY(repoPath))
    if (raw) {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) {
        return new Set(parsed.filter((p): p is string => typeof p === 'string'))
      }
    }
  } catch {
    /* corrupt/unavailable — fall back to empty */
  }
  return new Set()
}

export function saveExpandedFolders(repoPath: string, expanded: Set<string>): void {
  try {
    localStorage.setItem(EXPANDED_KEY(repoPath), JSON.stringify([...expanded]))
  } catch {
    /* storage unavailable — state just won't persist */
  }
}
