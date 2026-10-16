import React from 'react'
import { useStore } from '../store/useStore'
import { branding } from '../branding'
import { Modal, Field } from './ui'

const FETCH_OPTIONS = [0, 1, 3, 5, 10, 30]

/**
 * App settings: appearance, background-sync cadence and diff view preferences.
 * Git identity and connection management live in their own dedicated modals
 * (IdentityModal and ConnectionManager respectively).
 */
export function SettingsModal({ onClose }: { onClose: () => void }): React.JSX.Element {
  const theme = useStore((s) => s.theme)
  const setTheme = useStore((s) => s.setTheme)
  const autoFetchMinutes = useStore((s) => s.autoFetchMinutes)
  const setAutoFetchMinutes = useStore((s) => s.setAutoFetchMinutes)
  const defaultDiffView = useStore((s) => s.defaultDiffView)
  const setDefaultDiffView = useStore((s) => s.setDefaultDiffView)

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

      <p className="mt-4 pt-3 border-t border-app-border text-[11px] text-app-muted">
        {branding.name} v{branding.version}
      </p>
    </Modal>
  )
}
