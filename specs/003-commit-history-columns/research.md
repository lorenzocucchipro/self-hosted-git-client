# Phase 0: Research

## R1 — Column width persistence: where to store per-repository widths

**Decision**: Extend the existing main-process `store` service
(`src/main/services/store.ts`) with a `repoColumnWidths: Record<string, ColumnWidths>`
map persisted in the same `state.json` file in the Electron `userData` directory.

**Rationale**: The `store` service already persists app-level state (recent repos, open
tabs, active repo) as a single JSON file in `userData`. Adding a keyed map for per-repo
column widths reuses the same load/save infrastructure, the same file, and the same IPC
envelope pattern. It keeps persistence on the main process (where file I/O belongs) and the
renderer stays free of filesystem concerns. Per-repo keying by absolute repo path matches
the existing `RecentRepo.path` convention.

**Alternatives considered**:
- *Renderer `localStorage` (like `prefs.ts`)*: Simpler, but `localStorage` is a single
  global bucket keyed by string; per-repo keying would work but the constitution favors
  keeping persistent state on the main process for auditability, and the prefs file is
  intentionally limited to user preferences (theme, auto-fetch, diff view) — not
  per-repository data. Mixing per-repo state into `localStorage` would muddy that boundary.
- *A separate JSON file per repo*: Over-engineered for a few numbers; one map in the
  existing file is simpler and avoids a file-per-repo proliferation.

## R2 — Resizable column layout: CSS vs. JS-managed widths

**Decision**: JS-managed pixel widths applied via inline `style={{ width }}` on each
column cell and header, driven by a `columnWidths` slice in the Zustand store. The Graph
column keeps its existing `graphWidth` (derived from the branch layout) and is not
resizable.

**Rationale**: The current `CommitGraph` already uses inline `width` styles for the
Graph and Refs columns (`style={{ width: graphWidth }}`, `style={{ width: REFS_W }}`)
and fixed Tailwind widths (`w-40`, `w-20`, `w-16`) for Author/Date/SHA. Replacing the
fixed widths with JS-driven inline styles is the smallest delta, keeps the header and
every row reading from the same source of truth, and makes live drag resizing trivial
(state update → re-render). A CSS-grid or CSS-table layout would require reworking the
row internals (the SVG graph lane, the refs labels, the flex row) and risks the existing
row-height measurement logic.

**Alternatives considered**:
- *CSS `resize` on columns*: Not applicable to a flex row of spans; `resize` works on
  block/grid containers and would fight the existing SVG-measured graph column.
- *CSS Grid with `grid-template-columns`*: Would require restructuring every row and the
  day-header into grid children; larger blast radius for no benefit over inline widths.

## R3 — Drag interaction: pointer events vs. mouse events

**Decision**: Use React pointer events (`onPointerDown` on the divider, `pointermove` +
`pointerup` on `window` during the drag), capturing the pointer so the drag survives
fast movement. Compute the new width from the delta against the column's left edge.

**Rationale**: Pointer events unify mouse and touch, are well-supported in Electron 33,
and `setPointerCapture` keeps the drag alive even if the pointer leaves the divider.
The existing codebase uses standard React synthetic events; pointer events are the
modern, unifying choice and need no new dependency.

**Alternatives considered**:
- *A drag library (e.g. `react-dnd`)*: Overkill for a 1D resize; adds a dependency the
  constitution discourages (Principle V).
- *Raw `mousedown`/`mousemove`*: Works but misses touch trackpads and requires manual
  capture handling that pointer events give for free.

## R4 — Truncated-cell tooltip: reuse `title` vs. custom component

**Decision**: Reuse the native `title` attribute, set only when the cell's rendered
content is genuinely truncated (measured via `scrollWidth > clientWidth` on the cell
element). This is the same mechanism adopted for the sidebar in spec 002.

**Rationale**: The spec explicitly requires the same native mechanism as the sidebar
(FR-012). `title` is presentation-only, needs no state, and the truncation check
(`scrollWidth > clientWidth`) is a cheap, reliable measurement that already works for the
sidebar rows. A custom tooltip would violate FR-012 and add scope.

**Alternatives considered**:
- *Custom floating tooltip*: Rejected by the spec (FR-012).
- *Always set `title` regardless of truncation*: Rejected by the spec (FR-012 requires it
  only when truncated).

## R5 — Reset action placement

**Decision**: Add a "Reset column widths to defaults" entry to the commit history's
existing right-click context menu (the same `ContextMenu` already used per-row and on
the graph background), separated by a divider. Resetting clears the saved widths for the
current repo in the main-process store and updates the renderer state immediately.

**Rationale**: The history area already has a context menu infrastructure
(`useContextMenu`, `ContextMenu` component). Adding one item reuses it with no new UI
chrome. Per-repo reset is a single store call. The spec (FR-013) requires the reset to
persist (so the defaults survive a reopen), which falls out naturally from clearing the
saved entry.

**Alternatives considered**:
- *A header reset button*: Adds permanent chrome for an infrequent action; rejected by
  the spec clarification (Option B chosen).
- *A keyboard shortcut*: Undiscoverable for a layout action; the context menu is the
  established pattern in this view.

## R6 — Minimum column widths

**Decision**: Each resizable column has a fixed minimum width in pixels, enforced during
drag (the drag stops shrinking the column once it hits the minimum). Proposed defaults:
Refs 80, Description 120, Author 100, Date 60, SHA 50. These are constants in
`CommitGraph.tsx`, not user-configurable.

**Rationale**: The spec (FR-005) requires a sensible minimum so columns never collapse or
invert. Fixed pixel minimums are the simplest enforceable rule and match the existing
fixed-width constants (`REFS_W`, `w-40`, etc.). The exact values are implementation
details tuned during the build; the spec only requires they exist and prevent collapse.

**Alternatives considered**:
- *Percentage-based minimums*: Fragile under window resize; pixel minimums are stable.
- *Content-based minimums (widest cell)*: Expensive to measure across all rows; a fixed
  floor is cheaper and sufficient to prevent collapse.
