# Quickstart: Sidebar Reference Name Visibility

**Date**: 2026-10-01 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Prerequisites

- Node.js (modern LTS) and npm installed
- System `git` on PATH
- A repository with at least a few long, slash-separated branch and/or tag names (so truncation occurs in the sidebar)

## Setup

```bash
# from repo root
npm install
npm run dev
```

This launches the Electron app in development mode. Open a repository via the welcome screen (Open / Clone / Initialize).

## Validation Scenarios

### V1: Truncated leaf shows full name on hover (P1)

1. Open a repository that has a branch or tag whose name is long enough to be truncated in the sidebar (e.g. `feature/epic-1/taskA-with-a-very-long-name`).
2. In the sidebar, navigate to the section (Local branches / Remote branches / Tags) containing the long name. Expand folders until the truncated leaf is visible — the label should end with `…` (CSS truncation).
3. Hover the mouse pointer over the truncated leaf row.
4. **Expected**: After the standard OS tooltip delay, a native tooltip appears showing the complete reference name (e.g. `feature/epic-1/taskA-with-a-very-long-name`, or `origin/feature/...` for remote branches).
5. Move the pointer away.
6. **Expected**: The tooltip disappears promptly.

### V2: Non-truncated leaf shows no tooltip (P1)

1. In the same repository, find a short branch or tag whose label fits entirely in its row (e.g. `main`, `v1.0.0`).
2. Hover the pointer over that row.
3. **Expected**: No tooltip appears (the `title` is not set because the text fits).

### V3: Truncated folder shows full path on hover (P2)

1. In a repository with a deeply nested branch (e.g. `feature/epic-1/long-folder-segment-name/taskA`), collapse the parent folder so the long intermediate folder is visible and truncated.
2. Hover the pointer over the truncated folder row.
3. **Expected**: A native tooltip appears showing the full folder path (e.g. `feature/epic-1/long-folder-segment-name`).
4. Move the pointer away.
5. **Expected**: The tooltip disappears.

### V4: Consistency across all three sections (P3)

1. Ensure the repository has truncated names in Local branches, Remote branches, and Tags.
2. Hover a truncated row in each section.
3. **Expected**: The native tooltip appears with the same behaviour (same trigger, same delay, same dismissal) in all three sections.

### V5: Existing interactions unaffected (regression check)

1. Double-click a branch leaf → checkout should fire as before.
2. Right-click a branch leaf → context menu should open as before.
3. Click a folder chevron → expand/collapse should work as before.
4. Collapse a folder that contains the current branch → the "current branch inside" indicator (accent dot) should still appear; hovering the dot should still show "Current branch is inside".
5. **Expected**: All existing interactions work exactly as before the change.

### V6: No tooltip on section headers

1. Hover the pointer over a section header ("Local branches", "Remote branches", "Tags").
2. **Expected**: No name-reveal tooltip appears (section headers are excluded).

### V7: Build passes

```bash
npm run build
```

**Expected**: Typecheck + electron-vite build complete with no errors.

## References

- [Data model](./data-model.md) — entities and the `useTruncatedTitle` hook interface
- [Research](./research.md) — decisions on overflow measurement, existing title unification, and full name/path content
- [Spec](./spec.md) — functional requirements and acceptance scenarios
