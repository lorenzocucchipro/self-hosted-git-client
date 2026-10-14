# Implementation Plan: Sidebar Tooltips & Refs Column Overlay Fix

**Branch**: `006-sidebar-refs-tooltip-fix` | **Date**: 2026-10-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-sidebar-refs-tooltip-fix/spec.md`

## Summary

Add native `title` tooltips to all sidebar text elements (left and right) using the proven `useTruncatedTitle` hook, ensuring tooltips appear only when text is genuinely truncated. Fix the Refs column hover overlay clipping issue by removing `overflow-hidden` and adding `min-w-0 relative` to the Refs cell container in CommitRow.tsx, preserving the colored badge overlay for graph readability. The feature reuses existing infrastructure (useTruncatedTitle hook, RefTree, BranchRow) with no new dependencies or IPC changes.

## Technical Context

**Language/Version**: TypeScript 5 (strict), React 18

**Primary Dependencies**: Electron 33, electron-vite (Vite 5), Tailwind CSS 3, Zustand, lucide-react (icons already in use), simple-git (backend — unchanged by this feature)

**Storage**: N/A — no persistence needed. Tooltips are measured at hover time from the live DOM.

**Testing**: Manual validation via `npm run dev` against repositories with long branch names, file paths, and remote URLs. No unit-test framework is currently configured in the project; validation is by build + live run (per AGENTS.md quality gate).

**Target Platform**: macOS, Windows, Linux (Electron desktop app)

**Project Type**: desktop-app

**Performance Goals**: Tooltip measurement on `mouseenter` must complete in under 1 frame (~16 ms) so the tooltip appears with no perceptible delay beyond the native OS tooltip delay. The measurement is a single `scrollWidth > clientWidth` comparison per element.

**Constraints**: Must use Tailwind semantic tokens (`app-*`) for all colors; must not hardcode hex; must not add new dependencies; must not change the IPC contract or backend services; build (`npm run build`) must pass.

**Scale/Scope**: 8 sidebar elements needing the `useTruncatedTitle` hook added, 2 components needing static `title` attributes replaced with the hook, 1 CSS change in CommitRow.tsx (remove `overflow-hidden`, add `min-w-0 relative`). No backend changes, no new IPC channels.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Local-First & Private | ✅ Pass | Pure renderer-side DOM measurement and CSS changes; no network calls, no telemetry, no data leaves the host. |
| II. Type Safety & Contract-Driven IPC | ✅ Pass | No new IPC channels required — the feature uses only existing Zustand store and React hooks. No changes to `src/shared/ipc.ts` or `src/main/ipc.ts`. |
| III. Build Must Be Green | ✅ Pass | `npm run build` (typecheck + electron-vite build) will be run before commit; strict types maintained. |
| IV. Single Source of Truth for Identity & Styling | ✅ Pass | All colors via Tailwind semantic tokens (`app-*`); icons from `lucide-react` (already a dependency); no hardcoded hex. CSS change uses only standard Tailwind utilities. |
| V. Simplicity & Minimal Dependencies | ✅ Pass | No new dependencies. Reuses `useTruncatedTitle` hook (already proven in RefTree.tsx and BranchRow.tsx). CSS-only change to CommitRow.tsx. |

**Gate result**: PASS — no violations, no complexity tracking entries needed.

## Project Structure

### Documentation (this feature)

```text
specs/006-sidebar-refs-tooltip-fix/
├── plan.md              # This file
├── research.md          # Phase 0 output (none needed — no unknowns)
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (UI contracts)
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/renderer/src/
├── components/
│   ├── Sidebar.tsx              # EDITED — add useTruncatedTitle to 4 elements
│   ├── CommitRow.tsx            # EDITED — remove overflow-hidden, add min-w-0 relative
│   ├── ChangesPanel.tsx         # EDITED — replace static title with hook on 2 element types
│   └── DetailPanel.tsx          # EDITED — add useTruncatedTitle to 2 elements
└── lib/
    └── useTruncatedTitle.ts     # EXISTING — no changes (already proven)
```

**Structure Decision**: Single-project (existing repo layout). All changes are confined to the renderer; no main-process, preload, or shared-type changes because the feature reuses data already in the store and uses only DOM measurement.

## Complexity Tracking

> No constitution violations to justify — table left empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| — | — | — |

---

# Phase 0: Research

**Status**: ✅ COMPLETE — No unknowns to research.

The specification and pre-spec analysis have already resolved all technical decisions:
- `useTruncatedTitle` hook is proven and reusable (used in RefTree.tsx and BranchRow.tsx)
- CSS fix (remove `overflow-hidden`, add `min-w-0 relative`) is straightforward and low-risk
- No new dependencies, no IPC changes, no data model changes
- Constitution compliance verified

**Output**: No research.md needed — all clarifications already resolved in the specification.

---

# Phase 1: Design & Contracts

## Data Model

No new entities or data structures are introduced. The feature operates entirely on existing DOM elements and the `useTruncatedTitle` hook, which measures existing text content.

**Existing entities used**:
- **Tooltip**: Native HTML `title` attribute, set conditionally by `useTruncatedTitle` hook
- **Hover Overlay**: Absolutely-positioned DOM element in `ExpandableBadge` and `RefLabels` (existing)
- **Refs Column**: Grid cell in CommitRow.tsx (existing)
- **useTruncatedTitle Hook**: React hook that measures `scrollWidth > clientWidth` (existing)

**No new fields, relationships, or state transitions** — the feature is purely presentational.

## UI Contracts

### Sidebar Tooltip Contract

**Elements receiving `useTruncatedTitle` hook**:

| Component | Element | Location | Behavior |
|-----------|---------|----------|----------|
| Sidebar.tsx | "Working changes" text | Line 48 | Show tooltip only when truncated |
| Sidebar.tsx (Section) | Section headers | Line 191 | Show tooltip on all section headers (Local branches, Remote branches, Remotes, Tags, Stashes) |
| Sidebar.tsx | Remote name | Line 75 | Show tooltip when truncated |
| Sidebar.tsx | Remote fetch URL | Line 76 | Show tooltip when truncated |
| Sidebar.tsx (StashRow) | Stash message | Line 166 | Show tooltip when truncated |
| ChangesPanel.tsx | File path (Unstaged) | Line 223 | Replace static `title` with hook for conditional behavior |
| ChangesPanel.tsx | File path (Staged) | Line 223 | Replace static `title` with hook for conditional behavior |
| ChangesPanel.tsx | Conflict file path | Line 63 | Replace static `title` with hook for conditional behavior |
| DetailPanel.tsx (FileRow) | File path | Line 228 | Show tooltip when truncated |
| DetailPanel.tsx | Author/email line | Lines 99-100 | Show tooltip when truncated |

**Tooltip Behavior**:
- Triggered by native OS on `title` attribute
- Appears within ~100ms of mouse hover (standard OS delay)
- Shows full text when element's `scrollWidth > clientWidth`
- No tooltip when text fits entirely in container

### Refs Column Overlay Contract

**CSS Change in CommitRow.tsx (line 62)**:

```tsx
// BEFORE:
<div className="overflow-hidden flex items-center gap-1 py-1 pl-1 pr-2">

// AFTER:
<div className="min-w-0 relative flex items-center gap-1 py-1 pl-1 pr-2">
```

**Overlay Behavior**:
- `ExpandableBadge` overlay (z-30) shows full badge with lane color, icon, solid background on hover
- `RefLabels` "+X" popup (z-40) shows all badges on hover
- Both overlays extend rightward into the Description column without being clipped
- Overlays have `shadow-lg` and solid `bg-app-panel-2` to read as floating popups
- Grid layout remains perfectly aligned between header and rows

**Safety Guarantees**:
- `min-w-0` prevents grid track expansion
- In-flow badges self-limit via `max-w-[150px]` and inner `truncate`
- `RefLabels` collapses multiple badges via `useLayoutEffect` (runs before paint)
- No layout shifts or visual regressions

## Quickstart Validation Guide

### Prerequisites

- Node.js (modern LTS)
- System `git` on PATH
- A test repository with:
  - Long branch names (e.g., `feature/very-long-branch-name-here`)
  - Long file paths (e.g., `src/components/deeply/nested/path/Component.tsx`)
  - Remotes with long URLs
  - Stashes with long messages

### Setup

```bash
cd /Users/lorenzo.cucchi/workspace/neverontime/self-hosted-git-client
npm install
npm run build  # Verify build passes
npm run dev    # Start dev server
```

### Validation Scenarios

#### Scenario 1: Sidebar Tooltips on Truncated Text

1. **Open the app** and select a repository
2. **Narrow the left sidebar** by dragging the right edge until text truncates
3. **Hover over each element**:
   - "Working changes" label → tooltip shows "Working changes"
   - Section headers (Local branches, Remote branches, Remotes, Tags, Stashes) → tooltip shows full header text
   - Remote name → tooltip shows full remote name
   - Remote fetch URL → tooltip shows full URL
   - Stash message → tooltip shows full message
4. **Verify no tooltip** appears on short text that fits entirely
5. **Expand the sidebar** → tooltips disappear (text no longer truncated)

**Expected outcome**: All truncated text shows tooltips; no tooltip on text that fits.

#### Scenario 2: Refs Column Overlay Not Clipped

1. **Open the app** and select a repository with long branch names
2. **Navigate to the commit history** (center pane)
3. **Narrow the Refs column** by dragging the column divider left until branch names truncate
4. **Hover over a truncated branch badge** → full badge overlay appears with:
   - Lane color (from graph)
   - Branch icon
   - Solid background
   - Extending into the Description column
   - Shadow indicating floating popup
5. **Verify no clipping** — overlay is fully visible, not cut off by column boundary
6. **Hover over the "+X" chip** (if multiple refs) → full set of badges appears as floating popup
7. **Move mouse away** → overlay disappears, Description column content fully visible again
8. **Resize Refs column to various widths** (80px, 150px, 300px) → overlay always appears, no layout shifts

**Expected outcome**: Refs overlay is visible, readable, and floating on top of adjacent columns without clipping.

#### Scenario 3: Right Sidebar Tooltips (ChangesPanel & DetailPanel)

1. **Open the app** and select a repository with uncommitted changes
2. **Narrow the right sidebar** until file paths truncate
3. **In ChangesPanel** (Unstaged/Staged sections):
   - Hover over truncated file path → tooltip shows full path
   - Verify no tooltip on short paths that fit
4. **Select a commit** to view DetailPanel
5. **In DetailPanel**:
   - Hover over truncated file path → tooltip shows full path
   - Hover over truncated author name → tooltip shows full author and email
   - Verify no tooltip on text that fits

**Expected outcome**: All right sidebar text elements show tooltips only when truncated.

#### Scenario 4: No Visual Regressions

1. **Run the app** with the changes
2. **Verify grid alignment** between commit history header and rows at various window widths
3. **Verify no layout shifts** when hovering over Refs badges
4. **Verify no color changes** or styling regressions in any sidebar or table element
5. **Run `npm run build`** → build passes with no errors or warnings

**Expected outcome**: No visual regressions, build passes, grid layout remains perfectly aligned.

### Validation Checklist

- [ ] Sidebar tooltips appear on all truncated text elements
- [ ] No tooltips on text that fits entirely
- [ ] Refs column overlay is visible and not clipped
- [ ] Overlay extends into Description column without layout shifts
- [ ] Right sidebar tooltips work in ChangesPanel and DetailPanel
- [ ] Grid layout remains aligned at all window widths
- [ ] No visual regressions or styling changes
- [ ] `npm run build` passes with no errors

---

**Next Step**: Run `/speckit-tasks` to generate the actionable task list for implementation.
