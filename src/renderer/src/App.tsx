import React, { useEffect, useRef, useState } from 'react'
import { PanelLeft, PanelRight } from 'lucide-react'
import { useStore } from './store/useStore'
import { api, call } from './lib/ipc'
import { TitleBar } from './components/TitleBar'
import { Toolbar } from './components/Toolbar'
import { Sidebar } from './components/Sidebar'
import { TabBar } from './components/TabBar'
import { CommitGraph } from './components/CommitGraph'
import { ConflictBar } from './components/ConflictBar'
import { MergeResolver } from './components/MergeResolver'
import { DiffEditor } from './components/DiffEditor'
import { DetailPanel } from './components/DetailPanel'
import { ChangesPanel } from './components/ChangesPanel'
import { StatusBar } from './components/StatusBar'
import { WelcomeScreen } from './components/WelcomeScreen'
import { ErrorBoundary } from './components/ErrorBoundary'
import { SshManager } from './components/SshManager'
import { ConnectionManager } from './components/ConnectionManager'
import { SettingsModal } from './components/SettingsModal'
import { Toast } from './components/Toast'
import { UpdateBanner } from './components/UpdateBanner'
import { SearchBar } from './components/SearchBar'
import { detectProtocol, extractHost } from './lib/remoteUrl'
import type { RemoteProtocol } from '@shared/types'

export default function App(): React.JSX.Element {
  const repo = useStore((s) => s.repo)
  const selection = useStore((s) => s.selection)
  const editorOpen = useStore((s) => s.editorOpen)
  const sidebarOpen = useStore((s) => s.sidebarOpen)
  const sidebarWidth = useStore((s) => s.sidebarWidth)
  const rightOpen = useStore((s) => s.rightOpen)
  const rightWidth = useStore((s) => s.rightWidth)
  const setSidebarWidth = useStore((s) => s.setSidebarWidth)
  const setRightWidth = useStore((s) => s.setRightWidth)
  const toggleSidebar = useStore((s) => s.toggleSidebar)
  const toggleRightSidebar = useStore((s) => s.toggleRightSidebar)
  const loadRecent = useStore((s) => s.loadRecent)
  const restoreSession = useStore((s) => s.restoreSession)
  const checkForUpdate = useStore((s) => s.checkForUpdate)
  const autoFetch = useStore((s) => s.autoFetch)
  const autoFetchMinutes = useStore((s) => s.autoFetchMinutes)
  const resolveFile = useStore((s) => s.resolveFile)
  const closeResolve = useStore((s) => s.closeResolve)
  const [sshOpen, setSshOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [connManager, setConnManager] = useState<{
    host: string
    protocol: RemoteProtocol
    remoteUrl?: string
    pendingRemoteChange?: { repoPath: string; remoteName: string; newUrl: string }
  } | null>(null)
  const dragging = useRef<'left' | 'right' | null>(null)
  const sshOpenRef = useRef(sshOpen)
  sshOpenRef.current = sshOpen

  useEffect(() => {
    loadRecent()
    restoreSession()
  }, [loadRecent, restoreSession])

  // Wire the store's auth-error callback so failed fetch/pull/push can offer
  // a "Set up connection" button that opens the Connection Manager.
  useEffect(() => {
    const openConnection = async (): Promise<void> => {
      const r = useStore.getState().repo
      if (!r) return
      try {
        const remotes = await call(api.getRemotes(r.path))
        const primary = remotes.find((rm) => rm.name === 'origin') ?? remotes[0]
        if (!primary) return
        const url = primary.fetch || primary.push
        if (!url) return
        const protocol = detectProtocol(url)
        const host = extractHost(url)
        setConnManager({ host, protocol, remoteUrl: url })
      } catch {
        /* no remotes */
      }
    }
    useStore.getState().setOnAuthError(openConnection)
    return () => useStore.getState().setOnAuthError(null)
  }, [])

  // Check for a newer release on startup, then periodically (every 6h).
  useEffect(() => {
    checkForUpdate()
    const id = setInterval(() => checkForUpdate(), 6 * 60 * 60 * 1000)
    return () => clearInterval(id)
  }, [checkForUpdate])

  // The moment the app is looked at again (focus / becomes visible), sync:
  // refresh the local state (external git commands, in-progress merges…) and
  // fetch from the remote (throttled inside autoFetch).
  useEffect(() => {
    const onFocus = (): void => {
      const s = useStore.getState()
      if (s.repo && !s.busy) void s.autoFetch()
    }
    const onVisible = (): void => {
      if (document.visibilityState === 'visible') onFocus()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  // Keep the open repo in sync with its remote: fetch when a repo is opened or
  // switched to, then on the configured interval while the app sits in the
  // background. A 0-minute interval disables the remote fetch.
  const repoPath = repo?.path
  useEffect(() => {
    if (!repoPath) return
    autoFetch()
    if (autoFetchMinutes <= 0) return
    const id = setInterval(() => autoFetch(), autoFetchMinutes * 60 * 1000)
    return () => clearInterval(id)
  }, [repoPath, autoFetch, autoFetchMinutes])

  // Global arrow-key navigation: ↑/↓ move within the focused list,
  // ←/→ switch focus between the commit list and the file list.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      // Cmd/Ctrl+F opens search (globally, even while typing). When the diff
      // editor is open it searches the code; otherwise it searches commits.
      if ((e.metaKey || e.ctrlKey) && (e.key === 'f' || e.key === 'F')) {
        const s = useStore.getState()
        if (s.repo) {
          e.preventDefault()
          if (s.editorOpen) s.openEditorSearch()
          else s.openSearch()
        }
        return
      }
      if (sshOpenRef.current) return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      const s = useStore.getState()
      if (!s.repo) return
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          if (s.focusZone === 'commits') s.navigateCommits(1)
          else s.navigateFiles(1)
          break
        case 'ArrowUp':
          e.preventDefault()
          if (s.focusZone === 'commits') s.navigateCommits(-1)
          else s.navigateFiles(-1)
          break
        case 'ArrowLeft':
          e.preventDefault()
          s.setFocusZone('commits')
          break
        case 'ArrowRight':
          e.preventDefault()
          s.setFocusZone('files')
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const onMove = (e: MouseEvent): void => {
      if (!dragging.current) return
      if (dragging.current === 'left') {
        setSidebarWidth(e.clientX)
      } else {
        setRightWidth(window.innerWidth - e.clientX)
      }
    }
    const onUp = (): void => {
      dragging.current = null
      document.body.style.cursor = ''
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [setSidebarWidth, setRightWidth])

  // Re-clamp sidebar widths when the window shrinks so the center pane never
  // falls below its minimum.
  useEffect(() => {
    const onResize = (): void => {
      const inner = window.innerWidth
      const centerMin = 480
      if (sidebarWidth + rightWidth > inner - centerMin) {
        const extra = sidebarWidth + rightWidth - (inner - centerMin)
        // Shrink the larger sidebar first, then the other if needed.
        let left = sidebarWidth
        let right = rightWidth
        if (left >= right) {
          const take = Math.min(extra, left - 180)
          left -= take
          right = Math.max(360, right - (extra - take))
        } else {
          const take = Math.min(extra, right - 360)
          right -= take
          left = Math.max(180, left - (extra - take))
        }
        setSidebarWidth(left)
        setRightWidth(right)
      }
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [sidebarWidth, rightWidth, setSidebarWidth, setRightWidth])

  return (
    <div className="h-screen flex flex-col bg-app-bg text-app-text">
      <TitleBar
        onOpenSsh={() => setSshOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenConnection={(host, protocol, remoteUrl) => setConnManager({ host, protocol, remoteUrl })}
      />
      <UpdateBanner />

      {repo ? (
        <>
          <TabBar />
          <Toolbar />
          <ConflictBar />
          <div className="flex-1 flex min-h-0">
            {sidebarOpen ? (
              <>
                <ErrorBoundary fallback={<span>Sidebar failed to render.</span>}>
                  <Sidebar />
                </ErrorBoundary>
                <div
                  onMouseDown={() => {
                    dragging.current = 'left'
                    document.body.style.cursor = 'col-resize'
                  }}
                  className="w-1 cursor-col-resize bg-transparent hover:bg-app-accent/50 transition-colors shrink-0"
                />
              </>
            ) : (
              <button
                onClick={toggleSidebar}
                title="Show sidebar"
                className="shrink-0 flex flex-col items-center justify-center w-3 bg-app-panel border-r border-app-border hover:bg-app-hover text-app-muted"
              >
                <PanelLeft size={14} />
              </button>
            )}
            <main className="flex-1 min-w-0 border-r border-app-border">
              <ErrorBoundary fallback={<span>History failed to render.</span>}>
                {editorOpen ? <DiffEditor /> : <CommitGraph />}
              </ErrorBoundary>
            </main>
            <div
              onMouseDown={() => {
                dragging.current = 'right'
                document.body.style.cursor = 'col-resize'
              }}
              className="w-1 cursor-col-resize bg-transparent hover:bg-app-accent/50 transition-colors shrink-0"
            />
            {rightOpen ? (
              <section
                style={{ width: rightWidth }}
                className="shrink-0 bg-app-panel overflow-hidden"
              >
                <ErrorBoundary fallback={<span>Detail panel failed to render.</span>}>
                  {selection?.type === 'wip' ? <ChangesPanel /> : <DetailPanel />}
                </ErrorBoundary>
              </section>
            ) : (
              <button
                onClick={toggleRightSidebar}
                title="Show right sidebar"
                className="shrink-0 flex flex-col items-center justify-center w-3 bg-app-panel border-l border-app-border hover:bg-app-hover text-app-muted"
              >
                <PanelRight size={14} />
              </button>
            )}
          </div>
          <StatusBar />
        </>
      ) : (
        <WelcomeScreen
          onOpenSsh={() => setSshOpen(true)}
          onOpenConnection={(host, protocol, remoteUrl) => setConnManager({ host, protocol, remoteUrl })}
        />
      )}

      {sshOpen && <SshManager onClose={() => setSshOpen(false)} />}
      {settingsOpen && (
        <SettingsModal
          onClose={() => setSettingsOpen(false)}
          onOpenConnection={(host, protocol, pendingRemoteChange) => {
            setSettingsOpen(false)
            setConnManager({ host, protocol, remoteUrl: pendingRemoteChange?.newUrl, pendingRemoteChange })
          }}
        />
      )}
      {connManager && (
        <ConnectionManager
          host={connManager.host}
          protocol={connManager.protocol}
          remoteUrl={connManager.remoteUrl}
          onConnected={async () => {
            const pending = connManager.pendingRemoteChange
            setConnManager(null)
            if (pending) {
              await useStore.getState().setRemoteUrl(pending.repoPath, pending.remoteName, pending.newUrl)
            } else {
              useStore.getState().refreshConnectionStatus?.()
            }
          }}
          onClose={() => setConnManager(null)}
        />
      )}
      {resolveFile && <MergeResolver file={resolveFile} onClose={closeResolve} />}
      <SearchBar />
      <Toast />
    </div>
  )
}
