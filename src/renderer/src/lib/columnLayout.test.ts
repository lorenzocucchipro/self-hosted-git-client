import { describe, it, expect } from 'vitest'
import { buildGridLayout, DEFAULT_COLUMN_WIDTHS, MIN_COLUMN_WIDTHS } from './columnLayout'

const graphWidth = 120

describe('buildGridLayout', () => {
  it('uses default widths with a flex description column', () => {
    const { gridTemplateColumns, tableMinWidth } = buildGridLayout(DEFAULT_COLUMN_WIDTHS, graphWidth)
    expect(gridTemplateColumns).toBe(
      `minmax(${graphWidth}px, ${graphWidth}px) 200px minmax(0, 1fr) 160px 80px 64px`
    )
    expect(tableMinWidth).toBe(graphWidth + 200 + MIN_COLUMN_WIDTHS.description + 160 + 80 + 64)
  })

  it('pins every column including description', () => {
    const widths = { refs: 100, description: 300, author: 120, date: 70, sha: 80 }
    const { gridTemplateColumns, tableMinWidth } = buildGridLayout(widths, graphWidth)
    expect(gridTemplateColumns).toBe(
      `minmax(${graphWidth}px, ${graphWidth}px) 100px 300px 120px 70px 80px`
    )
    expect(tableMinWidth).toBe(graphWidth + 100 + 300 + 120 + 70 + 80)
  })

  it('honors minimum widths for fixed columns', () => {
    const widths = { refs: 40, description: null, author: 50, date: 30, sha: 20 }
    const { gridTemplateColumns } = buildGridLayout(widths, graphWidth)
    expect(gridTemplateColumns).toBe(
      `minmax(${graphWidth}px, ${graphWidth}px) 40px minmax(0, 1fr) 50px 30px 20px`
    )
  })

  it('keeps the graph track fixed regardless of other widths', () => {
    const widths = { refs: 500, description: 500, author: 500, date: 500, sha: 500 }
    const { gridTemplateColumns } = buildGridLayout(widths, graphWidth)
    expect(gridTemplateColumns.startsWith(`minmax(${graphWidth}px, ${graphWidth}px)`)).toBe(true)
  })
})
