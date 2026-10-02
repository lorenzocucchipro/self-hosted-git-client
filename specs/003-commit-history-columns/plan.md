# Implementation Plan: Commit History Column Layout

**Branch**: `003-commit-history-columns` | **Date**: 2026-10-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-commit-history-columns/spec.md`

## Summary

Fix the broken rendering of the commit history table (content overflowing column and table
boundaries at narrow window widths), add drag-to-resize for the five data columns (Refs,
Description, Author, Date, SHA) with per-repository persisted widths, add a native tooltip on
truncated cells (reusing the sidebar's `title` mechanism from spec 002), and fix header
separation/alignment. A "Reset column widths to defaults" entry is added to the history's
context menu.

The technical approach keeps all layout state in the renderer (Zustand store) and persists
per-repository column widths via the existing main-process `store` service (a small JSON file
in the Electron userData directory), accessed through the typed IPC envelope. No new
dependencies are introduced.

## Technical Context

**Language/Version**: TypeScript 5 (strict), bundled by electron-vite (Vite 5).

**Primary Dependencies**: Electron 33, React 18, Zustand (single store), Tailwind CSS 3,
`simple-git` (git backend — not touched by this feature). No new dependencies required.

**Storage**: Per-repository column widths are persisted by the existing main-process
`store` service (`src/main/services/store.ts`) as a small JSON file in the Electron
`userData` directory, alongside the existing `state.json`. A new keyed map
`repoColumnWidths: Record<repoPath, ColumnWidths>` is added to the persisted state. No
database, no external file format.

**Testing**: Manual validation via `npm run dev` (the project has no automated test suite).
The `quickstart.md` guide lists the runnable scenarios. `npm run build` (typecheck +
electron-vite build) is the quality gate.

**Target Platform**: macOS, Windows, Linux desktop (Electron).

**Project Type**: Desktop app (Electron + React).

**Performance Goals**: Dragging a column divider resizes live with no perceptible lag
(60 fps target for the drag gesture); the existing virtualized row rendering is unchanged so
scroll performance is unaffected.

**Constraints**: Offline-capable (local-first). No new npm dependencies. No hardcoded
colors — only Tailwind semantic tokens (`app-*`). English-only UI. Build must stay green
(`npm run build`).

**Scale/Scope**: Single component (`CommitGraph.tsx`) plus its header, the Zustand store,
the IPC layer (4 touch points), and the main `store` service. No new screens.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Local-First and Private by Design | PASS | Column widths are stored locally in the Electron userData directory; no network calls. |
| II. Type Safety and Contract-Driven IPC | PASS | New persistence IPC follows the 4-layer contract (shared → main → preload → renderer `call()`). |
| III. Build Must Be Green | PASS | `npm run build` is the gate; no `any` escapes. |
| IV. Single Source of Truth for Identity and Styling | PASS | No new colors; only layout behaviors. Existing `app-*` tokens reused. |
| V. Simplicity and Minimal Dependencies | PASS | No new dependencies. Reuses existing `store` service and `title` tooltip mechanism. |

No violations. No complexity tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/003-commit-history-columns/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── ipc.md           # New IPC contract for column-width persistence
└── tasks.md             # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
src/
├── shared/
│   ├── ipc.ts            # +2 channels: getColumnWidths, setColumnWidths
│   └── types.ts          # +ColumnWidths type
├── main/
│   ├── ipc.ts            # +2 handlers delegating to store service
│   └── services/
│       └── store.ts      # +getColumnWidths / setColumnWidths (per-repo map)
├── preload/
│   └── index.ts          # +2 typed api methods
└── renderer/
    ├── store/
    │   └── useStore.ts    # +columnWidths state, load/save/reset actions
    └── components/
        └── CommitGraph.tsx # header + rows use dynamic widths, drag dividers,
                             # title tooltips on truncated cells, reset menu entry
```

**Structure Decision**: Single-project (Option 1). The feature touches the existing
`src/` layout only; no new top-level directories.

## Complexity Tracking

> No constitution violations — table left empty.
