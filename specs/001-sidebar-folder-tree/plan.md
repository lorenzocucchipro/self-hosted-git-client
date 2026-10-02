# Implementation Plan: Sidebar Folder Tree for Branches and Tags

**Branch**: `001-sidebar-folder-tree` | **Date**: 2026-10-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-sidebar-folder-tree/spec.md`

## Summary

Convert the sidebar's "Local branches", "Remote branches" and "Tags" sections from flat lists into collapsible folder trees. Every `/` in a ref name becomes a folder level; the final segment is a selectable leaf. Folder expand/collapse state persists per repository across app restarts. The change is entirely renderer-side: the existing `branches`/`tags` arrays already in the Zustand store are transformed into a tree structure in a new pure helper module, then rendered by a new `RefTree` component that reuses the existing `BranchRow` for branch leaves and a new lightweight `TagLeaf` for tags. No new IPC channels, no new dependencies, no backend changes.

## Technical Context

**Language/Version**: TypeScript 5 (strict), React 18

**Primary Dependencies**: Electron 33, electron-vite (Vite 5), Tailwind CSS 3, Zustand, lucide-react (icons already in use), simple-git (backend — unchanged by this feature)

**Storage**: Renderer-side `localStorage` for per-repository expand/collapse state (same mechanism as `src/renderer/src/lib/prefs.ts`). No database, no files.

**Testing**: Manual validation via `npm run dev` against a repository with nested branch/tag names. No unit-test framework is currently configured in the project; validation is by build + live run (per AGENTS.md quality gate).

**Target Platform**: macOS, Windows, Linux (Electron desktop app)

**Project Type**: desktop-app

**Performance Goals**: Tree build + render for 200+ slash-separated refs in under 1 second; expand/collapse toggle with no perceptible lag (SC-002, FR-013).

**Constraints**: Must use Tailwind semantic tokens (`app-*`) for all colors; must not hardcode hex; must not add new dependencies; must not change the IPC contract or backend services; build (`npm run build`) must pass.

**Scale/Scope**: 3 sidebar sections transformed; 1 new pure helper module (`refTree.ts`); 1 new React component (`RefTree.tsx`); 1 new persistence helper (extend `prefs.ts` or a sibling); edits to `Sidebar.tsx` to swap the flat lists for the tree. No backend changes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Local-First & Private | ✅ Pass | Pure renderer-side transformation; no network calls, no telemetry, no data leaves the host. Per-repo expand/collapse state stored in `localStorage` on the user's machine. |
| II. Type Safety & Contract-Driven IPC | ✅ Pass | No new IPC channels required — the `branches` and `tags` arrays are already fetched by `refreshAll()` and held in the Zustand store. The tree is built from typed `Branch[]`/`Tag[]` and produces a typed `RefTreeNode[]`. |
| III. Build Must Be Green | ✅ Pass | `npm run build` (typecheck + electron-vite build) will be run before commit; strict types maintained. |
| IV. Single Source of Truth for Identity & Styling | ✅ Pass | All colors via Tailwind semantic tokens (`app-*`); icons from `lucide-react` (already a dependency); no hardcoded hex. |
| V. Simplicity & Minimal Dependencies | ✅ Pass | No new dependencies. Tree building is pure TypeScript over the existing data. Reuses `BranchRow` and existing `Section` wrapper. |

**Gate result**: PASS — no violations, no complexity tracking entries needed.

## Project Structure

### Documentation (this feature)

```text
specs/001-sidebar-folder-tree/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (renderer component contract)
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/renderer/src/
├── components/
│   ├── Sidebar.tsx          # EDITED — swap flat lists for <RefTree> in 3 sections
│   └── RefTree.tsx          # NEW — collapsible folder tree renderer (folders + leaves)
├── lib/
│   ├── refTree.ts          # NEW — pure buildRefTree() + tree-walk helpers
│   └── prefs.ts            # EDITED — add per-repo expand/collapse state load/save
└── store/
    └── useStore.ts          # EDITED — (optional) expose repo path for prefs keying
```

**Structure Decision**: Single-project (existing repo layout). All changes are confined to the renderer; no main-process, preload, or shared-type changes because the feature reuses data already in the store.

## Complexity Tracking

> No constitution violations to justify — table left empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| — | — | — |
