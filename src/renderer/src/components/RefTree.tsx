import { useMemo, useState, useCallback } from 'react'
import { ChevronRight, ChevronDown, Tag as TagIcon } from 'lucide-react'
import { buildRefTree, folderContainsCurrent, type RefTreeNode } from '../lib/refTree'
import { loadExpandedFolders, saveExpandedFolders } from '../lib/prefs'
import { BranchRow } from './BranchRow'
import type { MenuItem } from './ui'
import type { Branch, Tag } from '@shared/types'

interface RefTreeProps {
  /** Source references: branches or tags. */
  refs: Array<Branch | Tag>
  /** Which leaf kind to create. */
  leafKind: 'leaf-branch' | 'leaf-tag'
  /** Repository path used as the persistence key for expand/collapse state. */
  repoPath: string
  /** Context menu opener passed down from Sidebar. */
  onMenu: (e: React.MouseEvent, items: MenuItem[]) => void
  /** Confirm modal trigger passed down from Sidebar. */
  setConfirm: (c: { title: string; message: string; onConfirm: () => void }) => void
  /** True when refs are remote branches, so BranchRow shows remote actions. */
  remote?: boolean
}

export function RefTree({ refs, leafKind, repoPath, onMenu, setConfirm, remote }: RefTreeProps): React.JSX.Element {
  const nodes = useMemo(() => buildRefTree(refs, { leafKind }), [refs, leafKind])
  const [expanded, setExpanded] = useState(() => loadExpandedFolders(repoPath))

  const toggle = useCallback(
    (path: string) => {
      const next = new Set(expanded)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      setExpanded(next)
      saveExpandedFolders(repoPath, next)
    },
    [expanded, repoPath]
  )

  return (
    <>
      {nodes.map((node) => (
        <TreeNode key={`${node.kind}:${node.path}`} node={node} expanded={expanded} onToggle={toggle} onMenu={onMenu} setConfirm={setConfirm} remote={remote} />
      ))}
    </>
  )
}

function TreeNode({
  node,
  expanded,
  onToggle,
  onMenu,
  setConfirm,
  remote
}: {
  node: RefTreeNode
  expanded: Set<string>
  onToggle: (path: string) => void
  onMenu: (e: React.MouseEvent, items: MenuItem[]) => void
  setConfirm: (c: { title: string; message: string; onConfirm: () => void }) => void
  remote?: boolean
}): React.JSX.Element {
  const indent = `${node.depth * 12}px`

  if (node.kind === 'leaf-branch' && node.ref) {
    return (
      <div style={{ paddingLeft: indent }}>
        <BranchRow
          branch={node.ref}
          remote={remote}
          display={node.label}
          onMenu={onMenu}
          setConfirm={setConfirm}
        />
      </div>
    )
  }

  if (node.kind === 'leaf-tag' && node.ref) {
    return (
      <div style={{ paddingLeft: indent }}>
        <div
          className="flex items-center gap-2 px-3 py-1 text-[12px] text-app-text hover:bg-app-hover cursor-default"
        >
          <TagIcon size={12} className="text-app-warning shrink-0" />
          <span className="truncate" title={node.ref.name}>
            {node.label}
          </span>
        </div>
      </div>
    )
  }

  const isExpanded = expanded.has(node.path)
  const containsCurrent = folderContainsCurrent(node)

  return (
    <div>
      <div style={{ paddingLeft: indent }}>
        <button
          type="button"
          onClick={() => onToggle(node.path)}
          className="group flex items-center gap-1 w-full px-3 py-1 text-left text-[12px] text-app-text hover:bg-app-hover cursor-default"
        >
          {isExpanded ? <ChevronDown size={13} className="shrink-0" /> : <ChevronRight size={13} className="shrink-0" />}
          <span className="truncate flex-1">{node.label}</span>
          {!isExpanded && containsCurrent && (
            <span
              className="w-2 h-2 rounded-full bg-app-accent shrink-0"
              title="Current branch is inside"
              aria-hidden="true"
            />
          )}
        </button>
      </div>
      {isExpanded && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={`${child.kind}:${child.path}`}
              node={child}
              expanded={expanded}
              onToggle={onToggle}
              onMenu={onMenu}
              setConfirm={setConfirm}
              remote={remote}
            />
          ))}
        </div>
      )}
    </div>
  )
}
