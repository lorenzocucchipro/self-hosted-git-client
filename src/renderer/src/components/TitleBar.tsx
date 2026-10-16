import React from 'react'
import { GitBranch, KeyRound, Sun, Moon, Home, RefreshCw, Settings, Plug, Check, X, Globe, User } from 'lucide-react'
import { useStore } from '../store/useStore'
import { branding } from '../branding'
import { IconButton, Spinner } from './ui'
import { api, call } from '../lib/ipc'
import { detectProtocol, extractHost } from '../lib/remoteUrl'
import type { RemoteProtocol } from '@shared/types'

export function TitleBar({
  onOpenSettings,
  onOpenConnection,
  onOpenIdentity
}: {
  onOpenSettings: () => void
  onOpenConnection: (host: string, protocol: RemoteProtocol, remoteUrl?: string) => void
  onOpenIdentity: () => void
}): React.JSX.Element {
  const repo = useStore((s) => s.repo)
  const theme = useStore((s) => s.theme)
  const setTheme = useStore((s) => s.setTheme)
  const closeRepo = useStore((s) => s.closeRepo)
  const refreshAll = useStore((s) => s.refreshAll)
  const busy = useStore((s) => s.busy)
  const connectionStatus = useStore((s) => s.connectionStatus)

  const openConnection = async (): Promise<void> => {
    if (!repo) return
    try {
      const remotes = await call(api.getRemotes(repo.path))
      const primary = remotes.find((r) => r.name === 'origin') ?? remotes[0]
      if (!primary) return
      const url = primary.fetch || primary.push
      if (!url) return
      const protocol = detectProtocol(url)
      const host = extractHost(url)
      onOpenConnection(host, protocol, url)
    } catch {
      /* no remotes */
    }
  }

  return (
    <header className="drag-region flex items-center h-11 px-3 bg-app-panel border-b border-app-border shrink-0">
      {/* leave room for macOS traffic lights */}
      <div className="w-16 shrink-0" />

      <div className="flex items-center gap-2 min-w-0">
        <div className="w-6 h-6 rounded-md bg-app-accent flex items-center justify-center shrink-0">
          <GitBranch size={14} className="text-app-accent-fg" />
        </div>
        <span className="font-semibold text-app-text">{branding.name}</span>
        {repo && (
          <>
            <span className="text-app-muted">/</span>
            <span className="text-app-text truncate max-w-[200px]">{repo.name}</span>
            <span className="no-drag flex items-center gap-1 px-2 py-0.5 rounded-full bg-app-panel-2 border border-app-border text-[12px] text-app-text">
              <GitBranch size={11} className="text-app-accent" />
              {repo.isDetached ? `detached @ ${repo.currentBranch}` : repo.currentBranch}
            </span>
            {/* Connection status badge */}
            {connectionStatus && (
              <button
                onClick={openConnection}
                className="no-drag flex items-center gap-1 px-2 py-0.5 rounded-full bg-app-panel-2 border border-app-border text-[11px] text-app-text hover:bg-app-hover transition-colors"
                title={`Connection: ${connectionStatus.protocol.toUpperCase()} — ${connectionStatus.host}`}
              >
                {connectionStatus.protocol === 'ssh' ? (
                  <KeyRound size={11} className="text-app-accent" />
                ) : (
                  <Globe size={11} className="text-app-accent" />
                )}
                {connectionStatus.protocol === 'ssh'
                  ? (connectionStatus.sshKey ?? 'no key')
                  : (connectionStatus.httpsUsername ?? 'no creds')}
                {connectionStatus.protocol === 'ssh'
                  ? (connectionStatus.sshOk
                    ? <Check size={11} className="text-app-success" />
                    : <X size={11} className="text-app-danger" />)
                  : (connectionStatus.httpsOk
                    ? <Check size={11} className="text-app-success" />
                    : <X size={11} className="text-app-danger" />)}
              </button>
            )}
          </>
        )}
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-1 no-drag">
        {busy && <Spinner size={14} />}
        {repo && (
          <IconButton title="Refresh" onClick={() => refreshAll()}>
            <RefreshCw size={16} />
          </IconButton>
        )}
        {repo && (
          <IconButton title="Connection" onClick={openConnection}>
            <Plug size={16} />
          </IconButton>
        )}
        {repo && (
          <IconButton title="Git identity" onClick={onOpenIdentity}>
            <User size={16} />
          </IconButton>
        )}
        <IconButton title="Settings" onClick={onOpenSettings}>
          <Settings size={16} />
        </IconButton>
        <IconButton
          title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </IconButton>
        {repo && (
          <IconButton title="Close repository" onClick={closeRepo}>
            <Home size={16} />
          </IconButton>
        )}
      </div>
    </header>
  )
}
