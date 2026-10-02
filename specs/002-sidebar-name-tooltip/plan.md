# Implementation Plan: Sidebar Reference Name Visibility

**Branch**: `002-sidebar-name-tooltip` | **Date**: 2026-10-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-sidebar-name-tooltip/spec.md`

## Summary

Add a native `title` tooltip to sidebar folder-tree rows (leaves and folders) so users can read the full reference name or folder path when the visible label is truncated. The `title` is set only when the row's text genuinely overflows its container (measured at hover time), so short names produce no tooltip. The mechanism is the same native `title` attribute already used by the fetch button and other UI elements — no custom tooltip component. The change is entirely renderer-side: a small reusable hook measures overflow on `mouseenter` and conditionally sets the `title`; the existing `RefTree` and `BranchRow` components are updated to use it. No new IPC channels, no new dependencies, no backend changes.

## Technical Context

**Language/Version**: TypeScript 5 (strict), React 18

**Primary Dependencies**: Electron 33, electron-vite (Vite 5), Tailwind CSS 3, Zustand, lucide-react (icons already in use). No new dependencies.

**Storage**: N/A — no persistence needed. Truncation is measured at hover time from the live DOM; no state is stored.

**Testing**: Manual validation via `npm run dev` against a repository with long branch/tag names. No unit-test framework is currently configured in the project; validation is by build + live run (per AGENTS.md quality gate).

**Target Platform**: macOS, Windows, Linux (Electron desktop app)

**Project Type**: desktop-app

**Performance Goals**: Overflow measurement on `mouseenter` must complete in under 1 frame (~16 ms) so the tooltip appears with no perceptible delay beyond the native OS tooltip delay. The measurement is a single `scrollWidth > clientWidth` comparison per row.

**Constraints**: Must use the native `title` attribute (no custom tooltip component); must not add new dependencies; must not change the IPC contract or backend services; must not modify existing `title` attributes on non-sidebar elements; build (`npm run build`) must pass; must use Tailwind semantic tokens for any styling (though the native tooltip itself is OS-styled).

**Scale/Scope**: 1 new reusable hook (`useTruncatedTitle` or similar); edits to `RefTree.tsx` (folder rows + tag leaves) and `BranchRow.tsx` (branch leaves) to use the hook. No backend changes, no new components beyond the hook.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Local-First & Private | ✅ Pass | Pure renderer-side DOM measurement; no network calls, no telemetry, no data leaves the host. |
| II. Type Safety & Contract-Driven IPC | ✅ Pass | No new IPC channels required — the feature reads only from the already-fetched `Branch`/`Tag` data in the Zustand store and measures rendered DOM elements. No changes to `src/shared/ipc.ts` or `src/main/ipc.ts`. |
| III. Build Must Be Green | ✅ Pass | `npm run build` (typecheck + electron-vite build) will be run before commit; strict types maintained. |
| IV. Single Source of Truth for Identity & Styling | ✅ Pass | The native tooltip is OS-styled, so no application colors are involved. The hook itself introduces no visual styling. Existing Tailwind semantic tokens on the rows are unchanged. |
| V. Simplicity & Minimal Dependencies | ✅ Pass | No new dependencies. The hook uses standard React APIs (`useRef`, `useCallback`, `onMouseEnter`) and a single DOM measurement (`scrollWidth > clientWidth`). Reuses the native `title` attribute already in use elsewhere. |

**Gate result**: PASS — no violations, no complexity tracking entries needed.

## Project Structure

### Documentation (this feature)

```text
specs/002-sidebar-name-tooltip/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
src/renderer/src/
├── components/
│   ├── RefTree.tsx       # Folder rows + tag leaves: add conditional title
│   └── BranchRow.tsx     # Branch leaves: replace static title with conditional title
└── lib/
    └── useTruncatedTitle.ts  # NEW: reusable hook for overflow-gated title
```

**Structure Decision**: Single-project layout (existing). The only new file is a small hook in `src/renderer/src/lib/` alongside the existing `refTree.ts` and `prefs.ts` helpers. The two component files are edited in place. No new directories, no backend changes.

## Complexity Tracking

> No constitution violations — this section is intentionally empty.
