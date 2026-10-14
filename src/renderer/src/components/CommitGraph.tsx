import React, { useMemo, useCallback } from 'react'
import { useStore } from '../store/useStore'
import { DEFAULT_COLUMN_WIDTHS } from '../store/useStore'
import { computeGraph } from '../lib/graph'
import type { ColumnWidths } from '@shared/types'
import { CommitTable } from './CommitTable'

export function CommitGraph(): React.JSX.Element {
  const commits = useStore((s) => s.commits)
  const status = useStore((s) => s.status)
  const detached = useStore((s) => s.repo?.isDetached ?? false)
  const searchMatches = useStore((s) => s.searchMatches)
  const stashes = useStore((s) => s.stashes)
  const selection = useStore((s) => s.selection)
  const selectCommit = useStore((s) => s.selectCommit)
  const selectWip = useStore((s) => s.selectWip)
  const resizeColumn = useStore((s) => s.resizeColumn)
  const resetColumnWidths = useStore((s) => s.resetColumnWidths)

  const currentTip = useMemo(
    () => commits.find((c) => c.refs.some((r) => r.type === 'HEAD'))?.hash ?? null,
    [commits]
  )
  const currentBranch = status?.current ?? null
  const layout = useMemo(() => computeGraph(commits, currentTip), [commits, currentTip])
  const graphWidth = layout.width * 16 + 20

  const columnWidths = useStore((s) => s.columnWidths) ?? DEFAULT_COLUMN_WIDTHS

  const onSelectCommit = useCallback(
    (hash: string) => {
      selectCommit(hash)
    },
    [selectCommit]
  )

  const onSelectWip = useCallback(() => {
    selectWip()
  }, [selectWip])

  const onResizeColumn = useCallback(
    (col: keyof ColumnWidths, width: number) => {
      resizeColumn(col, width)
    },
    [resizeColumn]
  )

  const onResetColumns = useCallback(() => {
    resetColumnWidths()
  }, [resetColumnWidths])

  return (
    <CommitTable
      commits={commits}
      layout={layout}
      columnWidths={columnWidths}
      graphWidth={graphWidth}
      selection={selection}
      searchMatches={searchMatches}
      status={status}
      stashes={stashes}
      currentBranch={currentBranch}
      detached={detached}
      onSelectCommit={onSelectCommit}
      onSelectWip={onSelectWip}
      onResizeColumn={onResizeColumn}
      onResetColumns={onResetColumns}
    />
  )
}
