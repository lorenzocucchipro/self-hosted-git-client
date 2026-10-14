import React from 'react'
import type { GraphRow } from '../lib/graph'
import type { Commit } from '@shared/types'

const LANE_W = 16
const PAD = 10
const R = 5
const DIM = 0.45

const x = (col: number): number => PAD + col * LANE_W + LANE_W / 2

interface GraphCellProps {
  row: GraphRow
  commit: Commit
  graphWidth: number
  rowHeight: number
}

export function GraphCell({ row, commit, graphWidth, rowHeight }: GraphCellProps): React.JSX.Element {
  const isStash = commit.refs.some((r) => r.type === 'stash')
  const mid = rowHeight / 2

  return (
    <svg width={graphWidth} height={rowHeight} className="shrink-0" style={{ display: 'block' }}>
      {row.passing.map((p, i) => (
        <line
          key={`p${i}`}
          x1={x(p.col)}
          y1={0}
          x2={x(p.col)}
          y2={rowHeight}
          stroke={p.color}
          strokeWidth={p.current ? 3 : 2}
          strokeOpacity={p.current ? 1 : DIM}
        />
      ))}
      {row.incoming.map((e, i) => (
        <path
          key={`i${i}`}
          d={`M ${x(e.fromCol)} 0 C ${x(e.fromCol)} ${mid} ${x(e.toCol)} 0 ${x(e.toCol)} ${mid}`}
          fill="none"
          stroke={e.color}
          strokeWidth={e.current ? 3 : 2}
          strokeOpacity={e.current ? 1 : DIM}
        />
      ))}
      {row.outgoing.map((e, i) => (
        <path
          key={`o${i}`}
          d={`M ${x(e.fromCol)} ${mid} C ${x(e.fromCol)} ${rowHeight} ${x(e.toCol)} ${mid} ${x(e.toCol)} ${rowHeight}`}
          fill="none"
          stroke={e.color}
          strokeWidth={e.current ? 3 : 2}
          strokeOpacity={e.current ? 1 : DIM}
        />
      ))}
      {/* soft glow behind the node when it's on the current branch line */}
      {row.current && !isStash && (
        <circle cx={x(row.col)} cy={mid} r={R + 3} fill="none" stroke={row.color} strokeWidth={2} strokeOpacity={0.35} />
      )}
      {isStash ? (
        /* stash = amber rounded square, instantly distinct from round commits */
        <rect
          x={x(row.col) - R - 1}
          y={mid - R - 1}
          width={(R + 1) * 2}
          height={(R + 1) * 2}
          rx={2}
          fill="rgb(var(--app-warning))"
          stroke="rgb(var(--app-bg))"
          strokeWidth={2}
          opacity={row.current ? 1 : DIM}
        />
      ) : (
        /* filled node = pushed, hollow node = local-only (not pushed) */
        <circle
          cx={x(row.col)}
          cy={mid}
          r={R}
          fill={commit.pushed ? row.color : 'rgb(var(--app-bg))'}
          stroke={commit.pushed ? 'rgb(var(--app-bg))' : row.color}
          strokeWidth={2}
          opacity={row.current ? 1 : DIM}
        />
      )}
    </svg>
  )
}
