# UI Contracts

**Date**: 2026-10-02 | **Spec**: [spec.md](./spec.md)

This feature has no external API, IPC, or CLI contracts. It is a pure
presentation-layer fix within the existing Electron renderer. The contracts
below describe the UI behavior contracts that the implementation must satisfy.

## C1 — Sidebar Indentation Contract

**Component**: `RefTree.tsx` → `TreeNode`, `FolderNode`, `BranchRow`, `TagLeaf`

- Indentation step: **20px per depth level**, applied as
  `paddingLeft: depth * 20px` on the row wrapper.
- At the same `depth`, the left edge of the row content (chevron for folders,
  icon for leaves) MUST align to the same x-pixel position.
- A child node's content MUST start 20px to the right of its parent's content
  start, at every depth — not only depth 0 → 1.
- The expand/collapse chevron (folders) and the branch/tag icon (leaves) MUST
  occupy the same horizontal slot at the same depth.
- Long names truncate with `text-overflow: ellipsis`; the existing
  `useTruncatedTitle` hook (spec 002) provides the full-name tooltip.

**Pre-condition**: `buildRefTree` (lib/refTree.ts) assigns `depth` correctly —
already verified, no change needed.

## C2 — History Table Row-Width Contract

**Component**: `CommitGraph.tsx` → `CommitRow`, header, `DayHeader`

- Every row (header, commit row, WIP row, day header) MUST have the same
  total width, equal to `graphWidth + refs + description + author + date + sha`
  (where `description` is the resolved width, or flex-fills to make the total
  ≥ viewport width).
- Row backgrounds (base, `hover:bg-app-hover`, `bg-app-accent/15` for selected,
  `bg-app-warning/[0.07]` for stash) MUST paint across the full row width, so
  no unpainted `bg-app-bg` strip appears when scrolled horizontally.
- When the total column width exceeds the viewport, horizontal scrolling
  reveals all columns; when it's less, the Description column (flex) fills the
  remaining space so no gap appears.

## C3 — History Table Content-Clipping Contract

**Component**: `CommitGraph.tsx` → column cells in `CommitRow`

- Every column cell MUST clip overflow with `overflow-hidden`.
- Text content in every column MUST use `truncate` (or `OverflowTitle`) so
  `text-overflow: ellipsis` applies when the text exceeds the cell width.
- No cell content may paint outside its cell boundaries or beyond the table's
  right edge, at any scroll position or window width.

## C4 — Column Resize Divider Contract

**Component**: `CommitGraph.tsx` → `ColumnDivider`

- A divider MUST exist on each boundary between resizable columns:
  Refs↔Description, Description↔Author, Author↔Date, Date↔SHA.
- NO divider exists before the Graph column (Graph is auto-sized, not
  resizable).
- The divider MUST be visible at rest (a 1–2px line in `border-app-border`),
  and highlight to `bg-app-accent` on hover.
- The hit area is 8px wide; the cursor is `col-resize` over the hit area.
- Dragging updates the left column's width live; the right column's width is
  reduced correspondingly (or, if Description is the right column and is flex,
  it absorbs the change).
- No column may shrink below `MIN_COLUMN_WIDTHS[col]`.

## C5 — Header Tooltip Contract

**Component**: `CommitGraph.tsx` → `ColumnHeader`

- When a header label is truncated (`scrollWidth > clientWidth`), hovering the
  header MUST show the full label in a native `title` tooltip.
- When the label fits fully, no tooltip appears.
- Implementation: reuse `useTruncatedTitle` hook (from spec 002).

## C6 — Ref Chip Tooltip Contract

**Component**: `CommitGraph.tsx` → `ExpandableBadge`

- When a branch/tag chip name is truncated, hovering the chip reveals the
  full name via the existing hover overlay (already implemented).
- This contract is already satisfied by the existing `ExpandableBadge`
  component — no change required unless validation finds a gap.
