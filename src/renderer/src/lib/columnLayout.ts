import type { ColumnWidths } from '@shared/types'

export const MIN_COLUMN_WIDTHS: Required<Pick<ColumnWidths, 'refs' | 'author' | 'date' | 'sha'>> & {
  description: number
} = {
  refs: 80,
  description: 120,
  author: 100,
  date: 60,
  sha: 50
}

export const DEFAULT_COLUMN_WIDTHS: ColumnWidths = {
  refs: 200,
  description: null,
  author: 160,
  date: 80,
  sha: 64
}

/**
 * Build a CSS grid template for the commit-history table.
 * The graph column is fixed; every other column uses its pinned width, except
 * description which flexes when its width is null.
 * Resizers are overlay handles, not grid tracks, so the header and rows share
 * the same six-column template by construction.
 */
export function buildGridLayout(
  columnWidths: ColumnWidths,
  graphWidth: number
): { gridTemplateColumns: string; tableMinWidth: number } {
  const tracks: string[] = [`minmax(${graphWidth}px, ${graphWidth}px)`]
  let fixedWidth = graphWidth

  const add = (width: number | null, min: number): void => {
    if (width == null) {
      tracks.push('minmax(0, 1fr)')
      fixedWidth += min
    } else {
      tracks.push(`${width}px`)
      fixedWidth += width
    }
  }

  add(columnWidths.refs, MIN_COLUMN_WIDTHS.refs)
  add(columnWidths.description, MIN_COLUMN_WIDTHS.description)
  add(columnWidths.author, MIN_COLUMN_WIDTHS.author)
  add(columnWidths.date, MIN_COLUMN_WIDTHS.date)
  add(columnWidths.sha, MIN_COLUMN_WIDTHS.sha)

  return {
    gridTemplateColumns: tracks.join(' '),
    tableMinWidth: fixedWidth
  }
}
