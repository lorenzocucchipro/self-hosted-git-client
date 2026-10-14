import React, { useRef, useState, useLayoutEffect } from 'react'
import { CloudOff } from 'lucide-react'
import type { Commit, CommitRef } from '@shared/types'
import type { GraphRow } from '../lib/graph'
import { relativeTime } from '../lib/format'
import { useTruncatedTitle } from '../lib/useTruncatedTitle'
import { Avatar } from './Avatar'
import { RefLabels, BranchBadge, TagBadge, StashBadge, HeadBadge } from './RefBadges'
import { groupBranchRefs, type BranchGroup } from './commitMenus.tsx'
import { GraphCell } from './GraphCell'

const ROW_H = 34

interface CommitRowProps {
  row: GraphRow
  commit: Commit
  graphWidth: number
  gridTemplateColumns: string
  selected: boolean
  dimmed: boolean
  currentBranch: string | null
  detached: boolean
  onClick: () => void
  onMenu: (e: React.MouseEvent) => void
  onBranchMenu: (e: React.MouseEvent, group: BranchGroup) => void
  onTagMenu: (e: React.MouseEvent, ref: CommitRef) => void
}

function CommitRowComponent({
  row,
  commit,
  graphWidth,
  gridTemplateColumns,
  selected,
  dimmed,
  currentBranch,
  detached,
  onClick,
  onMenu,
  onBranchMenu,
  onTagMenu
}: CommitRowProps): React.JSX.Element {
  const isStash = commit.refs.some((r) => r.type === 'stash')

  return (
    <div
      onClick={onClick}
      onContextMenu={onMenu}
      style={{ gridTemplateColumns }}
      className={`grid items-center h-[34px] border-b border-app-border/50 cursor-pointer transition-opacity ${
        dimmed ? 'opacity-25' : ''
      } ${
        selected
          ? 'bg-app-accent/15'
          : isStash
            ? 'bg-app-warning/[0.07] hover:bg-app-hover'
            : 'hover:bg-app-hover'
      }`}
    >
      <GraphCell row={row} commit={commit} graphWidth={graphWidth} rowHeight={ROW_H} />

      <div className="min-w-0 relative flex items-center gap-1 py-1 pl-1 pr-2">
        <RefLabels
          title={commit.refs.map((r) => r.name).join(', ')}
          labels={[
            ...(detached && commit.refs.some((r) => r.type === 'HEAD')
              ? [<HeadBadge key="head" />]
              : []),
            ...groupBranchRefs(commit.refs).map((g) => (
              <BranchBadge
                key={`b:${g.base}`}
                group={g}
                laneColor={row.color}
                isCurrent={!!g.local && g.local === currentBranch}
                onMenu={onBranchMenu}
              />
            )),
            ...commit.refs
              .filter((r) => r.type === 'tag')
              .map((r, i) => <TagBadge key={`t:${i}`} refObj={r} onMenu={onTagMenu} />),
            ...(commit.refs.some((r) => r.type === 'stash') ? [<StashBadge key="stash" />] : [])
          ]}
        />
      </div>

      <div className="overflow-hidden self-stretch flex items-center gap-1.5 px-2 border-l border-app-border/40">
        {!commit.pushed && !commit.refs.some((r) => r.type === 'stash') && (
          <span
            title="Not pushed to any remote"
            className="flex items-center gap-1 px-1.5 h-[18px] rounded bg-app-warning/20 text-app-warning text-[10px] font-medium shrink-0"
          >
            <CloudOff size={11} /> unpushed
          </span>
        )}
        <OverflowTitle title={commit.subject} className="truncate text-app-text">
          {commit.subject}
        </OverflowTitle>
      </div>

      <div className="overflow-hidden flex items-center gap-1.5 pr-2">
        <Avatar
          name={commit.author}
          email={commit.authorEmail}
          size={20}
          fontSize={9}
          title={`${commit.author} <${commit.authorEmail}>`}
        />
        <OverflowTitle title={commit.author} className="truncate text-app-muted text-[12px]">
          {commit.author}
        </OverflowTitle>
      </div>
      <span className="text-right text-app-muted text-[12px] overflow-hidden pr-2 truncate">
        {relativeTime(commit.date)}
      </span>
      <span className="text-right font-mono text-app-muted text-[11px] overflow-hidden pr-3 truncate">
        {commit.shortHash}
      </span>
    </div>
  )
}

/** Native tooltip helper: sets `title` only when the element's content genuinely
 *  overflows (scrollWidth > clientWidth). Falls back to a provided `title` when the
 *  visible children are not a plain string. */
function OverflowTitle({
  children,
  title,
  className
}: {
  children: React.ReactNode
  title?: string
  className?: string
}): React.JSX.Element {
  const ref = useRef<HTMLSpanElement>(null)
  const [overflows, setOverflows] = useState(false)
  useLayoutEffect(() => {
    const el = ref.current
    setOverflows(!!el && el.scrollWidth > el.clientWidth)
  }, [children])
  return (
    <span ref={ref} className={className} title={overflows && title ? title : undefined}>
      {children}
    </span>
  )
}

export const CommitRow = React.memo(CommitRowComponent)
