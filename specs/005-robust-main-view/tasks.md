# Tasks: Robust Main View

**Input**: Design documents from `/specs/005-robust-main-view/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: One test task is included for the column-layout pure function (SC-008 requires it). No other test tasks — the build (`npm run build`) plus manual validation via `npm run dev` remains the primary quality gate.

**Organization**: Tasks are grouped by chunk (from plan.md), in execution order. Each chunk maps to a user story from spec.md. Chunks are independently shippable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Single project: `src/` at repository root
- Renderer components: `src/renderer/src/components/`
- Renderer store: `src/renderer/src/store/`
- Renderer lib: `src/renderer/src/lib/`
- Shared types: `src/shared/`
- Main services: `src/main/services/`

---

## Phase 1: Setup

**Purpose**: Add test infrastructure for the column-layout unit test (SC-008).

- [x] T001 Install vitest as a dev dependency and add `vitest.config.ts` at repository root. Configure it to use the existing `tsconfig.web.json` for path aliases (`@shared/*`, `@renderer/*`). Add `"test": "vitest run"` to `package.json` scripts.

---

## Phase 2: Chunk 1 — Fix RefLabels crash + ErrorBoundary (US5, P1)

**Goal**: Prevent the blank-window crash caused by conditional hooks in `RefLabels`, and add per-pane error boundaries so no rendering error blanks the window.

**Independent Test**: Create a tag on a commit with one ref label — no crash. Temporarily break a component — error fallback shows instead of blank window.

**Chunk dependency**: None. Can be done first, in isolation.

- [x] T002 [P] [US5] Fix conditional hooks in `RefLabels` in `src/renderer/src/components/CommitGraph.tsx`: move `useRef`, `useState`, and `useLayoutEffect` calls above the early returns for 0 and 1 labels, so hooks always run in the same order regardless of label count. The early returns for 0/1 labels must happen AFTER all hooks have been called.
- [x] T003 [P] [US5] Create `src/renderer/src/components/ErrorBoundary.tsx`: a class component extending React's error boundary pattern. Props: `children: ReactNode`, `fallback: ReactNode | ((error: Error) => ReactNode)`. Catches render errors in the subtree and shows the fallback. Uses `app-*` Tailwind tokens for the fallback UI (centered message with `text-app-muted` on `bg-app-bg`).
- [x] T004 [US5] Wrap each pane in `ErrorBoundary` in `src/renderer/src/App.tsx`: wrap the left sidebar (`<Sidebar />`), the center pane (`<CommitGraph />` / `<DiffEditor />`), and the right panel (`<ChangesPanel />` / `<DetailPanel />`) each in their own `<ErrorBoundary>` with a simple fallback message. This ensures a crash in one pane doesn't hide the others.

**Checkpoint**: Chunk 1 complete. No blank-window crashes. Commit and PR.

---

## Phase 3: Chunk 2 — Extract commitMenus + RefBadges (prerequisite for Chunk 4)

**Goal**: Pure refactor. Reduce `CommitGraph.tsx` from ~1,080 lines to ~400 by extracting menu builders and badge components into separate modules. No behavior change.

**Independent Test**: All context menus and badges work identically. `npm run build` green.

**Chunk dependency**: Chunk 1 (so the extracted `RefLabels` is already fixed).

- [x] T005 [P] Extract context menu builders from `src/renderer/src/components/CommitGraph.tsx` into `src/renderer/src/components/commitMenus.ts`: move `buildMenu`, `buildBranchMenu`, `buildTagMenu`, `buildStashMenu`, and `BranchFromCommit`. Export them as named functions. `CommitGraph.tsx` imports them. No logic changes — pure move.
- [x] T006 [P] Extract ref badge components from `src/renderer/src/components/CommitGraph.tsx` into `src/renderer/src/components/RefBadges.tsx`: move `RefLabels`, `BranchBadge`, `TagBadge`, `StashBadge`, `HeadBadge`, `ExpandableBadge`, `groupBranchRefs`, `hexA`, `contrastText`, and the `BranchGroup` interface. Export them as named components/functions. `CommitGraph.tsx` imports them. No logic changes — pure move. Keep the fixed `RefLabels` from T002 (hooks above early returns).
- [x] T007 Verify `npm run build` passes after the extraction. No visible UI change.

**Checkpoint**: Chunk 2 complete. `CommitGraph.tsx` is now ~400 lines. Commit and PR.

---

## Phase 4: Chunk 3 — Sidebar layout state: resizable, collapsible, persisted (US2, P1)

**Goal**: Both sidebars visible by default, resizable via drag handle, collapsible via toolbar button with a thin sliver hint, persisted across restarts, max-width clamp to protect the center.

**Independent Test**: Drag both sidebar handles, collapse/expand via toolbar, verify slivers, restart and verify persistence, drag to max and verify center is still visible.

**Chunk dependency**: Chunk 1 (easier after chunk 2 but not strictly required).

- [x] T008 [P] [US2] Extend the `Prefs` interface in `src/renderer/src/lib/prefs.ts` with four new fields: `sidebarOpen: boolean` (default `true`), `sidebarWidth: number` (default `240`), `rightOpen: boolean` (default `true`), `rightWidth: number` (default `504`). Update `loadPrefs()` to read them with type validation and `savePrefs()` to include them. Update `DEFAULTS` constant.
- [x] T009 [US2] Add sidebar layout state and actions to `src/renderer/src/store/useStore.ts`: add `sidebarOpen`, `sidebarWidth`, `rightOpen`, `rightWidth` to `AppState` and initial state (load from `loadPrefs()`). Also add `lastSidebarWidth: number` and `lastRightWidth: number` to `AppState` (in-memory only, not persisted — used by collapse/restore in T015). Add actions: `setSidebarWidth(w: number)`, `setRightWidth(w: number)`, `toggleSidebar()`, `toggleRightSidebar()`. Each action updates state and calls `savePrefs()` with the full prefs object. Replace existing `toggleSidebar` action (currently just flips `sidebarOpen`) with the new persisted-width-aware version.
- [x] T010 [US2] Replace local `rightWidth` state with store state in `src/renderer/src/App.tsx`: remove `const [rightWidth, setRightWidth] = useState(504)` and the `dragging` ref + mousemove/mouseup effect. Read `rightWidth`, `rightOpen`, `sidebarOpen`, `sidebarWidth` from the store. Use `setRightWidth` from the store for the drag handle. Apply a max-width clamp in the drag handler: `rightWidth` must be ≤ `window.innerWidth - sidebarWidth - 480` (centerMin) and ≥ 360. Also add a left sidebar resize handle (mirrors the existing right handle at line 167) that calls `setSidebarWidth` with a clamp: `sidebarWidth` must be ≤ `window.innerWidth - rightWidth - 480` and ≥ 180.
- [x] T011 [US2] Add a window resize listener in `src/renderer/src/App.tsx` that re-clamps both sidebar widths when the window shrinks: if `sidebarWidth + rightWidth > innerWidth - 480`, proportionally reduce both (or clamp the one that was last resized). This satisfies FR-017.
- [x] T012 [P] [US2] Update `src/renderer/src/components/Sidebar.tsx`: replace the hardcoded `w-60` class with `style={{ width: sidebarWidth }}` read from the store. Keep `shrink-0`. No other content change.
- [x] T013 [US2] Add collapse slivers in `src/renderer/src/App.tsx`: when `sidebarOpen` is false, render a thin sliver (8–12px wide, `bg-app-panel border-r border-app-border`) with a `PanelLeft` icon (lucide) that calls `toggleSidebar()` on click. When `rightOpen` is false, render a matching sliver on the right with a `PanelRight` icon that calls `toggleRightSidebar()`. The slivers are non-invasive: subtle, just an icon, no text.
- [x] T014 [P] [US2] Add right sidebar toggle button in `src/renderer/src/components/Toolbar.tsx`: mirror the existing left sidebar toggle (lines 65–71). Add a `PanelRight` icon button with title "Hide/Show right sidebar" that calls `toggleRightSidebar` from the store. Place it at the far right of the toolbar (after the branch name display).
- [x] T015 [US2] When a sidebar is collapsed via the toolbar button, store the current width before setting `open` to false, so re-expanding restores it. In `toggleSidebar`/`toggleRightSidebar` in `src/renderer/src/store/useStore.ts`: if currently open, save `lastSidebarWidth = sidebarWidth` (or `lastRightWidth = rightWidth`) then set `open = false`; if currently closed, set `open = true` and restore `width = lastSidebarWidth` (or `lastRightWidth`, clamped to current max if window shrank). The `lastSidebarWidth` and `lastRightWidth` fields are already in `AppState` from T009.

**Checkpoint**: Chunk 3 complete. Both sidebars resizable, collapsible, persisted. Commit and PR.

---

## Phase 5: Chunk 4 — Table rewrite: single grid, push-semantics resize, SHA divider (US1, P1)

**Goal**: Header and rows share one CSS grid template; all columns (including SHA) resizable; graph column fixed; push semantics (table grows, scrolls horizontally); smooth drag without row re-renders. This is the highest-risk chunk.

**Independent Test**: Drag every column divider (including SHA), verify alignment, verify horizontal scroll, verify graph doesn't resize, verify smooth drag, restart and verify persistence. Run `npx vitest run` for the layout test.

**Chunk dependency**: Chunk 2 (so `CommitGraph.tsx` is already split and easier to rewrite).

- [x] T016 [P] [US1] Create `src/renderer/src/lib/columnLayout.ts`: a pure function `buildGridLayout(columnWidths: ColumnWidths, graphWidth: number): { gridTemplateColumns: string; tableMinWidth: number }`. The grid template is a space-separated list of CSS track values: graph track = `minmax(${graphWidth}px, ${graphWidth}px)` (fixed); each resizable column = `${width}px`; description = `1fr` when `null` (flex) or `${width}px` when pinned. `tableMinWidth` = sum of all fixed track widths + `MIN_COLUMN_WIDTHS.description` (120) for the flex case. Pure: no side effects, no DOM access.
- [x] T017 [P] [US1] Create `src/renderer/src/lib/columnLayout.test.ts`: unit test for `buildGridLayout` covering: (a) default widths (description = null → flex), (b) all columns pinned, (c) description pinned, (d) minimum widths, (e) graph track is always fixed regardless of other widths. Verify `gridTemplateColumns` string and `tableMinWidth` number match expected values. Run with `npx vitest run`.
- [x] T018 [P] [US1] Create `src/renderer/src/components/ColumnDivider.tsx`: a push-semantics resize handle. Props: `column: keyof ColumnWidths`, `currentWidth: number`, `minWidth: number`, `onResize: (width: number) => void`. On `pointerdown`: capture pointer, record start X and start width. On `pointermove`: compute `newWidth = Math.max(minWidth, startWidth + delta)` — NO max-clamp (push semantics). Call `onResize(newWidth)`. On `pointerup`: release pointer capture. Visual: 8px wide, transparent, with a visible 1px line (`bg-app-muted/40`) that highlights on hover (`group-hover:bg-app-accent`). If the column is `description` and `currentWidth` is null (flex), the parent pins it to the measured DOM width before the drag starts (the parent handles this, not the divider).
- [x] T019 [P] [US1] Create `src/renderer/src/components/GraphCell.tsx`: extract the SVG graph rendering from `CommitRow` in `CommitGraph.tsx`. Props: `row: GraphRow`, `commit: Commit`, `graphWidth: number`, `rowHeight: number`. Renders the SVG with passing lanes, incoming/outgoing edges, and the node (circle or stash rect). Pure SVG, no state, no effects. Uses the existing `x()` helper, `R`, `DIM` constants.
- [x] T020 [P] [US1] Create `src/renderer/src/components/CommitRow.tsx`: extract the row component from `CommitGraph.tsx`. Props per `data-model.md` → `CommitRow` contract. Uses `GraphCell` for the SVG, `RefBadges` for the refs column, and inline divs for description/author/date/SHA. Uses the same `gridTemplateColumns` as the header (applied via a CSS class or inline style on the row). Includes the `useLayoutEffect` for measuring row height (for multi-line ref labels) keyed on `commit.refs` and `graphWidth`. Wrap in `React.memo` with default shallow comparison: `export const MemoizedCommitRow = React.memo(CommitRow)`. This satisfies FR-009 (no re-render of unchanged rows during column resize). Ensure all callback props (`onClick`, `onMenu`, `onBranchMenu`, `onTagMenu`) are stable — they must be `useCallback`-wrapped in the parent (`CommitTable`, T021).
- [x] T021 [US1] Create `src/renderer/src/components/CommitTable.tsx`: the grid-based table. Renders a sticky header and the body. Both header and body use `buildGridLayout(columnWidths, graphWidth)` for `gridTemplateColumns`. The container has `overflow-auto` and `min-width: tableMinWidth` so horizontal scroll appears. Header has `ColumnHeader` cells + `ColumnDivider` handles for each resizable column (including after SHA — this is the new divider). The body maps `layout.rows` to `CommitRow` components. Includes the WIP row (dirty state) and day-group headers (`DayHeader`). Context menu for column reset is on the header.
- [x] T022 [US1] Update `src/renderer/src/components/CommitGraph.tsx` to delegate to `CommitTable`: remove the inline header, row rendering, `ColumnHeader`, `ColumnDivider` (old version), and `tableMinWidth` computation. `CommitGraph` now computes `layout`, `graphWidth`, `byHash`, and passes them to `CommitTable` along with `columnWidths`, `selection`, `searchMatches`, `status`, `stashes`, `currentBranch`, `detached`, and stable callbacks (`useCallback` for `onSelectCommit`, `onSelectWip`, `onResizeColumn`, `onResetColumns`). The context menu (`useContextMenu`) and modal state stay in `CommitGraph` — they're passed down.
- [x] T023 [US1] Handle the Description flex-to-pinned transition: when the user first drags the Description divider and `columnWidths.description` is `null`, measure the current Description cell width from the DOM (via a ref on the header cell) and call `resizeColumn('description', measuredWidth + delta)` so the drag starts from the visible position, not a hardcoded fallback. This fixes the snap bug. Implement this in `CommitTable.tsx` where the `ColumnDivider` for Description is rendered.
- [x] T024 [US1] Verify `npm run build` passes. Run `npx vitest run` — `columnLayout.test.ts` passes. Manually validate via `npm run dev`: all columns align, SHA is resizable, graph is fixed, push semantics work, horizontal scroll appears, drag is smooth, restart restores widths.

**Checkpoint**: Chunk 4 complete. The table is a single grid, all columns resizable, push semantics. Commit and PR.

---

## Phase 6: Chunk 5 — Memoize rows + virtualization (US3, P2)

**Goal**: Wrap `CommitRow` in `React.memo` with stable props. Add virtualization (windowed rendering). Remove the 800-commit cap. Load full history.

**Independent Test**: Open a repo with 10k+ commits, verify full history, smooth scroll, only visible rows in DOM, day headers and WIP row render correctly.

**Chunk dependency**: Chunk 4 (the grid table must exist before virtualizing it).

- [x] T025 [P] [US3] Install `@tanstack/react-virtual` (v3) as a dependency in `package.json`. Verify it is MIT-licensed, maintained, and published >7 days ago (constitution principle V). If vetting fails, implement `src/renderer/src/lib/useVirtualList.ts` as a custom windowing hook per research.md fallback. Run `npm install @tanstack/react-virtual`.
- [x] T026 [US3] Integrate `@tanstack/react-virtual`'s `useVirtualizer` into `src/renderer/src/components/CommitTable.tsx`: replace the direct `.map()` over `layout.rows` with a virtualized list. The virtualizer uses the scroll container's ref and `ROW_H` (34px) as the estimated row height. Render only `virtualizer.getVirtualItems()` with absolute positioning (`position: absolute`, `transform: translateY(start)`). Overscan: 10 rows. Day-group headers and the WIP row must render correctly within the virtualized list — they are either sticky overlays or rendered as special items in the virtual list with their own height.
- [x] T027 [US3] Remove the 800-commit cap in `src/renderer/src/store/useStore.ts`: change `call(api.getCommits(p, 800))` in `refreshAll` (line ~658) to `call(api.getCommits(p, 100000))` (explicit high limit, not relying on the default). This must run AFTER T028 raises the gitService default.
- [x] T028 [US3] Update `src/main/services/gitService.ts`: change the `getCommits` default limit from `500` to `100000` so full history is loaded. The `-n` flag in the `git log` raw call (line ~224) should use this limit. This must run BEFORE T027 removes the store-level cap.
- [x] T029 [US3] Verify `npm run build` passes. Manually validate via `npm run dev` with a 10k+ commit repo: full history loaded, smooth scroll, only visible rows in DOM (check DevTools Elements), day headers correct, WIP row correct, selection and arrow-key navigation work, `scrollIntoView` works.

**Checkpoint**: Chunk 5 complete. Full history, virtualized, smooth scrolling. Commit and PR.

---

## Phase 7: Chunk 6 — Diff view: close button + graph/diff toggle with snapshot (US4, P2)

**Goal**: Keep the existing X (close + dismiss). Add a Graph/Diff toggle that snapshots the diff state (file, commit, search) and restores it on return. Pending-diff indicator in graph view. Toggle reachable from both views.

**Independent Test**: Open diff, toggle to graph, select different commit, verify pending indicator, toggle back, verify same file + search state, click X, verify cleared.

**Chunk dependency**: Chunk 3 (so the Toolbar has a home for the toggle).

- [x] T030 [P] [US4] Add `EditorSnapshot` type to `src/shared/types.ts`: `interface EditorSnapshot { filePath: string; commitHash: string; editorSearchOpen: boolean; editorSearchQuery: string }`. This is the snapshot of the diff view state when the user toggles to graph.
- [x] T031 [US4] Add `pendingDiff` state and `toggleEditorView` action to `src/renderer/src/store/useStore.ts`: add `pendingDiff: EditorSnapshot | null` (default `null`) to `AppState` and initial state. Add `toggleEditorView: () => void` action: if `editorOpen` is true, snapshot `{ filePath: selectedFilePath, commitHash: selection?.type === 'commit' ? selection.hash : 'wip', editorSearchOpen, editorSearchQuery }` into `pendingDiff`, then set `editorOpen = false`. If `editorOpen` is false and `pendingDiff` is not null, restore: set `editorOpen = true`, `selectedFilePath = pendingDiff.filePath`, `editorSearchOpen = pendingDiff.editorSearchOpen`, `editorSearchQuery = pendingDiff.editorSearchQuery`, then clear `pendingDiff = null`. Update `closeEditor()` to also clear `pendingDiff`. Update `activateRepo()` to also clear `pendingDiff`.
- [x] T032 [P] [US4] Add Graph/Diff toggle button to `src/renderer/src/components/DiffEditor.tsx`: in the diff toolbar (line ~79–85), add a toggle button to the LEFT of the existing X button. Use a `GitCommit` icon (lucide) with title "Back to graph (keep diff open)". The button calls `toggleEditorView()` from the store. The existing X button stays as-is (calls `closeEditor()`).
- [x] T033 [US4] Add Graph/Diff toggle button to `src/renderer/src/components/Toolbar.tsx`: add a toggle button near the sidebar toggles. When `editorOpen` is false (graph view), show a `FileDiff` icon with title "Open diff view" that calls `toggleEditorView()`. When `pendingDiff` is not null and `editorOpen` is false, show a subtle pending-diff indicator: a small accent dot (4px, `bg-app-accent`, rounded-full) in the corner of the toggle button. This satisfies FR-024.
- [x] T034 [US4] Verify `npm run build` passes. Manually validate via `npm run dev`: open a file diff, type a search query, toggle to graph (verify pending indicator), select a different commit (verify right panel updates but indicator stays), toggle back (verify same file + search query), click X (verify cleared), switch repo tabs while pending (verify cleared).

**Checkpoint**: Chunk 6 complete. Diff toggle with snapshot semantics. Commit and PR.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup across all chunks.

- [x] T035 [P] Remove dead code from `src/renderer/src/components/CommitGraph.tsx`: the unused `REFS_W` constant (line 20) and any other dead code discovered during the refactor.
- [x] T036 [P] Remove `columnWidthsLoaded` from `src/renderer/src/store/useStore.ts` if it is still unused (written but never read — verify it's not consumed anywhere before removing).
- [x] T037 Run `npm run build` — must be green (typecheck + electron-vite build).
- [x] T038 Run `npx vitest run` — `columnLayout.test.ts` must pass.
- [x] T039 Run the full integration test from `specs/005-robust-main-view/quickstart.md` → "Full Integration Test" section: open a large repo, resize columns, resize sidebars, collapse/expand, scroll history, open diff, toggle, close, create tag on single-label commit, restart and verify state restored.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — can start immediately.
- **Phase 2 (Chunk 1 / US5)**: No dependencies — can start after Phase 1 (or in parallel with it).
- **Phase 3 (Chunk 2)**: Depends on Phase 2 (Chunk 1) — the extracted `RefLabels` must be fixed first.
- **Phase 4 (Chunk 3 / US2)**: Depends on Phase 2 (Chunk 1) — can run in PARALLEL with Phase 3 (Chunk 2).
- **Phase 5 (Chunk 4 / US1)**: Depends on Phase 3 (Chunk 2) — the table rewrite needs the extracted modules.
- **Phase 6 (Chunk 5 / US3)**: Depends on Phase 5 (Chunk 4) — virtualization needs the grid table.
- **Phase 7 (Chunk 6 / US4)**: Depends on Phase 4 (Chunk 3) — the toggle needs the Toolbar changes from chunk 3.
- **Phase 8 (Polish)**: Depends on all chunks being complete.

### Chunk Dependency Graph

```
Phase 1 (Setup: vitest)
  └─→ Phase 2 (Chunk 1: crash fix + ErrorBoundary)
        ├─→ Phase 3 (Chunk 2: extract modules) ──→ Phase 5 (Chunk 4: table rewrite) ──→ Phase 6 (Chunk 5: virtualization)
        └─→ Phase 4 (Chunk 3: sidebar state) ──→ Phase 7 (Chunk 6: diff toggle)
```

### Parallel Opportunities

- **T002, T003** (Chunk 1): Different files — can run in parallel.
- **T005, T006** (Chunk 2): Different files — can run in parallel.
- **T008, T012, T014** (Chunk 3): Different files — can run in parallel (but T009, T010 depend on T008).
- **T016, T017, T018, T019, T020** (Chunk 4): Different files — can run in parallel (but T021 depends on all of them).
- **T025** (Chunk 5): Independent install — can run in parallel with T026.
- **T030, T032** (Chunk 6): Different files — can run in parallel (but T031, T033 depend on T030).
- **T035, T036** (Polish): Different files — can run in parallel.

### Within Each Chunk

- Tasks within a chunk should be done in ID order unless marked [P].
- Each chunk is independently shippable: build green → commit → PR → merge.
- Stop at any checkpoint to validate the chunk independently.

---

## Parallel Example: Chunk 4 (Table Rewrite)

```bash
# Launch all independent file creations together:
Task: "Create columnLayout.ts in src/renderer/src/lib/columnLayout.ts"
Task: "Create columnLayout.test.ts in src/renderer/src/lib/columnLayout.test.ts"
Task: "Create ColumnDivider.tsx in src/renderer/src/components/ColumnDivider.tsx"
Task: "Create GraphCell.tsx in src/renderer/src/components/GraphCell.tsx"
Task: "Create CommitRow.tsx in src/renderer/src/components/CommitRow.tsx"

# Then the integration task (depends on all above):
Task: "Create CommitTable.tsx in src/renderer/src/components/CommitTable.tsx"
Task: "Update CommitGraph.tsx to delegate to CommitTable"
```

---

## Implementation Strategy

### MVP First (Chunks 1 + 3)

1. Complete Phase 1: Setup (vitest).
2. Complete Phase 2: Chunk 1 (crash fix + ErrorBoundary) — prevents the worst bug.
3. Complete Phase 4: Chunk 3 (sidebar layout state) — visible improvement, low risk.
4. **STOP and VALIDATE**: No crashes, sidebars work. Deploy/demo if ready.

### Incremental Delivery

1. Chunk 1 → crash fix (safety).
2. Chunk 3 → sidebar improvements (visible value).
3. Chunk 2 → refactor (prepares for table rewrite).
4. Chunk 4 → table rewrite (core fix, highest risk).
5. Chunk 5 → virtualization (performance).
6. Chunk 6 → diff toggle (UX polish).
7. Polish → final validation.

Each chunk adds value without breaking previous chunks. Each can be committed and PR'd separately.

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks in the same chunk.
- [Story] label maps task to specific user story for traceability.
- Each chunk is independently completable, testable, and shippable.
- Run `npm run build` after each chunk — must be green before committing.
- Run `npx vitest run` after chunk 4 — `columnLayout.test.ts` must pass.
- T027 (remove store cap) must run AFTER T028 (raise gitService default) — see task descriptions.
- Commit after each chunk (not after each task) — one cohesive change per commit, Conventional Commits.
- Never commit to `main` directly — work on a branch, open a PR.
- Use `app-*` Tailwind tokens for all new UI — never hardcode hex colors.
