# Robust Main View — Structural Plan

Goal: make the main window's three-pane layout and the commit-history table
safe to modify without regressions, and bring it to the target behaviour:

- Center = full-width git history (table in columns, horizontally scrollable).
- Left sidebar = local/remote branches, stashes, tags.
- Right sidebar = changed files + stage (switches to commit details by selection).
- Resizable columns with smooth drag; graph column fixed; SHA column resizable.
- Resizable, persistable, collapsible sidebars with a non-invasive "closed" hint.
- Full history via virtualization.
- Diff view as an explicit full-width mode with a clear close button and a
  graph/diff toggle that preserves the pending diff.

This document is the input for a speckit `specify` run. It describes the
**structural changes** (what and why), not line-by-line implementation.

---

## Context — how the view is built today

- **Outer layout** (`src/renderer/src/App.tsx`): a flex row of
  `[Sidebar] [center] [4px handle] [right panel]`.
- **Left panel** (`Sidebar.tsx`): `sidebarOpen` defaults to `false`, width is a
  fixed `w-60`, not resizable.
- **Center** (`App.tsx:164`): one of two components chosen by `editorOpen`:
  `DiffEditor` or `CommitGraph`. Opening a file diff unmounts the history.
- **Right panel** (`App.tsx:174`): chosen by `selection.type`. `wip` shows
  `ChangesPanel`; a commit shows `DetailPanel`. Width is `rightWidth` in
  App-local state, not persisted.
- **Table** (`CommitGraph.tsx`): a single scroll container with a sticky
  header. Rows are flex boxes with inline widths. Column widths live in the
  store and are persisted per repo in the main process (`store.ts`).
- **Data** (`useStore.ts:658`): `refreshAll` reloads everything (800 commits,
  status, branches, …) after every mutation, on focus, and on the timer.

### Known critical aspects (code quality)

- `CommitGraph.tsx` (~1,080 lines) does too much: graph drawing, table layout,
  column resizing, ref badges, four context-menu builders, modal state, day
  headers. Splitting it is the prerequisite for changing the table safely.
- Header and rows are two separate layouts. The header has four extra 8px
  divider spans that the rows don't have — columns can drift out of alignment.
- Widths are computed in several places: `tableMinWidth` re-sums them, and each
  cell gets its own `style={{ width }}`.
- The SHA column can't be resized: the `date|sha` divider resizes `date`, not
  `sha`.
- Resize logic has bugs in `ColumnDivider`: the clamp assumes the right
  neighbour shrinks but `move()` only changes the left column; when Description
  is flex, `startWidth` falls back to `160`, so the first drag snaps.
- Dead code: `REFS_W` is unused; `columnWidthsLoaded` is written but never read.
- Duplicated patterns: `selectedRef`/`setSelRef` + `scrollIntoView` is copied
  in three components; `hexA` and `contrastText` both parse hex by hand.
- Layout state is split: `sidebarOpen`, `editorOpen`, `focusZone`,
  `columnWidths` are in the store, but the right-panel width is App-local.

### Known instabilities

- **Likely crash: conditional hooks in `RefLabels`** (`CommitGraph.tsx:511`).
  It returns early for 0 and 1 labels before calling `useRef`, `useState`,
  `useLayoutEffect`. When a commit goes from one label to two (a tag or new
  branch lands on it after a fetch), React sees a different hook count on the
  same instance and throws. There is no ErrorBoundary anywhere in the app, so
  the window would go blank.
- **Full re-render on every pointer move.** `resizeColumn` writes to global
  state on each `pointermove`. `CommitRow` isn't memoized, so every rendered
  row re-renders, and each runs a `clientHeight` measurement keyed on
  `columnWidths`. This is the main cause of drag jank.
- **No virtualization**: every commit row is mounted; history is capped at 800
  with no indicator.
- **Silent truncation**: history stops at 800 commits (`useStore.ts:658`); the
  `getCommits` default is 500.
- **Center unmounts on diff**: opening a diff loses scroll position, modal
  state, hover state.
- **Magic numbers**: the right-panel clamp (`innerWidth - 500`, min 360,
  default 504) ignores sidebar width. The window minimum (960) is in
  `main/index.ts:24`.
- **Regressions aren't caught automatically**: no tests, no ESLint config. The
  only checks are `tsc` and the electron-vite build.

### View management (as-is)

| Region | Chosen by | Notes |
|---|---|---|
| Left | `sidebarOpen` (default `false`) | Fixed 240px, not resizable |
| Center | `editorOpen` | History **or** diff, mutually exclusive |
| Right | `selection.type` | `wip` → Changes, otherwise commit details |
| Right width | App local state | Not persisted |
| Column widths | Store, persisted per repo | Reset to defaults on tab switch |

The center view is a side effect of many actions: clicking a file in
`ChangesPanel`, `navigateFiles`, `commit()` (closes it), `activateRepo`
(closes it).

---

## What stays

- Three-pane flex skeleton in `App.tsx`.
- Center swaps between `CommitGraph` and `DiffEditor` via `editorOpen`.
- Right panel switches by `selection.type` (unchanged).
- Per-repo column-width persistence in `main/services/store.ts` (unchanged).
- Store's git actions, IPC envelope, `simple-git` backend — untouched.
- Sticky-header-in-scroll-container pattern for the table.

---

## Structural changes

### A. Table rewrite (core of the difficulty)

**Problem**: header and rows are two independent flex layouts with dividers
only in the header, widths recomputed in multiple places, and a resize clamp
that fights the intended push semantics.

**Target**: one grid template string derived from one width array, shared by
header and rows. Put the resize handles in the header grid track. Use **push
semantics**: dragging a column grows it, the table's `min-width` grows with
it, and the container scrolls horizontally. No neighbour clamping. Graph
column is a fixed, non-resizable track. SHA gets a handle too.

Concretely in `CommitGraph.tsx`:

- Replace the per-cell `style={{ width }}` + separate `tableMinWidth` sum with
  a `gridTemplateColumns` built once from `columnWidths` (plus a
  `minmax(graphWidth, graphWidth)` track for the graph).
- Header and each `CommitRow` use the same `gridTemplateColumns` so they align
  by construction.
- `ColumnDivider` becomes a thin element placed in the header grid track; on
  drag it calls `resizeColumn(left, newWidth)` with **no** `maxLeft` clamp —
  only `minLeft`. The table's `minWidth` is the sum of all tracks, so
  horizontal scroll appears automatically.
- Add a divider after SHA so the last column is resizable (currently missing:
  the `date|sha` divider only resizes `date`).

**Acceptance**: header and every row column edge align to within 1px at all
widths; dragging any column (including SHA) grows the table and scrolls
horizontally; graph column width never changes; no snap on first drag of a
previously-flex column.

### B. Virtualization (full history)

**Problem**: every row is mounted; history is capped at 800 with no indicator.

**Target**: load full history (drop the `800`/`500` limit) and window the
rows. No virtualization lib is in `package.json` today; options:

- Add `react-window` (mature, tiny) or `@tanstack/react-virtual` (headless,
  works with the existing flex/grid rows).
- Or a small custom windowing hook keyed on `scrollTop` + `ROW_H`.

Either way the row component must be memoized with stable props (see D). The
day-group headers and the WIP row need to stay outside the virtualized window
(or be rendered as sticky overlays) since they break the uniform row height.

**Acceptance**: repos with 10k+ commits scroll smoothly; only visible rows
(+overscan) are in the DOM; day headers still render correctly; selection and
`scrollIntoView` still work.

### C. Sidebar layout state

**Problem**: `sidebarOpen` is a boolean in the store, the right-panel width is
App-local, neither is resizable, and the right width isn't persisted.

**Target**: move all layout state into the store and persist it. Suggested
home: global UI prefs alongside `theme`/`autoFetchMinutes` in `lib/prefs.ts`,
since pane widths are a window preference, not a repo one.

New store fields:

```
sidebarOpen: boolean        // left, default true
sidebarWidth: number        // left, persisted
rightOpen: boolean          // default true
rightWidth: number          // persisted
```

- Both sidebars resizable via a drag handle (the right handle already exists
  at `App.tsx:167`; add a matching one on the left edge of the sidebar).
- **Max-width constraint**: enforce
  `sidebarWidth + rightWidth <= innerWidth - centerMin` (e.g. `centerMin =
  480`). Clamp on drag and on window resize so the center can never disappear.
- **Collapse buttons** on the top row (Toolbar already has the left toggle at
  `Toolbar.tsx:65-71`; add a right toggle). When collapsed, render a thin
  sliver (e.g. 8–12px) with a subtle icon/chevron as the non-invasive visual
  reminder, and hide the full pane. Clicking the sliver or the toolbar button
  re-expands to the last persisted width.

**Acceptance**: both sidebars open by default; widths persist across restarts;
dragging a handle resizes the pane and clamps so the center stays ≥ `centerMin`;
collapsing shows a thin sliver with an icon; re-expanding restores the previous
width; window resize re-clamps if needed.

### D. Memoize rows + fix the hooks bug

- `CommitRow` must be wrapped in `React.memo` with a stable `onClick`/`onMenu`
  (currently new closures each render at `CommitGraph.tsx:190-201`). This is
  required for virtualization to help and removes the per-`pointermove`
  re-render storm.
- Fix `RefLabels` (`CommitGraph.tsx:511`): move the `useRef`/`useState`/
  `useLayoutEffect` calls above the early returns, or restructure so hooks
  always run. This is a latent crash with no ErrorBoundary to catch it.

**Acceptance**: dragging a column divider does not re-render rows that didn't
change; a commit going from 1 ref label to 2 no longer crashes the renderer.

### E. Split `CommitGraph.tsx`

~1,080 lines doing graph drawing, table layout, resize, badges, four menu
builders, and modal state. Before the table rewrite, extract at minimum:

- `CommitTable` (header + grid + dividers + virtualized body)
- `CommitRow` (memoized)
- `GraphCell` (the SVG per row)
- `RefBadges` (`BranchBadge`, `TagBadge`, `StashBadge`, `HeadBadge`,
  `ExpandableBadge`, `RefLabels`)
- `commitMenus.ts` (`buildMenu`, `buildBranchMenu`, `buildTagMenu`,
  `buildStashMenu`)

This is what makes A and B safe to do without regressions. Pure refactor, no
behaviour change.

**Acceptance**: `npm run build` green; no visible UI change after the split.

### F. Diff view: close button + graph/diff toggle

Today there is one `X` in the diff toolbar (`DiffEditor.tsx:83-85`) that calls
`closeEditor()` (sets `editorOpen: false`). That's the "close completely"
action. We add a second control that flips between graph and diff **without
losing the diff** — a view toggle, not a close.

#### Proposed layout (right side of the diff toolbar)

```
[spacer] [ViewToggle inline|split] [Graph|Diff switch] [X]
```

1. **Keep the X** (close completely) — exactly as is, top-right. Calls
   `closeEditor()`. This is the "I'm done, back to graph-only" action. No
   shape change needed; the X is the universal "close" affordance and it's
   already wired to `Esc`.

2. **Add a Graph/Diff toggle button** to its left — a single `IconButton` pair
   or a segmented control that:
   - When in diff view: shows a "Graph" icon (e.g. `GitCommit` or `Network` from
     lucide) with title "Back to graph (keep diff open)". Clicking it sets
     `editorOpen: false` **but keeps the file selection intact**, so clicking
     back reopens the same diff.
   - When in graph view: shows a "Diff" icon (e.g. `FileDiff`) with title "Open
     diff view". Clicking it sets `editorOpen: true`.

   The key difference from the X: the toggle preserves the implicit "diff is
   pending" state; the X is the explicit discard.

#### Why two buttons instead of one

- **X = close + dismiss**: closes the diff view and signals "I'm done with
  this file." Semantically a destructive/terminal action.
- **Toggle = switch context**: you're going to look at the graph for a moment
  and come back. The diff stays the active file context.

Conflating them is what makes the current single button feel like you lose
your place when you just want to peek at the graph.

#### Store change needed (minimal)

`closeEditor()` already does the right thing for the X (`useStore.ts:286`): it
clears `editorOpen` and the editor search state. For the toggle we need a
sibling action that **only** flips `editorOpen` without clearing search:

```ts
toggleEditorView: () => set((s) => ({ editorOpen: !s.editorOpen }))
```

The X keeps using `closeEditor()` (which also clears
`editorSearchOpen`/`editorSearchQuery`); the toggle uses `toggleEditorView()`
(preserves them). This is the only store change — one line.

#### Visual reminder when diff is "pending" but graph is shown

When the user clicks the toggle to go back to graph, the diff isn't gone —
it's just hidden. To make this discoverable, the Graph/Diff toggle button in
the **graph view** shows a subtle accent dot or a slightly highlighted state
when a diff is pending behind it, so the user knows "there's a diff waiting."
A small `bg-app-accent/15` ring or a 4px dot in the corner of the icon is
enough — non-invasive, same pattern as the sidebar collapse slivers.

#### Where the toggle lives

The toggle is visible in **both** views so it's a true switch, not a one-way
door:

- In diff view: the toggle sits in the diff toolbar (left of the X),
  icon = "Graph".
- In graph view: the toggle sits in the **Toolbar** (`Toolbar.tsx`), next to
  the sidebar toggles, icon = "Diff", with the pending-diff indicator when
  applicable.

This means the toggle is always reachable from whichever view is active, and
the X remains only in the diff view (closing is a diff-view-only action — you
can't "close" the graph).

**Acceptance**: X closes the diff and clears its search; the toggle flips
graph/diff and preserves the selected file + search state; in graph view the
toggle shows a pending-diff indicator when a diff is waiting; the toggle is
reachable from both views.

### G. Safety net

- Add an `ErrorBoundary` around the center pane (and ideally each pane) so a
  render crash doesn't blank the window. There is none today.
- Add at least one test for the column-width model (pure function: widths →
  grid template → sum) since that's where regressions recur. There are no
  tests at all currently.

**Acceptance**: a thrown error in a row renders a fallback instead of a blank
window; the column-width model has a unit test covering default, pinned, and
edge widths.

---

## Suggested implementation order (lowest risk first)

1. **Fix `RefLabels` hooks bug + add ErrorBoundary** (standalone, prevents the
   blank-window crash).
2. **Extract `commitMenus.ts` and `RefBadges` from `CommitGraph.tsx`** (pure
   refactor, no behaviour change).
3. **Move sidebar/right width + open state into the store** with persistence,
   max-width clamp, and collapse slivers (touches `App.tsx`, `Toolbar.tsx`,
   `useStore.ts`, `prefs.ts`).
4. **Rewrite the table as a single grid** with push-semantics resize and a SHA
   divider (the core change; depends on 2).
5. **Memoize `CommitRow`, then add virtualization** and drop the 800-cap
   (depends on 4).
6. **Add the diff close button + graph/diff toggle** (trivial store addition;
   can go anywhere, but logically after 3 so the Toolbar toggle has a home).

Steps 1–3 are independently shippable and each reduces the regression surface.
Step 4 is the one that needs the most care and review.

---

## Out of scope (explicit)

- Changing the right panel's content model (still switches by
  `selection.type`).
- Changing the IPC envelope, git service, or store's git actions.
- Rebranding or theming changes.
- The exact virtualization library choice (decide during implementation).
- The exact `centerMin` value (suggest 480, confirm during implementation).
- Whether pane widths persist globally or per-repo (suggest global UI prefs;
  confirm during implementation).
