import React, { useEffect, useState, useCallback } from 'react'
import {
  KeyRound, Globe, Check, X, Copy, Plus, RefreshCw, Trash2, ExternalLink,
  Link, GitBranch
} from 'lucide-react'
import { api, call } from '../lib/ipc'
import { useStore } from '../store/useStore'
import { Button, Input, IconButton, Spinner } from './ui'
import { ConfirmModal } from './PromptModal'
import { getProviderInfo } from '../lib/providers'
import { detectProtocol, httpsToSsh, sshToHttps } from '../lib/remoteUrl'
import type {
  RemoteProtocol,
  Remote,
  SshKey,
  SshAccessResult,
  HttpsCredentialStatus,
  HttpsAccessResult,
  GenerateSshKeyOptions
} from '@shared/types'

// Detect the OS to show the right credential helper name in the disclaimer.
// `process` is not available in the renderer, so use the navigator.
const CRED_HELPER_NAME = (() => {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  if (ua.includes('Mac')) return 'osxkeychain'
  if (ua.includes('Win')) return 'manager'
  return 'store'
})()

type Tab = 'connection' | 'ssh-keys' | 'remotes'

export function ConnectionManager({
  host,
  protocol,
  remoteUrl,
  repoPath,
  onConnected,
  onClose,
  onOpenConnection
}: {
  host: string
  protocol: RemoteProtocol
  remoteUrl?: string
  repoPath?: string
  onConnected: () => void
  onClose: () => void
  onOpenConnection?: (
    host: string,
    protocol: RemoteProtocol,
    pendingRemoteChange?: { repoPath: string; remoteName: string; newUrl: string }
  ) => void
}): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>('connection')

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'connection', label: 'Connection', icon: <Link size={14} /> },
    { id: 'ssh-keys', label: 'SSH Keys', icon: <KeyRound size={14} /> },
    { id: 'remotes', label: 'Remotes', icon: <GitBranch size={14} /> }
  ]

  return (
    <div className="fixed inset-0 z-40 bg-app-bg flex flex-col">
      <header className="drag-region flex items-center gap-2 h-12 px-4 border-b border-app-border shrink-0">
        {/* leave room for macOS traffic lights */}
        <div className="w-16 shrink-0" />
        {protocol === 'ssh' ? (
          <KeyRound size={18} className="text-app-accent" />
        ) : (
          <Globe size={18} className="text-app-accent" />
        )}
        <h1 className="font-semibold text-app-text">Connection Manager</h1>
        <span className="text-app-muted text-[12px]">— {host} ({protocol.toUpperCase()})</span>
        <div className="flex-1" />
        <IconButton title="Close" onClick={onClose}>
          <X size={18} />
        </IconButton>
      </header>

      {/* Tab bar */}
      <div className="flex items-center gap-1 px-4 h-10 border-b border-app-border shrink-0">
        {(repoPath ? tabs : tabs.filter((t) => t.id !== 'remotes')).map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-3 h-8 rounded-md text-[13px] font-medium transition-colors ${
              activeTab === t.id
                ? 'bg-app-panel-2 text-app-text border border-app-border'
                : 'text-app-muted hover:text-app-text hover:bg-app-hover'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-2xl mx-auto">
          {activeTab === 'connection' &&
            (protocol === 'ssh' ? (
              <SshPath host={host} onConnected={onConnected} />
            ) : (
              <HttpsPath host={host} remoteUrl={remoteUrl} onConnected={onConnected} />
            ))}
          {activeTab === 'ssh-keys' && <SshKeysTab />}
          {activeTab === 'remotes' && repoPath && onOpenConnection && (
            <RemotesTab repoPath={repoPath} onOpenConnection={onOpenConnection} />
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SSH path
// ---------------------------------------------------------------------------

function SshPath({ host, onConnected }: { host: string; onConnected: () => void }): React.JSX.Element {
  const showToast = useStore((s) => s.showToast)
  const [keys, setKeys] = useState<SshKey[]>([])
  const [access, setAccess] = useState<SshAccessResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [showGenerate, setShowGenerate] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const provider = getProviderInfo(host)

  const runTest = useCallback(async (): Promise<void> => {
    setTesting(true)
    try {
      const result = await call(api.testSshAccess(host))
      setAccess(result)
      if (result.hasWorkingKey) {
        showToast({ kind: 'success', message: `SSH access verified — key "${result.workingKey ?? 'unknown'}" works` })
      }
    } catch (e) {
      showToast({ kind: 'error', message: e instanceof Error ? e.message : String(e) })
    } finally {
      setTesting(false)
    }
  }, [host, showToast])

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const k = await call(api.listSshKeys())
      setKeys(k)
    } catch (e) {
      showToast({ kind: 'error', message: e instanceof Error ? e.message : String(e) })
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    reload()
    runTest()
  }, [reload, runTest])

  const copyKey = (k: SshKey): void => {
    navigator.clipboard.writeText(k.publicKey)
    setCopied(k.name)
    setTimeout(() => setCopied((c) => (c === k.name ? null : c)), 2000)
  }

  const ok = access?.hasWorkingKey === true
  const connError = access?.connectionError

  return (
    <div className="space-y-4">
      {/* status banner */}
      <div
        className={`flex items-center gap-2 p-3 rounded-lg border ${
          ok
            ? 'border-app-success/40 bg-app-success/10'
            : 'border-app-danger/40 bg-app-danger/10'
        }`}
      >
        {testing ? (
          <>
            <Spinner size={16} />
            <span className="text-[13px] text-app-text">Testing SSH access to {host}…</span>
          </>
        ) : ok ? (
          <>
            <Check size={16} className="text-app-success" />
            <span className="text-[13px] text-app-text">
              SSH access works — key "{access?.workingKey ?? 'unknown'}" is accepted by {host}.
            </span>
          </>
        ) : connError ? (
          <>
            <X size={16} className="text-app-danger" />
            <span className="text-[13px] text-app-text">
              Could not connect to {host} — the SSH server is unreachable. Check your network connection or VPN, then retry.
            </span>
          </>
        ) : (
          <>
            <X size={16} className="text-app-danger" />
            <span className="text-[13px] text-app-text">
              No SSH key works for {host}. Add one of your public keys to {provider.name}, or generate a new key.
            </span>
          </>
        )}
      </div>

      {/* SSH diagnostics — shown when the test fails */}
      {!ok && !testing && (
        <div className="text-[12px] text-app-muted bg-app-panel border border-app-border rounded-lg p-3 leading-relaxed space-y-2">
          <p className="font-medium text-app-text">How to isolate the problem:</p>
          <p>
            The app tests SSH with <span className="font-mono bg-app-bg px-1 rounded">BatchMode=yes</span>,
            which cannot prompt for passphrases. Run these commands in a terminal:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Test interactively (prompts for passphrase):{' '}
              <code className="font-mono bg-app-bg px-1 rounded">ssh -T git@{host}</code>
            </li>
            <li>
              List keys loaded in ssh-agent:{' '}
              <code className="font-mono bg-app-bg px-1 rounded">ssh-add -l</code>
            </li>
            <li>
              If your key is missing, load it:{' '}
              <code className="font-mono bg-app-bg px-1 rounded">{'ssh-add ~/.ssh/<keyname>'}</code>
            </li>
            <li>
              Make sure your public key is added to {provider.name}
              {provider.sshSettingsUrl ? (
                <>
                  {' — '}
                  <a
                    href={provider.sshSettingsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-app-accent hover:underline"
                  >
                    SSH settings page
                  </a>
                </>
              ) : null}
            </li>
          </ul>
        </div>
      )}

      {/* actions */}
      <div className="flex items-center gap-2">
        <Button variant="primary" onClick={() => runTest()} disabled={testing}>
          {testing ? <Spinner /> : <RefreshCw size={15} />} Re-test
        </Button>
        <Button onClick={() => setShowGenerate((v) => !v)}>
          <Plus size={15} /> Generate new key
        </Button>
        {ok && (
          <Button variant="primary" onClick={onConnected}>
            <Check size={15} /> Done
          </Button>
        )}
      </div>

      {/* generate form */}
      {showGenerate && (
        <GenerateKeyForm
          onClose={() => setShowGenerate(false)}
          onDone={() => {
            setShowGenerate(false)
            reload()
          }}
        />
      )}

      {/* key list */}
      {loading ? (
        <div className="flex items-center gap-2 text-app-muted py-8 justify-center">
          <Spinner /> Loading keys…
        </div>
      ) : keys.length === 0 ? (
        <div className="text-center text-app-muted py-12 text-[13px]">
          No SSH keys found in <span className="font-mono">~/.ssh</span>. Generate one with "Generate new key".
        </div>
      ) : (
        <ul className="space-y-2">
          {keys.map((k) => (
            <li key={k.name} className="p-3 rounded-lg bg-app-panel border border-app-border">
              <div className="flex items-center gap-2">
                <KeyRound size={15} className="text-app-accent shrink-0" />
                <span className="font-semibold text-app-text">{k.name}</span>
                <span className="px-1.5 py-0.5 rounded bg-app-panel-2 text-[10px] text-app-muted uppercase">
                  {k.type.replace('ssh-', '')}
                </span>
                <div className="flex-1" />
                <button
                  onClick={() => copyKey(k)}
                  className="flex items-center gap-1 text-[12px] text-app-muted hover:text-app-text"
                >
                  {copied === k.name ? (
                    <>
                      <Check size={13} className="text-app-success" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy size={13} /> Copy public
                    </>
                  )}
                </button>
                {provider.sshSettingsUrl && (
                  <a
                    href={provider.sshSettingsUrl}
                    onClick={(e) => {
                      e.preventDefault()
                      api.openExternal(provider.sshSettingsUrl!).catch(() => {})
                    }}
                    className="flex items-center gap-1 text-[12px] text-app-muted hover:text-app-text"
                  >
                    <ExternalLink size={13} /> Add to {provider.name}
                  </a>
                )}
              </div>
              {k.comment && <div className="text-[12px] text-app-muted mt-1">{k.comment}</div>}
              <div className="mt-2 text-[11px] font-mono text-app-text/70 bg-app-bg rounded p-2 break-all selectable max-h-20 overflow-auto">
                {k.publicKey}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// HTTPS path
// ---------------------------------------------------------------------------

function HttpsPath({ host, remoteUrl, onConnected }: { host: string; remoteUrl?: string; onConnected: () => void }): React.JSX.Element {
  const showToast = useStore((s) => s.showToast)
  const [status, setStatus] = useState<HttpsCredentialStatus | null>(null)
  const [access, setAccess] = useState<HttpsAccessResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [toRemove, setToRemove] = useState(false)

  const check = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const s = await call(api.checkHttpsCredentials(host))
      setStatus(s)
      if (!s.stored) setShowForm(true)
    } catch (e) {
      showToast({ kind: 'error', message: e instanceof Error ? e.message : String(e) })
    } finally {
      setLoading(false)
    }
  }, [host, showToast])

  useEffect(() => {
    check()
  }, [check])

  const testAccess = async (): Promise<void> => {
    setTesting(true)
    setAccess(null)
    try {
      // Use the actual remote URL (e.g. https://gitlab.com/owner/repo.git)
      // not just the bare host, so ls-remote can find the repository.
      const url = remoteUrl || `https://${host}`
      const result = await call(api.testHttpsAccess(url))
      setAccess(result)
      if (result.success) {
        showToast({ kind: 'success', message: 'HTTPS access verified' })
      }
    } catch (e) {
      showToast({ kind: 'error', message: e instanceof Error ? e.message : String(e) })
    } finally {
      setTesting(false)
    }
  }

  const saveCreds = async (): Promise<void> => {
    if (!username.trim() || !password) return
    setSaving(true)
    try {
      await call(api.storeHttpsCredentials(host, username.trim(), password))
      showToast({ kind: 'success', message: 'Credentials stored' })
      setPassword('')
      setShowForm(false)
      await check()
      await testAccess()
      useStore.getState().refreshConnectionStatus()
    } catch (e) {
      showToast({ kind: 'error', message: e instanceof Error ? e.message : String(e) })
    } finally {
      setSaving(false)
    }
  }

  const removeCreds = async (): Promise<void> => {
    try {
      await call(api.removeHttpsCredentials(host))
      showToast({ kind: 'success', message: 'Credentials removed' })
      setStatus(null)
      setAccess(null)
      setShowForm(true)
      await check()
      useStore.getState().refreshConnectionStatus()
    } catch (e) {
      showToast({ kind: 'error', message: e instanceof Error ? e.message : String(e) })
    }
  }

  const ok = access?.success === true

  return (
    <div className="space-y-4">
      {/* credential helper disclaimer */}
      <div className="text-[11px] text-app-muted bg-app-panel border border-app-border rounded-lg p-3 leading-relaxed">
        The credential helper is active automatically inside this app. To enable it in the terminal
        and other tools, run: <span className="font-mono">git config --global credential.helper {CRED_HELPER_NAME}</span>
      </div>

      {/* status banner */}
      {loading ? (
        <div className="flex items-center gap-2 text-app-muted py-4 justify-center">
          <Spinner /> Checking stored credentials…
        </div>
      ) : status?.stored ? (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-app-success/40 bg-app-success/10">
          <Check size={16} className="text-app-success" />
          <span className="text-[13px] text-app-text">
            Credentials found for {host} — username: <span className="font-mono">{status.username}</span>
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-app-danger/40 bg-app-danger/10">
          <X size={16} className="text-app-danger" />
          <span className="text-[13px] text-app-text">
            No credentials stored for {host}. Enter your username and password/token below.
          </span>
        </div>
      )}

      {/* access test result */}
      {access && !access.success && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-app-danger/40 bg-app-danger/10">
          <X size={16} className="text-app-danger" />
          <span className="text-[13px] text-app-text">
            Access test failed: {access.error ?? 'unknown error'}
          </span>
        </div>
      )}

      {/* actions when creds exist */}
      {status?.stored && !showForm && (
        <div className="flex items-center gap-2">
          <Button variant="primary" onClick={testAccess} disabled={testing}>
            {testing ? <Spinner /> : <RefreshCw size={15} />} Test
          </Button>
          <Button onClick={() => setShowForm(true)}>Update</Button>
          <Button variant="danger" onClick={() => setToRemove(true)}>
            <Trash2 size={15} /> Remove
          </Button>
          {ok && (
            <Button variant="primary" onClick={onConnected}>
              <Check size={15} /> Done
            </Button>
          )}
        </div>
      )}

      {/* credential form */}
      {showForm && (
        <div className="p-4 rounded-lg bg-app-panel border border-app-border">
          <h3 className="font-semibold text-app-text mb-3">
            {status?.stored ? 'Update credentials' : 'Enter credentials'}
          </h3>
          <div className="space-y-3">
            <label className="block">
              <span className="block text-[12px] text-app-muted mb-1">Username</span>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your-username"
                autoFocus
              />
            </label>
            <label className="block">
              <span className="block text-[12px] text-app-muted mb-1">Password / Token</span>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                onKeyDown={(e) => e.key === 'Enter' && saveCreds()}
              />
            </label>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <Button onClick={() => setShowForm(false)}>Cancel</Button>
            <Button variant="primary" onClick={saveCreds} disabled={!username.trim() || !password || saving}>
              {saving ? <Spinner /> : <Check size={15} />} Save
            </Button>
          </div>
        </div>
      )}

      {toRemove && (
        <ConfirmModal
          title="Remove credentials"
          message={`Remove stored HTTPS credentials for ${host}? This cannot be undone.`}
          danger
          confirmText="Remove"
          onConfirm={removeCreds}
          onClose={() => setToRemove(false)}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Generate key form (reuses the pattern from SshManager)
// ---------------------------------------------------------------------------

function GenerateKeyForm({
  onClose,
  onDone
}: {
  onClose: () => void
  onDone: () => void
}): React.JSX.Element {
  const showToast = useStore((s) => s.showToast)
  const [fileName, setFileName] = useState('id_ed25519')
  const [type, setType] = useState<'ed25519' | 'rsa'>('ed25519')
  const [comment, setComment] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [generating, setGenerating] = useState(false)

  const generate = async (): Promise<void> => {
    if (!fileName.trim()) return
    setGenerating(true)
    try {
      const opts: GenerateSshKeyOptions = {
        fileName: fileName.trim(),
        type,
        comment: comment.trim(),
        passphrase
      }
      await call(api.generateSshKey(opts))
      showToast({ kind: 'success', message: `Key "${fileName}" created` })
      onDone()
      onClose()
    } catch (e) {
      showToast({ kind: 'error', message: e instanceof Error ? e.message : String(e) })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="mb-4 p-4 rounded-lg bg-app-panel border border-app-border">
      <h3 className="font-semibold text-app-text mb-3">Generate new SSH key</h3>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-[12px] text-app-muted mb-1">File name</span>
          <Input
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="id_ed25519"
          />
        </label>
        <label className="block">
          <span className="block text-[12px] text-app-muted mb-1">Type</span>
          <select
            value={type}
            onChange={(e) => {
              const t = e.target.value as 'ed25519' | 'rsa'
              setType(t)
              setFileName((f) => (f === 'id_ed25519' || f === 'id_rsa' ? `id_${t}` : f))
            }}
            className="w-full h-9 px-2 rounded-md bg-app-bg border border-app-border text-app-text outline-none focus:border-app-accent"
          >
            <option value="ed25519">ED25519 (recommended)</option>
            <option value="rsa">RSA 4096</option>
          </select>
        </label>
        <label className="block">
          <span className="block text-[12px] text-app-muted mb-1">Comment (e.g. email)</span>
          <Input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="you@example.com"
          />
        </label>
        <label className="block">
          <span className="block text-[12px] text-app-muted mb-1">Passphrase (optional)</span>
          <Input
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="leave empty for none"
          />
        </label>
      </div>
      <div className="flex justify-end gap-2 mt-3">
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={generate} disabled={!fileName.trim() || generating}>
          {generating ? <Spinner /> : <KeyRound size={15} />} Generate
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SSH Keys tab — absorbs the standalone SshManager (list, generate, delete, copy)
// ---------------------------------------------------------------------------

function SshKeysTab(): React.JSX.Element {
  const showToast = useStore((s) => s.showToast)
  const [keys, setKeys] = useState<SshKey[]>([])
  const [loading, setLoading] = useState(true)
  const [showGenerate, setShowGenerate] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<SshKey | null>(null)

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      setKeys(await call(api.listSshKeys()))
    } catch (e) {
      showToast({ kind: 'error', message: e instanceof Error ? e.message : String(e) })
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    reload()
  }, [reload])

  const copyKey = (k: SshKey): void => {
    navigator.clipboard.writeText(k.publicKey)
    setCopied(k.name)
    setTimeout(() => setCopied((c) => (c === k.name ? null : c)), 2000)
  }

  return (
    <div className="space-y-4">
      <p className="text-[12px] text-app-muted">
        Keys are read from and created in <span className="font-mono">~/.ssh</span>. Copy the
        public key and add it to your Git hosting provider to authenticate over SSH.
      </p>

      <div className="flex items-center gap-2">
        <Button variant="primary" onClick={() => setShowGenerate((v) => !v)}>
          <Plus size={15} /> Generate new key
        </Button>
      </div>

      {showGenerate && (
        <GenerateKeyForm
          onClose={() => setShowGenerate(false)}
          onDone={() => {
            setShowGenerate(false)
            reload()
          }}
        />
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-app-muted py-8 justify-center">
          <Spinner /> Loading keys…
        </div>
      ) : keys.length === 0 ? (
        <div className="text-center text-app-muted py-12 text-[13px]">
          No SSH keys found in <span className="font-mono">~/.ssh</span>. Generate one with "Generate new key".
        </div>
      ) : (
        <ul className="space-y-2">
          {keys.map((k) => (
            <li key={k.name} className="p-3 rounded-lg bg-app-panel border border-app-border">
              <div className="flex items-center gap-2">
                <KeyRound size={15} className="text-app-accent shrink-0" />
                <span className="font-semibold text-app-text">{k.name}</span>
                <span className="px-1.5 py-0.5 rounded bg-app-panel-2 text-[10px] text-app-muted uppercase">
                  {k.type.replace('ssh-', '')}
                </span>
                <div className="flex-1" />
                <button
                  onClick={() => copyKey(k)}
                  className="flex items-center gap-1 text-[12px] text-app-muted hover:text-app-text"
                >
                  {copied === k.name ? (
                    <>
                      <Check size={13} className="text-app-success" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy size={13} /> Copy public
                    </>
                  )}
                </button>
                <button
                  onClick={() => setToDelete(k)}
                  title="Delete"
                  className="text-app-muted hover:text-app-danger p-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              {k.comment && <div className="text-[12px] text-app-muted mt-1">{k.comment}</div>}
              {k.fingerprint && (
                <div className="text-[11px] font-mono text-app-muted mt-1">{k.fingerprint}</div>
              )}
              <div className="mt-2 text-[11px] font-mono text-app-text/70 bg-app-bg rounded p-2 break-all selectable max-h-20 overflow-auto">
                {k.publicKey}
              </div>
            </li>
          ))}
        </ul>
      )}

      {toDelete && (
        <ConfirmModal
          title="Delete SSH key"
          message={`Delete the key "${toDelete.name}" (private and public) from ~/.ssh? This cannot be undone.`}
          danger
          confirmText="Delete"
          onConfirm={async () => {
            try {
              await call(api.deleteSshKey(toDelete.name))
              showToast({ kind: 'success', message: 'Key deleted' })
              reload()
            } catch (e) {
              showToast({ kind: 'error', message: e instanceof Error ? e.message : String(e) })
            }
          }}
          onClose={() => setToDelete(null)}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Remotes tab — lists remotes with HTTPS ↔ SSH switch (replaces Settings section)
// ---------------------------------------------------------------------------

function RemotesTab({
  repoPath,
  onOpenConnection
}: {
  repoPath: string
  onOpenConnection: (
    host: string,
    protocol: RemoteProtocol,
    pendingRemoteChange?: { repoPath: string; remoteName: string; newUrl: string }
  ) => void
}): React.JSX.Element {
  const [remotes, setRemotes] = useState<Remote[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    call(api.getRemotes(repoPath))
      .then((r) => {
        if (alive) setRemotes(r)
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [repoPath])

  const switchRemote = (remote: Remote): void => {
    const url = remote.fetch || remote.push
    if (!url) return
    const currentProtocol = detectProtocol(url)
    const targetProtocol: RemoteProtocol = currentProtocol === 'https' ? 'ssh' : 'https'
    const newUrl = targetProtocol === 'ssh' ? httpsToSsh(url) : sshToHttps(url)
    const host = targetProtocol === 'https'
      ? (newUrl.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/([^/]+)/)?.[1] ?? '')
      : (newUrl.match(/^[^@]+@([^:/]+):/)?.[1] ?? '')
    onOpenConnection(host, targetProtocol, {
      repoPath,
      remoteName: remote.name,
      newUrl
    })
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-app-muted py-8 justify-center">
        <Spinner /> Loading remotes…
      </div>
    )
  }

  if (remotes.length === 0) {
    return (
      <p className="text-[12px] text-app-muted py-8 text-center">No remotes configured for this repository.</p>
    )
  }

  return (
    <div className="space-y-4">
      {/* credential helper disclaimer */}
      <div className="text-[11px] text-app-muted bg-app-panel border border-app-border rounded-lg p-3 leading-relaxed">
        The credential helper is active automatically inside this app. To enable it in the terminal
        and other tools, run: <span className="font-mono">git config --global credential.helper {CRED_HELPER_NAME}</span>
      </div>

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
            <li key={r.name} className="flex items-center gap-2 p-3 rounded-lg bg-app-panel border border-app-border">
              <span className="font-mono text-[12px] text-app-text font-medium">{r.name}</span>
              <span className="text-[11px] text-app-muted truncate flex-1">{url}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] text-app-muted bg-app-panel-2 uppercase">
                {protocol}
              </span>
              <Button onClick={() => switchRemote(r)}>
                Switch to {protocol === 'https' ? 'SSH' : 'HTTPS'}
              </Button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
