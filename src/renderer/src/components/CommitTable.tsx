import React, { useRef, useState, useMemo, useCallback, useLayoutEffect, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { FileEdit } from 'lucide-react'
import type { ColumnWidths } from '@shared/types'
import type { Commit, CommitRef, RepoStatus, Stash } from '@shared/types'
import type { GraphLayout, GraphRow } from '../lib/graph'
import { dayKey, dayLabel } from '../lib/format'
import { buildGridLayout, MIN_COLUMN_WIDTHS } from '../lib/columnLayout'
import { useTruncatedTitle } from '../lib/useTruncatedTitle'
import { ColumnDivider } from './ColumnDivider'
import { CommitRow } from './CommitRow'
import { useStore, type Selection } from '../store/useStore'
import { ContextMenu, useContextMenu } from './ui'
import {
  buildMenu,
  buildBranchMenu,
  buildStashMenu,
  buildTagMenu,
  type BranchGroup
} from './commitMenus.tsx'

const ROW_H = 34
const DAY_H = 26
const PAD = 10
const LANE_W = 16

interface CommitTableProps {
  commits: Commit[]
  layout: GraphLayout
  columnWidths: ColumnWidths
  graphWidth: number
  selection: Selection
  searchMatches: Set<string> | null
  status: RepoStatus | null
  stashes: Stash[]
  currentBranch: string | null
  detached: boolean
  onSelectCommit: (hash: string) => void
  onSelectWip: () => void
  onResizeColumn: (col: keyof ColumnWidths, width: number) => void
  onResetColumns: () => void
}

export function CommitTable({
  commits,
  layout,
  columnWidths,
  graphWidth,
  selection,
  searchMatches,
  status,
  stashes,
  currentBranch,
  detached,
  onSelectCommit,
  onSelectWip,
  onResizeColumn,
  onResetColumns
}: CommitTableProps): React.JSX.Element {
  const setFocusZone = useStore((s) => s.setFocusZone)
  const cm = useContextMenu()
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const descriptionHeaderRef = useRef<HTMLDivElement | null>(null)
  const [descriptionMeasuredWidth, setDescriptionMeasuredWidth] = useState<number | null>(null)

  useLayoutEffect(() => {
    const el = descriptionHeaderRef.current
    if (!el) return
    const measure = (): void => {
      const w = el.getBoundingClientRect().width
      setDescriptionMeasuredWidth((prev) => (prev !== w ? w : prev))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const { gridTemplateColumns, tableMinWidth } = useMemo(
    () => buildGridLayout(columnWidths, graphWidth),
    [columnWidths, graphWidth]
  )

  const byHash = useMemo(() => {
    const m = new Map<string, Commit>()
    commits.forEach((c) => m.set(c.hash, c))
    return m
  }, [commits])

  const dirty = status && !status.isClean
  const changeCount = status ? status.staged.length + status.unstaged.length : 0

  const items = useMemo(() => {
    const list: Array<{ type: 'wip' } | { type: 'day'; row: GraphRow; label: string } | { type: 'row'; row: GraphRow }> = []
    if (dirty) list.push({ type: 'wip' })
    layout.rows.forEach((row, idx) => {
      const commit = byHash.get(row.hash)!
      const prev = idx > 0 ? byHash.get(layout.rows[idx - 1].hash) : undefined
      const newDay = !prev || dayKey(prev.date) !== dayKey(commit.date)
      if (newDay) {
        list.push({ type: 'day', row, label: dayLabel(commit.date) })
      }
      list.push({ type: 'row', row })
    })
    return list
  }, [dirty, layout.rows, byHash])

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_H,
    getItemKey: (index) => {
      const item = items[index]
      if (item.type === 'wip') return 'wip'
      if (item.type === 'day') return `day-${item.label}-${item.row.hash}`
      return item.row.hash
    },
    overscan: 10,
    measureElement: (el) => el.getBoundingClientRect().height
  })

  useEffect(() => {
    let index = -1
    if (selection?.type === 'wip') {
      index = items.findIndex((i) => i.type === 'wip')
    } else if (selection?.type === 'commit') {
      index = items.findIndex((i) => i.type === 'row' && i.row.hash === selection.hash)
    }
    if (index >= 0) {
      virtualizer.scrollToIndex(index, { align: 'start' })
    }
  }, [selection, items, virtualizer])

  const descriptionCurrentWidth = columnWidths.description ?? descriptionMeasuredWidth ?? MIN_COLUMN_WIDTHS.description
  const handleDescriptionResize = useCallback(
    (width: number) => {
      onResizeColumn('description', width)
    },
    [onResizeColumn]
  )

  const handleMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      cm.open(e, [
        {
          label: 'Reset column widths to defaults',
          onClick: onResetColumns
        }
      ])
    },
    [cm, onResetColumns]
  )

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-auto bg-app-bg"
      onContextMenu={(e) => {
        if (e.currentTarget !== e.target) return
        e.preventDefault()
        cm.open(e, [
          {
            label: 'Reset column widths to defaults',
            onClick: onResetColumns
          }
        ])
      }}
    >
      {/* Header */}
      <div
        style={{ minWidth: tableMinWidth, gridTemplateColumns }}
        className="sticky top-0 z-10 grid items-center h-7 bg-app-panel border-b border-app-border text-[11px] uppercase tracking-wide text-app-muted select-none"
        onContextMenu={handleMenu}
      >
        <span className="px-2">Graph</span>
        <ResizableColumnHeader label="Refs" width={columnWidths.refs} minWidth={MIN_COLUMN_WIDTHS.refs} onResize={(w) => onResizeColumn('refs', w)} />
        <ResizableColumnHeader
          label="Description"
          ref={descriptionHeaderRef}
          width={columnWidths.description ?? descriptionMeasuredWidth}
          minWidth={MIN_COLUMN_WIDTHS.description}
          onResize={handleDescriptionResize}
        />
        <ResizableColumnHeader label="Author" width={columnWidths.author} minWidth={MIN_COLUMN_WIDTHS.author} onResize={(w) => onResizeColumn('author', w)} />
        <ResizableColumnHeader label="Date" align="right" width={columnWidths.date} minWidth={MIN_COLUMN_WIDTHS.date} onResize={(w) => onResizeColumn('date', w)} />
        <ResizableColumnHeader label="SHA" align="right" width={columnWidths.sha} minWidth={MIN_COLUMN_WIDTHS.sha} onResize={(w) => onResizeColumn('sha', w)} />
      </div>

      <div style={{ minWidth: tableMinWidth, height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const item = items[virtualItem.index]
          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`
              }}
            >
              {item.type === 'wip' && (
                <button
                  onClick={() => {
                    setFocusZone('commits')
                    onSelectWip()
                  }}
                  className={`grid items-center h-9 px-3 border-b border-app-border text-left ${
                    selection?.type === 'wip' ? 'bg-app-accent/15' : 'hover:bg-app-hover'
                  }`}
                  style={{ gridTemplateColumns }}
                >
                  <span className="flex items-center">
                    <span
                      className="flex items-center justify-center rounded-full border-2 border-dashed"
                      style={{ width: 16, height: 16, borderColor: 'rgb(var(--app-accent))', marginLeft: PAD }}
                    >
                      <FileEdit size={9} className="text-app-accent" />
                    </span>
                  </span>
                  <span className="col-span-5 truncate text-app-text font-medium text-left">
                    Uncommitted changes
                    <span className="ml-2 text-[11px] text-app-muted">{changeCount} files</span>
                  </span>
                </button>
              )}
              {item.type === 'day' && (
                <DayHeader graphWidth={graphWidth} lanes={topLanes(item.row)} label={item.label} />
              )}
              {item.type === 'row' && (
                <VirtualCommitRow
                  row={item.row}
                  byHash={byHash}
                  stashes={stashes}
                  graphWidth={graphWidth}
                  gridTemplateColumns={gridTemplateColumns}
                  selection={selection}
                  searchMatches={searchMatches}
                  currentBranch={currentBranch}
                  detached={detached}
                  onSelectCommit={onSelectCommit}
                  cm={cm}
                />
              )}
            </div>
          )
        })}
        {commits.length === 0 && !dirty && (
          <div className="p-8 text-center text-app-muted text-[13px]">
            No commits yet. Make your first commit from “Working changes”.
          </div>
        )}
      </div>

      {cm.menu && <ContextMenu {...cm.menu} onClose={cm.close} />}
    </div>
  )
}

interface VirtualCommitRowProps {
  row: GraphRow
  byHash: Map<string, Commit>
  stashes: Stash[]
  graphWidth: number
  gridTemplateColumns: string
  selection: Selection
  searchMatches: Set<string> | null
  currentBranch: string | null
  detached: boolean
  onSelectCommit: (hash: string) => void
  cm: ReturnType<typeof useContextMenu>
}

const VirtualCommitRow = React.memo(function VirtualCommitRow({
  row,
  byHash,
  stashes,
  graphWidth,
  gridTemplateColumns,
  selection,
  searchMatches,
  currentBranch,
  detached,
  onSelectCommit,
  cm
}: VirtualCommitRowProps): React.JSX.Element {
  const setFocusZone = useStore((s) => s.setFocusZone)
  const commit = byHash.get(row.hash)!
  const selected = selection?.type === 'commit' && selection.hash === row.hash
  const stash = stashes.find((s) => s.hash === row.hash)

  const onClick = useCallback(() => {
    setFocusZone('commits')
    onSelectCommit(row.hash)
  }, [setFocusZone, onSelectCommit, row.hash])

  const onMenu = useCallback(
    (e: React.MouseEvent) => {
      cm.open(e, stash ? buildStashMenu(stash, () => {}) : buildMenu(commit, () => {}))
    },
    [cm, stash, commit]
  )

  const onBranchMenu = useCallback(
    (e: React.MouseEvent, group: BranchGroup) => {
      cm.open(e, buildBranchMenu(group, currentBranch ?? null, () => {}))
    },
    [cm, currentBranch]
  )

  const onTagMenu = useCallback(
    (e: React.MouseEvent, ref: CommitRef) => {
      cm.open(e, buildTagMenu(ref, () => {}))
    },
    [cm]
  )

  return (
    <CommitRow
      row={row}
      commit={commit}
      graphWidth={graphWidth}
      gridTemplateColumns={gridTemplateColumns}
      selected={!!selected}
      dimmed={!!searchMatches && !searchMatches.has(row.hash)}
      currentBranch={currentBranch}
      detached={detached}
      onClick={onClick}
      onMenu={onMenu}
      onBranchMenu={onBranchMenu}
      onTagMenu={onTagMenu}
    />
  )
})

interface ResizableColumnHeaderProps {
  label: string
  align?: 'left' | 'right'
  width: number | null
  minWidth: number
  onResize: (width: number) => void
  ref?: React.Ref<HTMLDivElement>
}

function ResizableColumnHeader({
  label,
  align = 'left',
  width,
  minWidth,
  onResize,
  ref
}: ResizableColumnHeaderProps): React.JSX.Element {
  const title = useTruncatedTitle(label)
  const alignClass = align === 'right' ? 'text-right' : 'text-left'
  return (
    <div ref={ref} className={`relative overflow-hidden px-2 ${alignClass}`}>
      <span ref={title.ref} onMouseEnter={title.onMouseEnter}>
        {label}
      </span>
      <ColumnDivider
        column={label.toLowerCase() as keyof ColumnWidths}
        currentWidth={width ?? minWidth}
        minWidth={minWidth}
        onResize={onResize}
      />
    </div>
  )
}

/** Lanes crossing the top edge of a row — used to keep graph lines flowing
 *  through a day-group header without a visual gap. */
function topLanes(row: GraphRow): { col: number; color: string; current?: boolean }[] {
  const lanes: { col: number; color: string; current?: boolean }[] = []
  row.incoming.forEach((e) => lanes.push({ col: e.fromCol, color: e.color, current: e.current }))
  row.passing.forEach((p) => lanes.push({ col: p.col, color: p.color, current: p.current }))
  return lanes
}

function DayHeader({
  graphWidth,
  lanes,
  label
}: {
  graphWidth: number
  lanes: { col: number; color: string; current?: boolean }[]
  label: string
}): React.JSX.Element {
  const x = (col: number): number => PAD + col * LANE_W + LANE_W / 2
  return (
    <div className="flex items-center bg-app-panel/50 border-b border-app-border/60 select-none" style={{ height: DAY_H }}>
      <svg width={graphWidth} height={DAY_H} className="shrink-0" style={{ display: 'block' }}>
        {lanes.map((l, i) => (
          <line
            key={i}
            x1={x(l.col)}
            y1={0}
            x2={x(l.col)}
            y2={DAY_H}
            stroke={l.color}
            strokeWidth={l.current ? 3 : 2}
            strokeOpacity={l.current ? 1 : 0.5}
          />
        ))}
      </svg>
      <span className="pl-1 pr-2 text-[11px] uppercase tracking-wide text-app-muted font-semibold truncate">
        {label}
      </span>
    </div>
  )
}
