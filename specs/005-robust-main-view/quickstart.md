# Quickstart Validation: Robust Main View

**Date**: 2026-10-13

This guide describes how to validate each chunk end-to-end. Each chunk
can be validated independently after implementation.

## Prerequisites

- Node.js (modern LTS)
- npm (lockfile-based)
- A git repository with at least 100 commits for basic testing
- A git repository with 10,000+ commits for virtualization testing (chunk 5)
- The app built and running: `npm run dev`

## Chunk 1: Fix RefLabels crash + ErrorBoundary

**Goal**: No blank-window crashes.

1. Open a repository in the app.
2. Find a commit with exactly one ref label (e.g. HEAD on a branch with no
   tags or remote).
3. Create a new tag on that commit (right-click → Create tag here).
4. **Expected**: The commit row re-renders with two labels. No crash, no
   blank window.
5. If a rendering error is forced (e.g. temporarily break a component),
   **Expected**: An error fallback message appears in that pane, not a
   blank window.

## Chunk 2: Extract commitMenus + RefBadges

**Goal**: No visible change after refactor.

1. Open a repository.
2. Verify all context menus work (right-click a commit, a branch label, a
   tag, a stash).
3. Verify branch badges, tag badges, stash badges, HEAD badge render
   identically to before.
4. Run `npm run build` — must be green.

## Chunk 3: Sidebar layout state

**Goal**: Resizable, collapsible, persisted sidebars.

1. Open a repository — both sidebars should be visible by default.
2. Drag the left sidebar's right edge — it resizes; the center shrinks.
3. Drag the right sidebar's left edge — it resizes; the center shrinks.
4. Drag a sidebar so the center would disappear — it stops at a maximum
   width; the center is still visible (≥ ~480px).
5. Click the left sidebar toggle in the toolbar — the sidebar collapses;
   a thin sliver with an icon remains.
6. Click the sliver — the sidebar re-expands to its previous width.
7. Repeat 5–6 for the right sidebar.
8. Resize the window smaller — sidebars re-clamp if needed.
9. Restart the app — sidebar widths and open/closed state are restored.

## Chunk 4: Table rewrite (grid + push-semantics resize)

**Goal**: Aligned columns, all resizable, smooth drag, horizontal scroll.

1. Open a repository — the table renders with all 6 columns.
2. Verify the header labels and row content are aligned (Graph, Refs,
   Description, Author, Date, SHA).
3. Drag the Refs|Description divider to the right — Refs grows, the table
   scrolls horizontally, other columns don't move.
4. Drag the Description|Author divider — Description grows (or pins from flex
   on first drag without snapping).
5. Drag the Author|Date divider — Author grows.
6. Drag the Date|SHA divider — Date grows.
7. Drag the SHA divider (right edge of SHA column) — SHA grows. **This was
   not possible before.**
8. Try to drag the Graph column — no divider exists; it doesn't resize.
9. Drag any divider rapidly — no lag, stutter, or flicker.
10. Restart the app — column widths are restored.
11. Run `npm run build` — must be green.
12. Run `npx vitest run` — the `columnLayout.test.ts` test passes.

## Chunk 5: Memoize rows + virtualization

**Goal**: Full history, smooth scrolling, only visible rows in DOM.

1. Open a repository with 10,000+ commits.
2. Verify the full history is loaded (scroll to the bottom — the oldest
   commit is visible, not capped at 800).
3. Scroll rapidly — no lag, no blank gaps, no stutter.
4. Scroll to a day boundary — the day-group header renders correctly.
5. If the repo has uncommitted changes — the "Uncommitted changes" row
   appears at the top and is selectable.
6. Open DevTools → Elements — verify only a subset of rows are in the DOM
   (not all 10,000).
7. Select a commit, use arrow keys to navigate — selection and
   `scrollIntoView` work correctly.

## Chunk 6: Diff view close + graph/diff toggle

**Goal**: X closes completely; toggle preserves and restores.

1. Click a file in the right panel — the diff opens full-width in the center.
2. Verify the diff toolbar has: [file info] [inline/split toggle] [Graph/Diff
   toggle] [X].
3. Click the X — the diff closes, the graph is shown, no pending indicator.
4. Click a file again to reopen the diff.
5. Type a search query in the diff search bar (Cmd/Ctrl+F).
6. Click the Graph/Diff toggle — the graph is shown. The toolbar shows a
   pending-diff indicator (accent dot on the toggle).
7. Select a different commit in the graph — the right panel updates, but
   the pending indicator stays (the snapshot is unchanged).
8. Click the toggle again — the diff reopens showing the **same file** with
   the **same search query** intact.
9. Click the X — the diff closes, the pending indicator is gone.
10. Switch repository tabs while a diff is pending — the pending diff is
    cleared (the file belongs to the previous repo).

## Full Integration Test (after all chunks)

1. Open a large repository (10k+ commits) with both sidebars visible.
2. Resize columns, resize sidebars, collapse/expand sidebars.
3. Scroll through history — smooth, all commits present.
4. Open a diff, toggle to graph, select a different commit, toggle back —
   same diff restored.
5. Close the diff with X, create a tag on a commit with one label — no crash.
6. Restart the app — all state restored (column widths, sidebar widths,
   open/closed state).
7. `npm run build` green.
