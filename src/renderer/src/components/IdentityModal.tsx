import React, { useEffect, useState } from 'react'
import { Trash2, Edit2, Plus } from 'lucide-react'
import { useStore } from '../store/useStore'
import { api, call } from '../lib/ipc'
import { Modal, Button, Input, Field } from './ui'
import type { ConfigScope, GitProfile, UserConfigResult } from '@shared/types'

/**
 * Git identity modal — manage the name/email written to git config for the
 * current repository, with reusable identity profiles.
 */
export function IdentityModal({ onClose }: { onClose: () => void }): React.JSX.Element {
  const repo = useStore((s) => s.repo)
  const showToast = useStore((s) => s.showToast)
  const profiles = useStore((s) => s.profiles)
  const saveProfile = useStore((s) => s.saveProfile)
  const deleteProfile = useStore((s) => s.deleteProfile)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [scope, setScope] = useState<ConfigScope>('local')
  const [userConfig, setUserConfig] = useState<UserConfigResult | null>(null)
  const [selectedProfileId, setSelectedProfileId] = useState('')

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

  const saveIdentity = async (): Promise<void> => {
    if (!repo) return
    setSaving(true)
    try {
      await call(api.setUserConfig(repo.path, name.trim(), email.trim(), scope))
      showToast({ kind: 'success', message: `Git identity saved (${scope})` })
      const cfg = await call(api.getUserConfig(repo.path))
      setUserConfig(cfg)
    } catch {
      showToast({ kind: 'error', message: 'Could not save the git identity' })
    } finally {
      setSaving(false)
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
    <Modal title="Git Identity" onClose={onClose} width={520}>
      {repo ? (
        <>
          <p className="text-[12px] text-app-muted mb-3">
            Manage the git identity for <span className="font-medium text-app-text">{repo.name}</span>.
          </p>

          {/* Current identity source */}
          {userConfig && (userConfig.name || userConfig.email) && (
            <p className="text-[11px] text-app-muted mb-3">
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
            <Button variant="primary" onClick={saveIdentity} disabled={saving}>
              {saving ? 'Saving…' : 'Save identity'}
            </Button>
          </div>
        </>
      ) : (
        <p className="text-[12px] text-app-muted">Open a repository to edit its git identity.</p>
      )}
    </Modal>
  )
}
