import { GitBranch, Check } from 'lucide-react'
import { useStore } from '../store/useStore'
import type { MenuItem } from './ui'
import type { Branch } from '@shared/types'

export function BranchRow({
  branch,
  remote,
  display,
  onMenu,
  setConfirm
}: {
  branch: Branch
  remote?: boolean
  display: string
  onMenu: (e: React.MouseEvent, items: MenuItem[]) => void
  setConfirm: (c: { title: string; message: string; onConfirm: () => void }) => void
}): React.JSX.Element {
  const store = useStore.getState

  const items: MenuItem[] = remote
    ? [
        { label: 'Checkout (create local branch)', onClick: () => store().checkoutBranch(branch.name, true) },
        { label: 'Merge into current branch', onClick: () => store().mergeBranch(branch.name) },
        { label: '', separator: true, onClick: () => {} },
        {
          label: 'Delete remote branch',
          danger: true,
          onClick: () =>
            setConfirm({
              title: 'Delete remote branch',
              message: `Delete "${branch.name}" from the remote? This runs git push --delete.`,
              onConfirm: () => store().deleteRemoteBranch(branch.name)
            })
        }
      ]
    : [
        { label: 'Checkout', onClick: () => store().checkoutBranch(branch.name, false), disabled: branch.current },
        { label: 'Merge into current branch', onClick: () => store().mergeBranch(branch.name), disabled: branch.current },
        { label: '', separator: true, onClick: () => {} },
        {
          label: 'Delete branch',
          danger: true,
          disabled: branch.current,
          onClick: () =>
            setConfirm({
              title: 'Delete branch',
              message: `Delete the branch "${branch.name}"? It is removed even if not fully merged (e.g. after a squash merge); recoverable from git's reflog.`,
              onConfirm: () => store().deleteBranch(branch.name, true)
            })
        }
      ]

  return (
    <div
      onDoubleClick={() => store().checkoutBranch(branch.name, !!remote)}
      onContextMenu={(e) => onMenu(e, items)}
      className="group flex items-center gap-2 px-3 py-1 text-[12px] cursor-default hover:bg-app-hover"
      title={remote ? branch.name : undefined}
    >
      {branch.current ? (
        <Check size={12} className="text-app-success shrink-0" />
      ) : (
        <GitBranch size={12} className={`shrink-0 ${remote ? 'text-app-muted' : 'text-app-accent'}`} />
      )}
      <span className={`truncate flex-1 ${branch.current ? 'text-app-text font-semibold' : 'text-app-text'}`}>
        {display}
      </span>
      {(branch.ahead > 0 || branch.behind > 0) && (
        <span className="text-[10px] text-app-muted shrink-0">
          {branch.ahead > 0 && `↑${branch.ahead}`} {branch.behind > 0 && `↓${branch.behind}`}
        </span>
      )}
    </div>
  )
}
