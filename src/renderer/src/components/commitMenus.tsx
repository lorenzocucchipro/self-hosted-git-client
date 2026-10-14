import React from 'react'
import { useStore } from '../store/useStore'
import { RebaseModal } from './RebaseModal'
import { ConfirmModal, PromptModal } from './PromptModal'
import type { MenuItem } from './ui'
import type { Commit, CommitRef, Stash } from '@shared/types'

/** A branch that may exist locally, on a remote, or both — one label per name. */
export interface BranchGroup {
  base: string
  local?: string
  remotes: string[]
}

/** Group a commit's branch refs (head + remote) by base name so the local and
 *  remote variants of the same branch collapse into a single label. */
export function groupBranchRefs(refs: CommitRef[]): BranchGroup[] {
  const map = new Map<string, BranchGroup>()
  const order: string[] = []
  const get = (base: string): BranchGroup => {
    let g = map.get(base)
    if (!g) {
      g = { base, remotes: [] }
      map.set(base, g)
      order.push(base)
    }
    return g
  }
  for (const r of refs) {
    if (r.type === 'head') get(r.name).local = r.name
    else if (r.type === 'remote') get(r.name.slice(r.name.indexOf('/') + 1)).remotes.push(r.name)
  }
  return order.map((b) => map.get(b)!)
}

/** Context menu for a tag label — actions target the tag, not the commit. */
export function buildTagMenu(ref: CommitRef, setModal: (n: React.ReactNode) => void): MenuItem[] {
  const store = useStore.getState
  const close = (): void => setModal(null)
  return [
    { label: 'Checkout (detached)', onClick: () => store().checkoutBranch(ref.name, false) },
    { label: 'Copy tag name', onClick: () => navigator.clipboard.writeText(ref.name) },
    { label: '', separator: true, onClick: () => {} },
    {
      label: 'Delete tag',
      danger: true,
      onClick: () =>
        setModal(
          <ConfirmModal
            title="Delete tag"
            message={`Delete the tag "${ref.name}"?`}
            danger
            confirmText="Delete"
            onConfirm={() => store().deleteTag(ref.name)}
            onClose={close}
          />
        )
    }
  ]
}

/** Context menu for a consolidated branch label (local and/or remote). */
export function buildBranchMenu(
  group: BranchGroup,
  currentBranch: string | null,
  setModal: (n: React.ReactNode) => void
): MenuItem[] {
  const store = useStore.getState
  const close = (): void => setModal(null)
  const local = group.local
  const isCurrent = !!local && local === currentBranch
  const primary = local ?? group.remotes[0]
  const items: MenuItem[] = [
    {
      label: local ? 'Checkout' : 'Checkout (create local branch)',
      disabled: isCurrent,
      onClick: () => store().checkoutBranch(primary, !local)
    },
    {
      label: 'Merge into current branch',
      disabled: isCurrent,
      onClick: () => store().mergeBranch(primary)
    },
    {
      label: 'Interactive rebase…',
      // Rebase operates on HEAD, so only for the branch we're actually on.
      disabled: !isCurrent,
      onClick: () => setModal(<RebaseModal onClose={close} />)
    },
    { label: '', separator: true, onClick: () => {} },
    { label: 'Open in browser', onClick: () => store().openOnRemote('branch', group.base) },
    { label: 'Copy name', onClick: () => navigator.clipboard.writeText(group.base) }
  ]
  if (local) {
    items.push({ label: '', separator: true, onClick: () => {} })
    items.push({
      label: 'Rename branch…',
      onClick: () =>
        setModal(
          <PromptModal
            title="Rename branch"
            label={`New name for "${local}"`}
            initialValue={local}
            confirmText="Rename"
            note={
              <>
                Renames the branch <span className="text-app-text">locally only</span>. If it&apos;s
                already on the remote, finish the rename by hand:
                <br />
                1. <span className="text-app-text">Push</span> the renamed branch (sets the new
                upstream).
                <br />
                2. Delete the old branch on the remote (right-click it →{' '}
                <span className="text-app-text">Delete remote branch</span>).
              </>
            }
            onConfirm={(name) => {
              const next = name.trim()
              if (next && next !== local) store().renameBranch(local, next)
            }}
            onClose={close}
          />
        )
    })
    items.push({
      label: 'Delete branch',
      danger: true,
      disabled: isCurrent,
      onClick: () =>
        setModal(
          <ConfirmModal
            title="Delete branch"
            message={`Delete the branch "${local}"?\nIt is removed even if not fully merged (e.g. after a squash merge); recoverable from git's reflog.`}
            danger
            confirmText="Delete"
            onConfirm={() => store().deleteBranch(local, true)}
            onClose={close}
          />
        )
    })
  }
  if (group.remotes.length > 0) {
    items.push({ label: '', separator: true, onClick: () => {} })
    for (const rn of group.remotes) {
      items.push({
        label: group.remotes.length > 1 ? `Delete ${rn}` : 'Delete remote branch',
        danger: true,
        onClick: () =>
          setModal(
            <ConfirmModal
              title="Delete remote branch"
              message={`Delete "${rn}" from the remote?\nThis runs git push --delete.`}
              danger
              confirmText="Delete"
              onConfirm={() => store().deleteRemoteBranch(rn)}
              onClose={close}
            />
          )
      })
    }
  }
  return items
}

export function buildStashMenu(stash: Stash, setModal: (n: React.ReactNode) => void): MenuItem[] {
  const store = useStore.getState
  const close = (): void => setModal(null)
  return [
    { label: 'Apply (keep stash)', onClick: () => store().stashApply(stash.index) },
    { label: 'Apply and drop (pop)', onClick: () => store().stashPop(stash.index) },
    { label: '', separator: true, onClick: () => {} },
    {
      label: 'Edit message…',
      onClick: () =>
        setModal(
          <PromptModal
            title="Edit stash message"
            label="New message for this stash"
            initialValue={stash.message}
            confirmText="Save"
            onConfirm={(msg) => store().stashRename(stash.index, msg)}
            onClose={close}
          />
        )
    },
    { label: '', separator: true, onClick: () => {} },
    {
      label: 'Drop stash',
      danger: true,
      onClick: () =>
        setModal(
          <ConfirmModal
            title="Drop stash"
            message={`Drop stash@{${stash.index}}?`}
            danger
            confirmText="Drop"
            onConfirm={() => store().stashDrop(stash.index)}
            onClose={close}
          />
        )
    }
  ]
}

export function buildMenu(commit: Commit, setModal: (n: React.ReactNode) => void): MenuItem[] {
  const store = useStore.getState
  const close = (): void => setModal(null)
  return [
    {
      label: 'Checkout this commit',
      onClick: () =>
        setModal(
          <ConfirmModal
            title="Checkout commit"
            message={`Switch to a 'detached HEAD' state on commit ${commit.shortHash}?`}
            confirmText="Checkout"
            onConfirm={() => store().checkoutCommit(commit.hash)}
            onClose={close}
          />
        )
    },
    {
      label: 'Create branch here',
      onClick: () => setModal(<BranchFromCommit hash={commit.hash} onClose={close} />)
    },
    {
      label: 'Create tag here',
      onClick: () =>
        setModal(
          <PromptModal
            title="New tag"
            label={`Tag on commit ${commit.shortHash}`}
            placeholder="v1.0.0"
            confirmText="Create tag"
            onConfirm={(name) => store().createTag(name, commit.hash)}
            onClose={close}
          />
        )
    },
    { label: '', separator: true, onClick: () => {} },
    {
      label: 'Reset current branch here (soft)',
      onClick: () => store().resetTo(commit.hash, 'soft')
    },
    {
      label: 'Reset current branch here (mixed)',
      onClick: () => store().resetTo(commit.hash, 'mixed')
    },
    {
      label: 'Reset current branch here (hard)',
      danger: true,
      onClick: () =>
        setModal(
          <ConfirmModal
            title="Reset --hard"
            message={`WARNING: all local changes will be lost.\nHard reset to ${commit.shortHash}?`}
            danger
            confirmText="Hard reset"
            onConfirm={() => store().resetTo(commit.hash, 'hard')}
            onClose={close}
          />
        )
    },
    { label: '', separator: true, onClick: () => {} },
    { label: 'Revert (create inverse commit)', onClick: () => store().revertCommit(commit.hash) },
    { label: 'Cherry-pick onto current branch', onClick: () => store().cherryPick(commit.hash) },
    { label: '', separator: true, onClick: () => {} },
    {
      label: 'Interactive rebase (base = this commit)…',
      onClick: () =>
        setModal(
          <RebaseModal onto={commit.hash} ontoShort={commit.shortHash} onClose={close} />
        )
    },
    { label: '', separator: true, onClick: () => {} },
    { label: 'Open in browser', onClick: () => store().openOnRemote('commit', commit.hash) },
    {
      label: 'Copy full SHA',
      onClick: () => navigator.clipboard.writeText(commit.hash)
    },
    { label: '', separator: true, onClick: () => {} },
    {
      label: 'Reset column widths to defaults',
      onClick: () => store().resetColumnWidths()
    }
  ]
}

export function BranchFromCommit({ hash, onClose }: { hash: string; onClose: () => void }): React.JSX.Element {
  // Checkout the commit (detached), then create a branch pointing there.
  return (
    <PromptModal
      title="Create branch from commit"
      label="Name of the new branch"
      placeholder="feature/from-commit"
      confirmText="Create"
      onConfirm={async (name) => {
        const store = useStore.getState()
        await store.checkoutCommit(hash)
        await store.createBranch(name, true)
      }}
      onClose={onClose}
    />
  )
}
