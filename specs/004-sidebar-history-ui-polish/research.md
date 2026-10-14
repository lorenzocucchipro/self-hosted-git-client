# Phase 0: Research

**Date**: 2026-10-02 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## R1 — Sidebar indentation: why nested folders look like siblings

**Decision**: Increase the per-level indentation step from 12px to 20px and
apply it consistently to both folder rows and leaf rows, so every depth is
visually distinct. The chevron (folders) and branch/tag icon (leaves) must
left-align at the same x-position for the same depth.

**Rationale**: The current code (`RefTree.tsx` line 64) computes
`const indent = `${node.depth * 12}px`` and applies it as `paddingLeft` on a
wrapper `<div>`. Inside that wrapper, `FolderNode` renders a `<button>` with
`px-3` (12px left padding) and `BranchRow` renders a `<div>` with `px-3`
(12px left padding). So the effective left edge of a depth-0 folder's chevron
is 0 + 12 = 12px, and a depth-1 leaf's icon is 12 + 12 = 24px — only a 12px
difference per level, which is barely perceptible. Worse, the folder's
chevron sits at the button's content edge (after `px-3`), while the leaf's
icon also sits after `px-3`, so at the same depth they align — but the
per-level step is too small to convey hierarchy at a glance, especially with
nested folders where a depth-1 folder and a depth-2 folder are only 12px
apart.

Increasing the step to 20px makes each level clearly distinguishable (a
depth-3 item is 60px from the left, vs 36px today). 20px is the indentation
step used by VS Code's file tree and most desktop file managers, making it
a familiar visual language.

**Alternatives considered**:
- *16px step*: Better than 12px but still subtle for deep nesting; 20px is
  clearer without wasting space in the 240px sidebar.
- *Indentation guide lines (vertical lines at each level)*: Helps but adds
  visual noise and complexity; the spec asks for "clear evidence of the
  hierarchy" which proportional indentation alone achieves. Could be a
  future enhancement.
- *Variable step (larger at top, smaller at depth)*: Over-engineered; a
  constant step is predictable and easier to verify.

## R2 — History table white gap and text overflow on horizontal scroll

**Decision**: Ensure every commit row and the header row have the same total
width by making the row container `w-max min-w-full` (or equivalent), so the
row background (hover/selection) paints across the entire scrollable width.
Clip cell content with `overflow-hidden` + `truncate` on every column cell,
including the flex-1 Description column, so text never spills outside its
cell.

**Rationale**: The `CommitGraph` container is `overflow-auto bg-app-bg`. Each
row is a `flex` container with `shrink-0` columns and one `flex-1` Description
column (when `description == null`). When the window is narrow, `flex-1`
shrinks Description to its `min-w-0` content minimum, so the row's total width
can be less than the scrollable width established by the header (which has the
same structure but may compute differently due to sticky positioning). The
row background (`hover:bg-app-hover`, `bg-app-accent/15`) only covers the
row's own width, leaving the unpainted `bg-app-bg` strip visible when scrolled
right. Additionally, cell content that exceeds its column width is not
consistently clipped — some cells use `truncate` but the flex-1 Description
cell uses `overflow-hidden` without `text-overflow: ellipsis` on the text
itself in all cases.

The fix has two parts:
1. **Row width**: Wrap all rows (and the header) so their minimum width equals
   the sum of all column widths. When Description is flex (`null`), it absorbs
   slack but never below the row's content minimum. When columns are resized
   (Description pinned to a number), the total is fixed and rows must be
   exactly that wide. Using `w-max` on the row ensures it's at least as wide as
   its content; `min-w-full` ensures it's at least as wide as the viewport (so
   hover backgrounds fill the visible area even when content is narrower).
2. **Content clipping**: Every column cell already has `overflow-hidden`; the
   text inside must also have `truncate` (or `OverflowTitle`) so the ellipsis
   kicks in. The `OverflowTitle` component already exists and is used for
   Description, Author — it measures overflow and sets `title`. The fix is to
   ensure it's applied consistently to all text-bearing cells.

**Alternatives considered**:
- *CSS Grid with `grid-template-columns`*: Would require restructuring every
  row and the day-header into grid children; larger blast radius for no
  benefit over fixing the flex row width.
- *A fixed total table width*: Would break the flex-1 Description behavior
  that lets it fill remaining space on wide windows.
- *Painting the background on the scroll container instead of the row*: Would
  lose the per-row hover/selection distinction.

## R3 — Column resize divider discoverability

**Decision**: Make the column dividers always visible (not just on hover) with
a subtle 2px-wide grab handle, and add a `col-resize` cursor on a wider
hit area (8px). The handle uses `border-app-border` by default and
`bg-app-accent` on hover, so users can find it without hunting.

**Rationale**: The existing `ColumnDivider` (CommitGraph.tsx lines 973–1030)
renders an 8px-wide invisible span with a 1px vertical line that only appears
on hover (`group-hover:bg-app-accent`). Users cannot discover the resize
affordance because it's invisible at rest — they have to accidentally hover
the exact 8px strip between headers to see it. Making the divider line
always visible (dim by default, accent on hover) is the standard pattern in
spreadsheet apps, file managers, and IDE tables.

The 8px hit area is already good; only the visual feedback is missing. The
cursor is already `cursor-col-resize` on the span — that's correct. The fix
is purely visual: change the separator line from `group-hover:bg-app-accent`
to always `bg-app-border` with `group-hover:bg-app-accent`, and optionally
widen the visible line to 2px for better visibility.

**Alternatives considered**:
- *A visible grip icon (≡) on each divider*: Adds visual clutter; a simple
  colored line is cleaner and standard.
- *Larger hit area (12px+)*: 8px is already a comfortable target; increasing
  it risks accidental drags when clicking near column edges.

## R4 — Graph column: auto-size, not user-resizable

**Decision**: The Graph column already auto-sizes via
`graphWidth = layout.width * LANE_W + PAD * 2` (CommitGraph.tsx line 64) and
has no `ColumnDivider` before it. Confirm this is correct per the
clarification: the Graph column is excluded from manual resizing and its
width is driven entirely by the rendered commit-graph lanes. No code change
needed — this is already the behavior.

**Rationale**: The user clarified that the Graph column should be "as wide as
the graph" and adapt dynamically. The current code already does this: `graphWidth`
is computed from `layout.width` (the number of lanes in the graph) and applied
as a fixed `width` on the SVG and the Graph header span. There is no
`ColumnDivider` between Graph and Refs, so the Graph column cannot be dragged.
This matches the spec (FR-005: "The Graph column MUST NOT be manually
resizable; it MUST auto-size to the width required by the rendered
commit-graph lanes").

**Alternatives considered**: None — the current behavior already matches the
clarified requirement.

## R5 — Header label tooltips when truncated

**Decision**: Apply the existing `useTruncatedTitle` hook (from
`src/renderer/src/lib/useTruncatedTitle.ts`, introduced in spec 002) to the
`ColumnHeader` component, so a truncated header label shows its full text in a
native `title` tooltip on hover.

**Rationale**: The `ColumnHeader` component (CommitGraph.tsx lines 953–970)
currently renders a plain `<span>{label}</span>` with `overflow-hidden` but no
`title` attribute. When a column is narrowed, the label is clipped with no
tooltip. The `useTruncatedTitle` hook already exists and is used by
`BranchRow` and `RefTree` folder/leaf rows — it measures overflow on
`mouseenter` and sets `title` only when `scrollWidth > clientWidth`. Reusing
it for `ColumnHeader` is a one-line change (attach the hook's ref and
`onMouseEnter` to the span) and keeps the tooltip behavior consistent across
the app.

For the Refs column's branch/tag chips, the existing `ExpandableBadge`
already reveals the full name on hover via an absolutely-positioned overlay
(CommitGraph.tsx lines 618–674). The spec (FR-010) requires a tooltip for
truncated ref chips; the overlay already satisfies this — no change needed.
If the overlay is deemed insufficient (it's a hover overlay, not a native
tooltip), a `title` attribute can be added as a fallback, but the overlay is
more user-friendly and already implemented.

**Alternatives considered**:
- *Always set `title` on headers*: Violates the spec (FR-009 requires tooltip
  only when truncated) and produces redundant tooltips on wide columns.
- *Custom tooltip component*: Violates constitution Principle V (minimal
  dependencies) and the established `useTruncatedTitle` pattern.

## R6 — First-open default column widths

**Decision**: Keep the existing `DEFAULT_COLUMN_WIDTHS` (refs: 200,
description: null [flex], author: 160, date: 80, sha: 64) as the sensible
per-column defaults. When no saved widths exist for a repo, `loadColumnWidths`
already falls back to these defaults (useStore.ts line 592). No change needed
— this matches the clarification (Option C: sensible per-column defaults,
horizontal scrolling appears as needed).

**Rationale**: The defaults are already sensible and were tuned in spec 003.
Description is `null` (flex) by default, so it fills remaining space on wide
windows and shrinks on narrow ones. When the total exceeds the viewport,
horizontal scrolling appears naturally. The user chose Option C explicitly,
and the current behavior already implements it.

**Alternatives considered**: None — the current behavior matches the
clarification.
