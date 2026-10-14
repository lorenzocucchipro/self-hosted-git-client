# Implementation Plan: Robust Main View

**Branch**: `005-robust-main-view` | **Date**: 2026-10-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-robust-main-view/spec.md`

## Summary

Restructure the main window's three-pane layout and commit-history table so they
are safe to modify without regressions. The work is divided into 6 independently
shippable chunks, ordered from lowest risk to highest. Each chunk delivers value
on its own and can be committed/PR'd separately.

The core changes are: (1) fix a latent crash and add error boundaries, (2) split
the 1,080-line `CommitGraph.tsx` into focused modules, (3) move sidebar layout
state into the store with persistence and collapse slivers, (4) rewrite the
table as a single CSS grid with push-semantics column resizing, (5) memoize rows
and add virtualization for full history, (6) add the diff close/toggle with
snapshot semantics.

## Technical Context

**Language/Version**: TypeScript 5.7, React 18, Electron 33

**Primary Dependencies**: Zustand 5 (state), Tailwind CSS 3 (styling), simple-git 3
(git backend), electron-vite 2 (bundler), lucide-react 0.468 (icons). New dep
candidate: `@tanstack/react-virtual` (headless virtualization, ~3KB, MIT,
works with CSS grid).

**Storage**: Renderer-side `localStorage` for UI prefs (`lib/prefs.ts`); per-repo
JSON file in Electron `userData` for column widths (`main/services/store.ts`).
No new storage layers needed — sidebar state extends the existing prefs system.

**Testing**: Currently none. Add `vitest` for the column-width-to-layout pure
function (the highest regression-risk piece). The build (`npm run build` =
typecheck + electron-vite build) remains the primary quality gate.

**Target Platform**: macOS, Windows, Linux (Electron desktop app)

**Project Type**: Desktop app (Electron + React)

**Performance Goals**: Column drag at 60fps with no row re-render flicker;
smooth scrolling through 10,000+ commits with only visible rows in the DOM.

**Constraints**: Offline-capable, no telemetry, no network calls (constitution
principle I). All colors via Tailwind semantic tokens (principle IV). New
dependencies vetted per constitution principle V.

**Scale/Scope**: Single user, single window. History can reach 10,000+ commits.
Up to 6 columns, 2 sidebars, 1 diff view.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Local-First & Private | PASS | All changes are UI/layout. No new network calls, no telemetry, no external services. |
| II. Type Safety & IPC | PASS | Sidebar state uses existing `localStorage` prefs — no new IPC channels. Column widths use existing IPC (`getColumnWidths`/`setColumnWidths`). No new IPC needed. |
| III. Build Must Be Green | PASS | `npm run build` (typecheck + electron-vite build) remains the gate. Will add `vitest` for the layout model test. |
| IV. Branding & Styling | PASS | All new UI uses existing `app-*` Tailwind tokens. Collapse slivers, pending-diff indicator, error boundary fallback all use semantic tokens. No hardcoded hex. |
| V. Simplicity & Minimal Deps | CONDITIONAL | `@tanstack/react-virtual` is the only new dependency candidate. Must be vetted: maintained, MIT license, published >7 days. See research.md. If rejected, a custom windowing hook is the fallback. |

**Verdict**: No violations. One conditional (new dependency) resolved in
research.md.

## Project Structure

### Documentation (this feature)

```text
specs/005-robust-main-view/
├── plan.md              # This file
├── research.md          # Phase 0: virtualization lib, grid layout approach
├── data-model.md        # Phase 1: entities, state transitions
├── quickstart.md        # Phase 1: chunk-by-chunk validation guide
├── contracts/
│   └── ui-contracts.md  # Phase 1: component contracts
└── tasks.md             # Phase 2 output (/speckit-tasks - NOT created here)
```

### Source Code (repository root)

```text
src/
├── renderer/src/
│   ├── components/
│   │   ├── CommitGraph.tsx        # EXISTING — slimmed down, delegates to modules
│   │   ├── CommitTable.tsx        # NEW — grid table (header + virtualized body)
│   │   ├── CommitRow.tsx          # NEW — memoized row component
│   │   ├── GraphCell.tsx          # NEW — SVG graph cell per row
│   │   ├── RefBadges.tsx          # NEW — BranchBadge, TagBadge, etc. (extracted)
│   │   ├── commitMenus.ts         # NEW — context menu builders (extracted)
│   │   ├── ColumnDivider.tsx      # NEW — push-semantics resize handle
│   │   ├── ErrorBoundary.tsx      # NEW — per-pane error boundary
│   │   ├── Sidebar.tsx            # EXISTING — add resize handle + collapse sliver
│   │   ├── Toolbar.tsx            # EXISTING — add right sidebar toggle + diff toggle
│   │   ├── DiffEditor.tsx         # EXISTING — add graph/diff toggle button
│   │   └── ...
│   ├── store/
│   │   └── useStore.ts            # EXISTING — add sidebar state, toggleEditorView
│   ├── lib/
│   │   ├── prefs.ts               # EXISTING — extend Prefs with sidebar layout
│   │   ├── columnLayout.ts        # NEW — pure function: widths → grid template
│   │   └── useVirtualList.ts      # NEW (if no lib) — or use @tanstack/react-virtual
│   └── ...
├── shared/
│   └── types.ts                   # EXISTING — add EditorSnapshot type
└── ...
```

**Structure Decision**: Single-project Electron app. New files are extracted
modules within the existing `src/renderer/src/components/` and `src/renderer/src/lib/`
directories. No new top-level directories. The `src/shared/types.ts` file gets one
new type (`EditorSnapshot`) for the diff toggle snapshot.

## Chunked Execution Plan

Each chunk is independently shippable: build green, commit, PR, merge.
Chunks are ordered by risk (lowest first) and dependency (each builds on prior).

### Chunk 1: Fix RefLabels crash + add ErrorBoundary

**Scope**: Prevent the blank-window crash. No visual change in normal operation.

**Files touched**:
- `src/renderer/src/components/CommitGraph.tsx` — fix `RefLabels` conditional hooks
- `src/renderer/src/components/ErrorBoundary.tsx` — new component
- `src/renderer/src/App.tsx` — wrap each pane in `<ErrorBoundary>`

**Acceptance**: A commit going from 1 ref label to 2 no longer crashes; a
rendering error in any pane shows a fallback instead of a blank window.

**Dependencies**: None. Can be done first, in isolation.

---

### Chunk 2: Extract commitMenus + RefBadges from CommitGraph

**Scope**: Pure refactor. No behavior change. Reduces `CommitGraph.tsx` from
~1,080 lines to ~400, making subsequent chunks safer.

**Files touched**:
- `src/renderer/src/components/commitMenus.ts` — new (extracted menu builders)
- `src/renderer/src/components/RefBadges.tsx` — new (extracted badge components)
- `src/renderer/src/components/CommitGraph.tsx` — slimmed (imports from above)

**Acceptance**: `npm run build` green. No visible UI change.

**Dependencies**: Chunk 1 (so the extracted `RefLabels` is already fixed).

---

### Chunk 3: Sidebar layout state — resizable, collapsible, persisted

**Scope**: Both sidebars visible by default, resizable, collapsible with sliver
hint, persisted across restarts, max-width clamp to protect center.

**Files touched**:
- `src/renderer/src/lib/prefs.ts` — extend `Prefs` with `sidebarOpen`,
  `sidebarWidth`, `rightOpen`, `rightWidth`
- `src/renderer/src/store/useStore.ts` — add sidebar layout fields + actions
- `src/renderer/src/App.tsx` — replace local `rightWidth` with store state;
  add left resize handle; add collapse slivers
- `src/renderer/src/components/Sidebar.tsx` — use store width
- `src/renderer/src/components/Toolbar.tsx` — add right sidebar toggle button

**Acceptance**: Both sidebars open by default; drag to resize; collapse via
toolbar; sliver with icon when collapsed; re-expand restores width; persist
across restart; center never shrinks below minimum.

**Dependencies**: None (independent of chunks 1–2, but easier after 2 since
`CommitGraph.tsx` is smaller).

---

### Chunk 4: Table rewrite — single grid, push-semantics resize, SHA divider

**Scope**: The core change. Header and rows share one grid template; all
columns (including SHA) resizable; graph column fixed; push semantics (table
grows, scrolls horizontally); smooth drag without row re-renders.

**Files touched**:
- `src/renderer/src/lib/columnLayout.ts` — new pure function: `ColumnWidths` →
  `gridTemplateColumns` string + `tableMinWidth` number
- `src/renderer/src/components/ColumnDivider.tsx` — new push-semantics divider
- `src/renderer/src/components/CommitTable.tsx` — new grid-based table
- `src/renderer/src/components/CommitRow.tsx` — new (extracted, not yet memoized)
- `src/renderer/src/components/GraphCell.tsx` — new (extracted SVG cell)
- `src/renderer/src/components/CommitGraph.tsx` — delegates to `CommitTable`
- `vitest.config.ts` + `src/renderer/src/lib/columnLayout.test.ts` — new test

**Acceptance**: Header and rows aligned to ≤1px at all widths; SHA resizable;
graph fixed; push semantics; smooth drag; column-width model has a unit test.

**Dependencies**: Chunk 2 (so `CommitGraph.tsx` is already split and easier to
rewrite). This is the highest-risk chunk.

---

### Chunk 5: Memoize rows + virtualization

**Scope**: Wrap `CommitRow` in `React.memo` with stable props. Add virtualization
(windowed rendering). Remove the 800-commit cap. Load full history.

**Files touched**:
- `src/renderer/src/components/CommitRow.tsx` — add `React.memo`, stable callbacks
- `src/renderer/src/components/CommitTable.tsx` — integrate virtualizer
- `src/renderer/src/store/useStore.ts` — remove `800` limit in `refreshAll`
- `src/main/services/gitService.ts` — raise/remove the default `getCommits` limit
- `package.json` — add `@tanstack/react-virtual` (if chosen) or implement
  `src/renderer/src/lib/useVirtualList.ts`

**Acceptance**: 10k+ commits scroll smoothly; only visible rows in DOM; day
headers and WIP row render correctly; selection and scrollIntoView work.

**Dependencies**: Chunk 4 (the grid table must exist before virtualizing it).

---

### Chunk 6: Diff view — close button + graph/diff toggle with snapshot

**Scope**: Keep the existing X (close + dismiss). Add a Graph/Diff toggle that
snapshots the diff state (file, commit, search) and restores it on return.
Pending-diff indicator in graph view. Toggle reachable from both views.

**Files touched**:
- `src/shared/types.ts` — add `EditorSnapshot` type
- `src/renderer/src/store/useStore.ts` — add `toggleEditorView` action,
  `pendingDiff` snapshot state
- `src/renderer/src/components/DiffEditor.tsx` — add toggle button (left of X)
- `src/renderer/src/components/Toolbar.tsx` — add diff toggle with pending indicator

**Acceptance**: X closes + clears; toggle switches + preserves; selecting a
different commit in graph view doesn't change the snapshot; pending indicator
shows in graph view; toggle reachable from both views.

**Dependencies**: Chunk 3 (so the Toolbar has a home for the toggle). Can be
done in parallel with chunks 4–5 if needed.

---

## Chunk Dependency Graph

```
Chunk 1 (crash fix + ErrorBoundary)
  └─→ Chunk 2 (extract modules)
        └─→ Chunk 4 (table rewrite) ──→ Chunk 5 (virtualization)
  └─→ Chunk 3 (sidebar state) ──→ Chunk 6 (diff toggle)
```

Chunks 1, 3 can start in parallel after chunk 1. Chunks 4–5 are sequential.
Chunk 6 depends on 3 but not on 4–5.

## Complexity Tracking

No constitution violations to justify.
