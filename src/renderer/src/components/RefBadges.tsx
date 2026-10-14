import React, { useRef, useState, useLayoutEffect } from 'react'
import { GitBranch, Cloud, Tag, Archive } from 'lucide-react'
import { useStore } from '../store/useStore'
import type { CommitRef } from '@shared/types'
import { BranchGroup } from './commitMenus'

/** hex color (e.g. "#3b82f6") -> "rgba(r, g, b, a)" for lane-tinted labels. */
export function hexA(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** Black or white text, whichever reads better on the given solid color. */
export function contrastText(hex: string): string {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.6 ? '#000000' : '#ffffff'
}

/** Renders a commit's ref labels compactly: the first one plus a "+X" chip when
 *  there are more, revealing the full set on hover (in the foreground) so a busy
 *  commit never stretches the row. */
export function RefLabels({ labels, title }: { labels: React.ReactNode[]; title?: string }): React.JSX.Element | null {
  const ref = useRef<HTMLSpanElement>(null)
  const [overflows, setOverflows] = useState(false)
  useLayoutEffect(() => {
    const el = ref.current
    setOverflows(!!el && el.scrollWidth > el.clientWidth)
  }, [labels.length])
  if (labels.length === 0) return null
  if (labels.length === 1) return <>{labels[0]}</>
  return (
    <span ref={ref} className="relative inline-flex shrink-0 group/more" title={overflows && title ? title : undefined}>
      {labels[0]}
      <span className="px-1.5 h-[20px] inline-flex items-center rounded border border-app-border bg-app-panel-2 text-app-muted text-[11px] font-semibold cursor-default">
        +{labels.length - 1}
      </span>
      <span className="absolute left-0 top-0 z-40 hidden w-max max-w-[320px] group-hover/more:flex flex-wrap items-center gap-1 p-1.5 rounded-md border border-app-border bg-app-panel shadow-2xl">
        {labels}
      </span>
    </span>
  )
}

/** A branch label: local icon (⎇) and/or remote icon (☁) plus the name. The
 *  current branch takes HEAD's role — a solid accent chip. */
export function BranchBadge({
  group,
  laneColor,
  isCurrent,
  onMenu
}: {
  group: BranchGroup
  laneColor: string
  isCurrent: boolean
  onMenu: (e: React.MouseEvent, group: BranchGroup) => void
}): React.JSX.Element {
  const icons = (
    <>
      {group.local && <GitBranch size={11} className="shrink-0" />}
      {group.remotes.length > 0 && <Cloud size={11} className="shrink-0" />}
    </>
  )
  const activate = (): void => {
    void useStore.getState().checkoutBranch(group.local ?? group.remotes[0], !group.local)
  }
  const menuHandler = (e: React.MouseEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    onMenu(e, group)
  }
  if (isCurrent) {
    // HEAD's format (solid, bold chip) but in the branch's own graph color.
    return (
      <ExpandableBadge
        icon={icons}
        name={group.base}
        className="font-bold"
        style={{ color: contrastText(laneColor), backgroundColor: laneColor, borderColor: laneColor }}
        onActivate={activate}
        onContextMenu={menuHandler}
      />
    )
  }
  return (
    <ExpandableBadge
      icon={icons}
      name={group.base}
      style={{ color: laneColor, borderColor: hexA(laneColor, 0.5) }}
      collapsedBgStyle={{ backgroundColor: hexA(laneColor, 0.16) }}
      onActivate={activate}
      onContextMenu={menuHandler}
    />
  )
}

export function TagBadge({
  refObj,
  onMenu
}: {
  refObj: CommitRef
  onMenu: (e: React.MouseEvent, ref: CommitRef) => void
}): React.JSX.Element {
  return (
    <ExpandableBadge
      icon={<Tag size={11} className="shrink-0" />}
      name={refObj.name}
      className="text-app-warning border-app-warning/40"
      collapsedBg="bg-app-warning/20"
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onMenu(e, refObj)
      }}
    />
  )
}

export function StashBadge(): React.JSX.Element {
  return (
    <span className="px-2 h-[20px] inline-flex items-center gap-1 rounded text-[11px] font-bold shrink-0 bg-app-warning text-app-bg uppercase tracking-wide">
      <Archive size={12} className="shrink-0" /> Stash
    </span>
  )
}

/** "You are here" marker shown only in detached HEAD (no current branch). */
export function HeadBadge(): React.JSX.Element {
  return (
    <span
      title="Detached HEAD — not on a branch"
      className="px-2 h-[20px] inline-flex items-center rounded text-[11px] font-bold shrink-0 bg-app-accent text-app-accent-fg uppercase tracking-wide"
    >
      HEAD
    </span>
  )
}

/**
 * A ref badge that truncates to fit its column but, on hover, reveals the full
 * name via an absolutely-positioned overlay — so it never shifts the layout and
 * replaces the native tooltip. Used for the variable-length refs (branches/tags);
 * HEAD/stash are short fixed labels and don't need it.
 */
export function ExpandableBadge({
  icon,
  name,
  className = '',
  style,
  collapsedBg = '',
  collapsedBgStyle,
  onActivate,
  onContextMenu
}: {
  icon: React.ReactNode
  name: string
  /** border + text color classes shared by both states (no background) */
  className?: string
  /** border/text color (and, for the current branch, solid bg) as inline style */
  style?: React.CSSProperties
  /** collapsed-state background class */
  collapsedBg?: string
  /** collapsed-state background as inline style */
  collapsedBgStyle?: React.CSSProperties
  /** double-click action (e.g. checkout the branch) */
  onActivate?: () => void
  /** right-click handler (opens a ref-specific menu) */
  onContextMenu?: (e: React.MouseEvent) => void
}): React.JSX.Element {
  const chip =
    'px-2 h-[20px] inline-flex items-center gap-1 rounded border text-[11px] font-semibold'
  return (
    <span
      className={`relative inline-flex shrink-0 group/ref ${onActivate ? 'cursor-pointer' : ''}`}
      onDoubleClick={
        onActivate
          ? (e) => {
              e.stopPropagation()
              onActivate()
            }
          : undefined
      }
      onContextMenu={onContextMenu}
    >
      {/* collapsed, in-flow — reserves the footprint */}
      <span className={`${chip} ${className} ${collapsedBg} max-w-[150px]`} style={{ ...style, ...collapsedBgStyle }}>
        {icon}
        <span className="truncate min-w-0">{name}</span>
      </span>
      {/* expanded overlay on hover — absolute, solid background, no layout impact */}
      <span
        className={`${chip} ${className} bg-app-panel-2 absolute left-0 top-0 z-30 hidden w-max max-w-none whitespace-nowrap shadow-lg group-hover/ref:inline-flex`}
        style={style}
        aria-hidden="true"
      >
        {icon}
        {name}
      </span>
    </span>
  )
}
