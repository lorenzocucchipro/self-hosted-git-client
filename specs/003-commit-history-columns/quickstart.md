# Quickstart Validation Guide

Prerequisites, setup, and runnable scenarios to validate the Commit History Column
Layout feature end-to-end. Run these after implementing the tasks in `tasks.md`.

## Prerequisites

- Node.js and npm installed.
- A git repository with at least ~20 commits, including:
  - some long commit messages (50+ chars),
  - at least one branch with a long name,
  - commits by authors with long names.
- The app builds green: `npm run build`.

## Setup

```bash
npm install
npm run dev
```

Open the test repository via the app's "Open repository" dialog.

## Validation Scenarios

### V1 — Column content stays contained at narrow widths (US1, FR-001/FR-002)

1. Resize the app window so it is too narrow to show all six columns at once.
2. Scroll the commit history fully to the right (Date and SHA columns visible).
3. **Expected**: Every cell's content is contained within its column — no text spills
   into a neighboring column or escapes the table edge. Long descriptions and author
   names are truncated (with ellipsis) inside their own column.

### V2 — Truncated-cell tooltip (US1, FR-012)

1. Narrow the Description column (see V3) so a long commit message is truncated.
2. Hover over the truncated description cell.
3. **Expected**: A native tooltip appears showing the full commit message.
4. Hover over a cell whose content fits entirely.
5. **Expected**: No tooltip appears.

### V3 — Resize columns by dragging (US2, FR-004/FR-005/FR-006)

1. Position the pointer over the divider between the Description and Author headers.
2. **Expected**: The cursor changes to a resize indicator.
3. Drag the divider to the right.
4. **Expected**: Description widens and Author narrows, live; content re-truncates.
5. Keep dragging to shrink Author to its minimum.
6. **Expected**: Author stops at its minimum width and does not collapse further.
7. Repeat for the Refs/Description, Author/Date, and Date/SHA dividers.

### V4 — Horizontal scroll after resize (US2, FR-003)

1. Widen columns so the total exceeds the visible area.
2. Scroll horizontally.
3. **Expected**: All columns render correctly contained at every scroll position
   (per V1).

### V5 — Widths persist across restart (US2, FR-007)

1. Resize one or more columns.
2. Close the app.
3. Reopen the app and open the same repository.
4. **Expected**: The previously chosen widths are restored.
5. Open a *different* repository that has never been customized.
6. **Expected**: That repo shows the default widths.

### V6 — Reset column widths to defaults (US2, FR-013)

1. With customized widths visible, right-click in the commit history area.
2. Choose "Reset column widths to defaults".
3. **Expected**: All data columns snap back to their default widths immediately.
4. Close and reopen the app, open the same repo.
5. **Expected**: The defaults are still shown (the saved custom widths were cleared).

### V7 — Header separation and alignment (US3, FR-008/FR-009/FR-010)

1. Look at the header row at the default window width.
2. **Expected**: "Description" and "Author" (and every other pair) are visibly
   separated; no two names merge into one.
3. Observe the Date and SHA headers.
4. **Expected**: They are right-aligned, matching their right-aligned column bodies.
5. Resize columns and scroll horizontally.
6. **Expected**: Headers stay positioned over their own column bodies at all times.

### V8 — Widths stable across data changes (FR-007)

1. Resize columns to a custom layout.
2. Trigger a refresh (e.g. fetch, or make a new commit from "Working changes").
3. **Expected**: The chosen widths remain stable; no reset or jump.

## Quality Gate

```bash
npm run build
```

**Expected**: typecheck + electron-vite build pass with no errors.

## References

- Spec: [spec.md](../spec.md)
- IPC contract: [contracts/ipc.md](../contracts/ipc.md)
- Data model: [data-model.md](../data-model.md)
