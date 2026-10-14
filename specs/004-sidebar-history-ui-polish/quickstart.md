# Quickstart Validation Guide

**Date**: 2026-10-02 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Runnable validation scenarios that prove the feature works end-to-end.
Run these after implementation, with `npm run dev`.

## Prerequisites

- A git repository with branches nested at least 3 levels deep, e.g.:
  `feature/BPMA-1310/BPMA-1343/some-task`
- The app running via `npm run dev` with that repository open
- `npm run build` passes (typecheck + electron-vite build)

## Scenario 1 — Sidebar nested hierarchy (FR-001, FR-002, SC-001)

**Goal**: Every nesting level is clearly indented; no child looks like a
sibling of its parent.

**Steps**:
1. In the sidebar, expand all folders under "Local branches".
2. Visually verify that each depth level is indented 20px further than its
   parent, at every depth — not just the first level.
3. Verify that a depth-2 folder (e.g. `BPMA-1343` inside `BPMA-1310` inside
   `feature`) is clearly to the right of `BPMA-1310`, which is clearly to the
   right of `feature`.
4. Verify that folder chevrons and leaf branch icons at the same depth
   left-align.

**Expected**: The hierarchy is unmistakable at every depth. No row at depth
N aligns with a row at depth N−1.

## Scenario 2 — No white gap / overflow on horizontal scroll (FR-003, FR-004, SC-002)

**Goal**: Scrolling the history table right at a small window size shows no
white strip and no text overflow.

**Steps**:
1. Resize the app window to be narrow enough that the history table requires
   horizontal scrolling (all columns don't fit).
2. Scroll the history table all the way to the right.
3. Verify the rightmost visible content is the SHA column's data — no empty
   white strip follows it.
4. Verify no cell text spills outside its cell boundaries.
5. Hover a commit row, then scroll horizontally — verify the hover highlight
   extends across the full scrollable width.
6. Select a commit (click it), then scroll horizontally — verify the selection
   highlight extends across the full scrollable width.

**Expected**: Clean rendering at all scroll positions; row backgrounds
(hover/selection) span the full scrollable width.

## Scenario 3 — Resizable columns with visible dividers (FR-005, FR-006, FR-007, SC-003)

**Goal**: Every text column can be resized by dragging a visible divider.

**Steps**:
1. In the history table header, verify that a subtle vertical line is visible
   between each pair of resizable columns (Refs↔Description,
   Description↔Author, Author↔Date, Date↔SHA).
2. Verify NO divider exists before the Graph column (Graph is auto-sized).
3. Hover a divider — verify the cursor changes to `col-resize` and the line
   highlights to the accent color.
4. Drag the Refs↔Description divider left — verify the Refs column shrinks
   and Description grows, live during the drag.
5. Try to shrink a column below its minimum (e.g. drag Date to be very
   narrow) — verify it stops at the minimum width and the label stays
   readable.
6. Verify the Graph column width does NOT change when dragging any divider.

**Expected**: All text columns are resizable; Graph is not; minimums are
enforced; the drag is live and smooth.

## Scenario 4 — Column width persistence (FR-008, SC-004)

**Goal**: Resized column widths survive an app restart.

**Steps**:
1. Resize one or more columns to non-default widths.
2. Close the app (quit, not just minimize).
3. Reopen the app and open the same repository.
4. Verify the previously chosen column widths are restored.

**Expected**: Column widths persist across restarts, per repository.

## Scenario 5 — Header tooltips for truncated labels (FR-009, SC-005)

**Goal**: A truncated header label shows its full text on hover.

**Steps**:
1. Narrow the Description column (or any column) until its header label is
   truncated (shows an ellipsis).
2. Hover the truncated header label.
3. Verify a native tooltip appears showing the full label ("Description").
4. Widen the column until the label fits fully.
5. Hover the header — verify no tooltip appears (or a harmless one).

**Expected**: Tooltip appears only when the label is genuinely truncated.

## Scenario 6 — Ref chip full-name reveal (FR-010)

**Goal**: A truncated branch/tag chip in the Refs column reveals its full
name on hover.

**Steps**:
1. Narrow the Refs column until a branch chip name is truncated.
2. Hover the truncated chip.
3. Verify the full branch name appears (via the existing hover overlay).

**Expected**: Full ref name is discoverable on hover even when truncated.

## Build Verification

After all scenarios pass:
```
npm run build
```
Must exit 0 (typecheck + electron-vite build green).
