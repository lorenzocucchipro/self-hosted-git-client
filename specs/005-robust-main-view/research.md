# Research: Robust Main View

**Date**: 2026-10-13

## 1. Virtualization Library Choice

**Decision**: `@tanstack/react-virtual` (v3)

**Rationale**:
- Headless: renders no wrapper DOM — works with the existing CSS grid layout
  without forcing a specific row component structure.
- Variable row height: supports the day-group headers (26px) and multi-line
  ref-label rows (variable height) that break uniform-row virtualizers.
- Tiny: ~3KB gzipped, zero runtime dependencies.
- Mature: maintained by the TanStack team (same as React Query), MIT license,
  published well over 7 days ago, widely adopted.
- React 18 compatible: uses `useVirtualizer` hook, no class component legacy.

**Alternatives considered**:
- `react-window`: Mature but fixed-size rows only. Day headers and
  variable-height ref-label rows would require workarounds (separate lists,
  manual spacers). More friction than benefit.
- Custom windowing hook: No new dependency (constitution principle V
  preference), but adds ~150 lines of scroll-math, resize-observer, and
  overscan logic that must be maintained and tested. The risk of subtle bugs
  (blank gaps, wrong overscan, scroll jump) is higher than the risk of a
  well-maintained 3KB library.
- `react-virtuoso`: Feature-rich but heavier (~30KB) and imposes its own
  component structure. Overkill for a single table.

**Constitution compliance (Principle V)**: `@tanstack/react-virtual` is
maintained, MIT-licensed, published >7 days ago, and has no native
dependencies. It is the minimal dependency that solves the problem.

## 2. CSS Grid vs Flexbox for the Table

**Decision**: CSS `grid` with `grid-template-columns`

**Rationale**:
- A single `grid-template-columns` string shared by the header and every row
  guarantees alignment by construction. With flexbox, header and rows are
  separate flex containers that can drift (the current bug: header has 8px
  divider spans that rows don't have).
- Grid tracks map 1:1 to columns. Adding a divider is adding a track, not
  inserting an extra flex child that shifts everything.
- `min-width` on the grid container equals the sum of all track min-content
  widths, so horizontal scroll appears automatically when columns exceed the
  container width.
- The graph column uses `minmax(graphWidth, graphWidth)` — a fixed track that
  never changes, satisfying the "graph column not resizable" requirement.

**Alternatives considered**:
- Keep flexbox with synchronized divider widths: fragile. Every divider
  insertion/removal requires updating both header and row. This is the
  current approach and the source of the alignment bugs.
- HTML `<table>`: Semantically correct, but `table-layout: fixed` + sticky
  header + horizontal scroll + per-column resize is notoriously finicky in
  Electron's Chromium. Grid gives the same layout control with less
  fighting the browser's table algorithm.

## 3. Push-Semantics Column Resize

**Decision**: On drag, update only the dragged column's width. The table's
`min-width` grows with it. No neighbour clamping.

**Rationale**:
- The user wants "the table grows and scrolls horizontally, neighbours stay
  put." This is push semantics.
- Implementation: `grid-template-columns` is derived from `columnWidths`. When
  a width changes, the template string changes, the grid reflows, and
  `min-width` (sum of all tracks) grows. The container's `overflow-x: auto`
  shows a scrollbar.
- No `maxLeft` clamp needed (the current code's clamp is a bug — it assumes
  zero-sum semantics but `move()` only changes the left column).
- The only clamp is `minLeft` (minimum column width from `MIN_COLUMN_WIDTHS`).

**Edge case — Description flex mode**: When `description` is `null` (flex),
the grid track is `1fr`. On first drag, pin it to the current computed width
(measured from the DOM) so the user drags from the visible position, not from
an arbitrary fallback. The current code falls back to `160px`, causing a snap.

## 4. Sidebar State Persistence Path

**Decision**: Extend the existing `lib/prefs.ts` `Prefs` interface with
sidebar layout fields. No new IPC channels.

**Rationale**:
- `prefs.ts` already persists `theme`, `autoFetchMinutes`, `defaultDiffView`
  via `localStorage` on the renderer side. Adding `sidebarOpen`, `sidebarWidth`,
  `rightOpen`, `rightWidth` follows the same pattern.
- No IPC needed — the constitution's 4-layer IPC pattern (shared → main →
  preload → renderer) is not triggered.
- Column widths remain per-repo via the existing IPC path
  (`getColumnWidths`/`setColumnWidths` in `main/services/store.ts`), since
  they are repo-specific, not window-level.

**Alternatives considered**:
- Per-repo sidebar state (via the existing `store.ts` JSON): Rejected because
  sidebar widths are a window-level preference (the user wants the same layout
  regardless of which repo is open), confirmed in the spec's assumptions.
- New IPC channel for sidebar state: Unnecessary — `localStorage` is
  sufficient and already used for prefs.

## 5. Diff Toggle Snapshot Model

**Decision**: When the user toggles from diff to graph, snapshot
`{ filePath, commitHash, editorSearchOpen, editorSearchQuery }` into a
`pendingDiff` field in the store. Toggling back restores the snapshot.

**Rationale**:
- The clarification session confirmed: the toggle restores the original diff
  (snapshot semantics), not a live follow of the current selection.
- The snapshot is a plain object — no new IPC, no new storage. It lives in
  the Zustand store's in-memory state.
- Selecting a different commit while in graph view updates `selection` and
  the right panel, but does not touch `pendingDiff`. Toggling back reads
  `pendingDiff` to restore the diff view.
- The X button calls the existing `closeEditor()` which clears
  `editorSearchOpen`/`editorSearchQuery` and also clears `pendingDiff`.
- Switching repository tabs clears `pendingDiff` (the file belongs to the
  previous repo — already handled by `activateRepo` resetting selection).

## 6. Testing Strategy

**Decision**: Add `vitest` with a single test file for the column-layout pure
function. No full test framework setup for components (Electron + React
component testing is heavy and not in scope for this feature).

**Rationale**:
- The column-width-to-layout model (`columnLayout.ts`) is the highest
  regression-risk piece: a bug there misaligns the entire table. A pure
  function test is fast, reliable, and catches the class of bugs that
  caused the original alignment issues.
- `vitest` is chosen because it integrates with the existing Vite config
  (`electron-vite.config.ts`), requires minimal setup, and is the standard
  test runner for Vite projects.
- Component/integration tests are deferred — the build gate (`tsc` +
  `electron-vite build`) plus manual validation via `npm run dev` remains the
  primary quality gate for visual changes, as documented in `AGENTS.md`.

**Alternatives considered**:
- `jest`: Heavier setup, doesn't integrate with Vite as naturally.
- No tests: Rejected — the spec requires SC-008 ("verified by a unit test
  covering the column-width-to-layout model").
