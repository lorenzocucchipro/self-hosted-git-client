# Implementation Plan: Sidebar & History Table UI Polish

**Branch**: `004-sidebar-history-ui-polish` | **Date**: 2026-10-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-sidebar-history-ui-polish/spec.md`

## Summary

Fix three UI weaknesses left over from specs 002/003: (1) the sidebar folder tree
only indents the first level — nested folders look like siblings; (2) the
commit-history table shows a white gap and text overflow when horizontally
scrolled at small window sizes; (3) column-resize dividers exist but are
invisible/discoverable, header labels lack truncation tooltips, and the Graph
column must auto-size to the rendered graph rather than being user-resizable.

## Technical Context

**Language/Version**: TypeScript 5.7 (strict), React 18, Electron 33

**Primary Dependencies**: simple-git (git backend), zustand (state), tailwindcss
(styling), lucide-react (icons), electron-vite (bundler). No new dependencies
required.

**Storage**: Main-process `state.json` (Electron `userData`) via
`src/main/services/store.ts` — already holds `repoColumnWidths: Record<string,
ColumnWidths>`. Renderer `localStorage` via `src/renderer/src/lib/prefs.ts` —
holds sidebar expanded-folders state and user prefs.

**Testing**: No test framework configured; verification is `npm run build`
(typecheck + electron-vite build) and live `npm run dev` validation.

**Target Platform**: macOS, Windows, Linux (Electron desktop app).

**Project Type**: desktop-app.

**Performance Goals**: 60 fps during column drag-resize and sidebar
expand/collapse; no layout thrash from overflow measurements (hover-triggered
only, O(1) per row).

**Constraints**: Local-first, no network calls; branding tokens only (no
hardcoded colors); build must be green; no new dependencies.

**Scale/Scope**: Single renderer feature touching 3 components
(`RefTree.tsx`, `BranchRow.tsx`, `CommitGraph.tsx`) and the shared
`ColumnWidths` type. No IPC changes needed — column-width persistence already
exists from spec 003.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|------|
| I. Local-First & Private | ✅ Pass | No network calls; all state local. |
| II. Type Safety & IPC | ✅ Pass | No new IPC channels; `ColumnWidths` type already in `shared/types.ts`. |
| III. Build Must Be Green | ✅ Pass | `npm run build` is the gate; no `any` introduced. |
| IV. Single Source of Truth (branding) | ✅ Pass | All colors via Tailwind semantic tokens; graph colors from `branding.graphColors`. |
| V. Simplicity & Minimal Dependencies | ✅ Pass | No new packages; reuses existing `useTruncatedTitle` hook, `OverflowTitle`, `ColumnDivider`. |

No violations. No complexity tracking needed.

## Project Structure

### Documentation (this feature)

```text
specs/004-sidebar-history-ui-polish/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (UI contracts)
└── tasks.md             # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
src/
├── shared/
│   └── types.ts                    # ColumnWidths type (already exists; no change needed)
├── renderer/src/
│   ├── components/
│   │   ├── RefTree.tsx              # Sidebar indentation fix (FR-001, FR-002)
│   │   ├── BranchRow.tsx            # Sidebar leaf alignment (FR-002)
│   │   └── CommitGraph.tsx         # Table overflow fix, divider visibility,
│   │                                # header tooltips (FR-003..FR-010)
│   ├── lib/
│   │   └── useTruncatedTitle.ts     # Reused for header tooltips (FR-009)
│   └── store/
│       └── useStore.ts             # Column-width defaults (FR-008; already
│                                    # has resizeColumn/loadColumnWidths)
└── main/services/
    └── store.ts                    # Column-width persistence (already exists)
```

**Structure Decision**: Single-project (Option 1). All changes are in the
existing renderer components and the shared types. No new files, no new
directories, no IPC changes.

## Complexity Tracking

> No constitution violations — section intentionally empty.
