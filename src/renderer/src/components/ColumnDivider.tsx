import React from 'react'
import type { ColumnWidths } from '@shared/types'

interface ColumnDividerProps {
  column: keyof ColumnWidths
  currentWidth: number
  minWidth: number
  onResize: (width: number) => void
}

export function ColumnDivider({ column, currentWidth, minWidth, onResize }: ColumnDividerProps): React.JSX.Element {
  const handlePointerDown = (e: React.PointerEvent<HTMLSpanElement>): void => {
    const target = e.currentTarget
    target.setPointerCapture(e.pointerId)
    const startX = e.clientX
    const startWidth = currentWidth

    const move = (ev: PointerEvent): void => {
      const delta = ev.clientX - startX
      const nextWidth = Math.max(minWidth, startWidth + delta)
      onResize(nextWidth)
    }

    const up = (ev: PointerEvent): void => {
      target.releasePointerCapture(ev.pointerId)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <span
      onPointerDown={handlePointerDown}
      className="group absolute right-0 top-0 bottom-0 cursor-col-resize z-30"
      style={{ width: 8, transform: 'translateX(50%)' }}
      data-column={column}
    >
      {/* visible separator line — distinct from row borders */}
      <span className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-1 bg-app-muted/40 group-hover:bg-app-accent transition-colors" />
      {/* hover background highlight */}
      <span className="absolute inset-0 group-hover:bg-app-accent/20 rounded-sm transition-colors" />
    </span>
  )
}
