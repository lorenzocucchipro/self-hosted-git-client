import React, { useEffect, useState } from 'react'
import { Trash2, Edit2, Plus } from 'lucide-react'
import { useStore } from '../store/useStore'
import { api, call } from '../lib/ipc'
import { branding } from '../branding'
import { Modal, Button, Input, Field } from './ui'
import { detectProtocol, httpsToSsh, sshToHttps } from '../lib/remoteUrl'
import type { RemoteProtocol, Remote, ConfigScope, GitProfile, UserConfigResult } from '@shared/types'

// Detect the OS for the credential helper disclaimer text.
const CRED_HELPER_NAME = (() => {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  if (ua.includes('Mac')) return 'osxkeychain'
  if (ua.includes('Win')) return 'manager'
  return 'store'
})()

const FETCH_OPTIONS = [0, 1, 3, 5, 10, 30]

/**
 * App settings: appearance, background-sync cadence and the git identity for
 * the current repository. Preferences persist locally; identity is written to
 * the repo's git config.
 */
export function SettingsModal({
  onClose,
  onOpenConnection
}: {
  onClose: () => void
  onOpenConnection: (
    host: string,
    protocol: RemoteProtocol,
    pendingRemoteChange?: { repoPath: string; remoteName: string; newUrl: string }
  ) => void
}): React.JSX.Element {
  const theme = useStore((s) => s.theme)
  const setTheme = useStore((s) => s.setTheme)
  const autoFetchMinutes = useStore((s) => s.autoFetchMinutes)
  const setAutoFetchMinutes = useStore((s) => s.setAutoFetchMinutes)
  const defaultDiffView = useStore((s) => s.defaultDiffView)
  const setDefaultDiffView = useStore((s) => s.setDefaultDiffView)
  const repo = useStore((s) => s.repo)
  const showToast = useStore((s) => s.showToast)
  const profiles = useStore((s) => s.profiles)
  const saveProfile = useStore((s) => s.saveProfile)
  const deleteProfile = useStore((s) => s.deleteProfile)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [savingIdentity, setSavingIdentity] = useState(false)
  const [remotes, setRemotes] = useState<Remote[]>([])
  const [scope, setScope] = useState<ConfigScope>('local')
  const [userConfig, setUserConfig] = useState<UserConfigResult | null>(null)
  const [selectedProfileId, setSelectedProfileId] = useState('')

  // Load the current repo's git identity and remotes when the panel opens.
  useEffect(() => {
    if (!repo) return
    let alive = true
    call(api.getUserConfig(repo.path))
      .then((cfg) => {
        if (!alive) return
        setUserConfig(cfg)
        setName(cfg.name)
        setEmail(cfg.email)
      })
      .catch(() => {})
    call(api.getRemotes(repo.path))
      .then((r) => {
        if (!alive) return
        setRemotes(r)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [repo])

  const selectProfile = (id: string): void => {
    setSelectedProfileId(id)
    if (!id) return
    const p = profiles.find((p) => p.id === id)
    if (p) {
      setName(p.name)
      setEmail(p.email)
    }
  }

  const switchRemote = async (remote: Remote): Promise<void> => {
    if (!repo) return
    const url = remote.fetch || remote.push
    if (!url) return
    const currentProtocol = detectProtocol(url)
    const targetProtocol: RemoteProtocol = currentProtocol === 'https' ? 'ssh' : 'https'
    const newUrl = targetProtocol === 'ssh' ? httpsToSsh(url) : sshToHttps(url)
    // Extract host for the wizard (include port for credential lookups)
    const host = targetProtocol === 'https'
      ? (newUrl.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/([^/]+)/)?.[1] ?? '')
      : (newUrl.match(/^[^@]+@([^:/]+):/)?.[1] ?? '')
    onOpenConnection(host, targetProtocol, {
      repoPath: repo.path,
      remoteName: remote.name,
      newUrl
    })
  }

  const saveIdentity = async (): Promise<void> => {
    if (!repo) return
    setSavingIdentity(true)
    try {
      await call(api.setUserConfig(repo.path, name.trim(), email.trim(), scope))
      showToast({ kind: 'success', message: `Git identity saved (${scope})` })
      // Refresh the current config
      const cfg = await call(api.getUserConfig(repo.path))
      setUserConfig(cfg)
    } catch {
      showToast({ kind: 'error', message: 'Could not save the git identity' })
    } finally {
      setSavingIdentity(false)
    }
  }

  const saveAsNewProfile = (): void => {
    const label = window.prompt('Profile label?', '')
    if (!label?.trim()) return
    const profile: GitProfile = {
      id: crypto.randomUUID(),
      label: label.trim(),
      name: name.trim(),
      email: email.trim()
    }
    saveProfile(profile)
    setSelectedProfileId(profile.id)
    showToast({ kind: 'success', message: `Profile "${profile.label}" saved` })
  }

  const editProfile = (p: GitProfile): void => {
    const newLabel = window.prompt('Profile label?', p.label)
    if (!newLabel?.trim()) return
    const newName = window.prompt('Name?', p.name)
    if (newName === null) return
    const newEmail = window.prompt('Email?', p.email)
    if (newEmail === null) return
    saveProfile({ id: p.id, label: newLabel.trim(), name: newName.trim(), email: newEmail.trim() })
    showToast({ kind: 'success', message: 'Profile updated' })
  }

  const removeProfile = (p: GitProfile): void => {
    if (!window.confirm(`Delete profile "${p.label}"? This does not affect any repo's current git config.`)) return
    deleteProfile(p.id)
    if (selectedProfileId === p.id) setSelectedProfileId('')
    showToast({ kind: 'success', message: 'Profile deleted' })
  }

  return (
    <Modal title="Settings" onClose={onClose} width={520}>
      {/* Appearance */}
      <Field label="Appearance">
        <div className="inline-flex rounded-md border border-app-border overflow-hidden text-[13px]">
          {(['dark', 'light'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`px-3 h-9 capitalize transition-colors ${
                theme === t
                  ? 'bg-app-accent text-app-accent-fg'
                  : 'text-app-muted hover:bg-app-hover hover:text-app-text'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </Field>

      {/* Auto-fetch */}
      <Field label="Auto-fetch from remote">
        <div className="flex flex-wrap gap-1.5">
          {FETCH_OPTIONS.map((m) => (
            <button
              key={m}
              onClick={() => setAutoFetchMinutes(m)}
              className={`px-2.5 h-8 rounded-md border text-[12px] transition-colors ${
                autoFetchMinutes === m
                  ? 'border-app-accent bg-app-accent/15 text-app-text'
                  : 'border-app-border text-app-muted hover:bg-app-hover hover:text-app-text'
              }`}
            >
              {m === 0 ? 'Off' : `${m} min`}
            </button>
          ))}
        </div>
        <span className="block text-[11px] text-app-muted mt-1">
          How often the app quietly fetches while in the background. It also fetches the moment
          the window comes back into view and when you switch repos.
        </span>
      </Field>

      {/* Default diff view */}
      <Field label="Default diff view">
        <div className="inline-flex rounded-md border border-app-border overflow-hidden text-[13px]">
          {(['split', 'inline'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setDefaultDiffView(m)}
              className={`px-3 h-9 capitalize transition-colors ${
                defaultDiffView === m
                  ? 'bg-app-accent text-app-accent-fg'
                  : 'text-app-muted hover:bg-app-hover hover:text-app-text'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <span className="block text-[11px] text-app-muted mt-1">
          How the diff editor opens. You can still switch views inside the editor at any time.
        </span>
      </Field>

      {/* Git identity */}
      <div className="mt-4 pt-4 border-t border-app-border">
        <span className="block text-[12px] font-medium text-app-text mb-2">
          Git identity {repo ? `— ${repo.name}` : ''}
        </span>
        {repo ? (
          <>
            {/* Current identity source */}
            {userConfig && (userConfig.name || userConfig.email) && (
              <p className="text-[11px] text-app-muted mb-2">
                Current: {`${userConfig.name || '(unset)'} <${userConfig.email || '(unset)'}>`} (source: {userConfig.nameScope})
              </p>
            )}

            {/* Profile dropdown */}
            {profiles.length > 0 && (
              <div className="mb-3">
                <span className="block text-[12px] text-app-muted mb-1">Identity profile</span>
                <select
                  value={selectedProfileId}
                  onChange={(e) => selectProfile(e.target.value)}
                  className="w-full h-9 px-2 rounded-md bg-app-bg border border-app-border text-app-text outline-none focus:border-app-accent"
                >
                  <option value="">(use global default)</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label} — {p.name}
                    </option>
                  ))}
                </select>
                {/* Profile list with edit/delete */}
                <ul className="mt-2 space-y-1">
                  {profiles.map((p) => (
                    <li key={p.id} className="flex items-center gap-2 text-[12px] text-app-muted">
                      <span className="flex-1 truncate">{`${p.label} — ${p.name} <${p.email}>`}</span>
                      <button
                        onClick={() => editProfile(p)}
                        className="text-app-muted hover:text-app-text p-0.5"
                        title="Edit profile"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={() => removeProfile(p)}
                        className="text-app-muted hover:text-app-danger p-0.5"
                        title="Delete profile"
                      >
                        <Trash2 size={12} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Field label="Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your Name" />
            </Field>
            <Field label="Email">
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </Field>

            {/* Scope radio */}
            <div className="mb-3">
              <span className="block text-[12px] text-app-muted mb-1">Scope</span>
              <label className="flex items-center gap-2 text-[13px] text-app-text cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  checked={scope === 'local'}
                  onChange={() => setScope('local')}
                />
                This repository only (local)
              </label>
              <label className="flex items-center gap-2 text-[13px] text-app-text cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  checked={scope === 'global'}
                  onChange={() => setScope('global')}
                />
                All repositories (global)
              </label>
              {scope === 'global' && (
                <p className="text-[11px] text-app-warning mt-1 ml-6 leading-relaxed">
                  This affects ALL repositories on this computer, including SourceTree and the terminal.
                  Repositories with a local override are unaffected.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button onClick={saveAsNewProfile}>
                <Plus size={14} /> Save as new profile
              </Button>
              <Button variant="primary" onClick={saveIdentity} disabled={savingIdentity}>
                Save identity
              </Button>
            </div>
          </>
        ) : (
          <p className="text-[12px] text-app-muted">Open a repository to edit its git identity.</p>
        )}
      </div>

      {/* Remotes */}
      {repo && remotes.length > 0 && (
        <div className="mt-4 pt-4 border-t border-app-border">
          <span className="block text-[12px] font-medium text-app-text mb-2">Remotes</span>
          <ul className="space-y-2">
            {remotes.map((r) => {
              const url = r.fetch || r.push
              if (!url) return null
              let protocol: RemoteProtocol
              try {
                protocol = detectProtocol(url)
              } catch {
                return null
              }
              return (
                <li key={r.name} className="flex items-center gap-2 p-2 rounded-md bg-app-panel-2 border border-app-border">
                  <span className="font-mono text-[12px] text-app-text font-medium">{r.name}</span>
                  <span className="text-[11px] text-app-muted truncate flex-1">{url}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] text-app-muted bg-app-panel uppercase">
                    {protocol}
                  </span>
                  <Button
                    onClick={() => switchRemote(r)}
                  >
                    Switch to {protocol === 'https' ? 'SSH' : 'HTTPS'}
                  </Button>
                </li>
              )
            })}
          </ul>
          <p className="text-[11px] text-app-muted mt-2 leading-relaxed">
            The credential helper is active automatically inside this app. To enable it in the
            terminal and other tools, run: <span className="font-mono">git config --global credential.helper {CRED_HELPER_NAME}</span>
          </p>
        </div>
      )}

      <p className="mt-4 pt-3 border-t border-app-border text-[11px] text-app-muted">
        {branding.name} v{branding.version}
      </p>
    </Modal>
  )
}
