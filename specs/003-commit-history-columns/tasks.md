---

description: "Task list for Commit History Column Layout feature implementation"
---

# Tasks: Commit History Column Layout

**Input**: Design documents from `/specs/003-commit-history-columns/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: No automated tests requested — the project has no test suite. Validation is manual via `npm run dev` and the scenarios in `quickstart.md`. `npm run build` is the quality gate.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/` at repository root (Electron app: `src/shared/`, `src/main/`, `src/preload/`, `src/renderer/`)

---

## Phase 1: Setup (Shared Types & Constants)

**Purpose**: Define the shared type and constants needed across user stories.

- [x] T001 Add `ColumnWidths` interface to `src/shared/types.ts` — fields: `refs: number`, `description: number | null` (null = flex fill), `author: number`, `date: number`, `sha: number`. Every field MUST be a positive integer (px); `description` may be null.
- [x] T002 [P] Add `DEFAULT_COLUMN_WIDTHS` and `MIN_COLUMN_WIDTHS` constant objects to `src/renderer/src/components/CommitGraph.tsx` — defaults: refs=200, description=null (flex), author=160, date=80, sha=64; minimums: refs=80, description=120, author=100, date=60, sha=50. Each minimum MUST be enforced so a column can never collapse below it.

---

## Phase 2: User Story 1 — Column content always stays contained (Priority: P1) 🎯 MVP

**Goal**: Fix the broken rendering where cell content overflows column and table boundaries at narrow window widths and after horizontal scrolling. Add a native tooltip on truncated cells.

**Independent Test**: Open a repository, resize the window so it is too narrow to display all columns, scroll fully to the right, and confirm every cell's content is contained within its column with no overflow. Hover a truncated cell and confirm a native tooltip shows the full value.

### Implementation for User Story 1

- [x] T003 [US1] Fix the header row layout in `src/renderer/src/components/CommitGraph.tsx` — add `shrink-0` to all fixed-width header spans (Author `w-40`, Date `w-20`, SHA `w-16`) so they don't compress; ensure the Description `flex-1` span has `min-w-0` so it truncates instead of pushing siblings. Add `overflow-hidden` to the header container so no header text escapes the table edge at any width.
- [x] T004 [US1] Fix the commit row cell layout in `src/renderer/src/components/CommitGraph.tsx` (the `CommitRow` component) — ensure every cell with a fixed width (`w-40`, `w-20`, `w-16`) has `shrink-0` and `overflow-hidden`; ensure the Description cell (`flex-1 min-w-0`) truncates its content with `truncate` (it already has `truncate` on the inner span — verify the container clips). Add `overflow-hidden` to the row container so content never escapes the row boundary at any scroll position.
- [x] T005 [US1] Add native `title` tooltip on truncated cells in `src/renderer/src/components/CommitGraph.tsx` — for the Description, Author, and Refs cells, measure `scrollWidth > clientWidth` on the cell element (via a ref + `useLayoutEffect` or an `onMouseEnter` check) and set the `title` attribute to the full value only when the content is genuinely truncated; cells that fit MUST NOT get a `title`. This reuses the same native mechanism as the sidebar (spec 002) — no custom tooltip component.

**Checkpoint**: At this point, cell content is contained at all window widths and scroll positions, and truncated cells reveal their full value on hover. The MVP is functional.

---

## Phase 3: User Story 2 — Resize columns by dragging + persist + reset (Priority: P2)

**Goal**: Users can resize the five data columns (Refs, Description, Author, Date, SHA) by dragging dividers between headers. Widths persist per repository across restarts. A "Reset column widths to defaults" context-menu entry restores defaults.

**Independent Test**: Drag the divider between Description and Author; confirm Description widens and Author narrows live. Close and reopen the app; confirm the same repo restores the chosen widths. Right-click and choose "Reset column widths to defaults"; confirm columns snap back.

**Depends on**: Phase 1 (T001 type, T002 constants) and US1 (T003–T004 layout fixes, since US2 replaces the fixed widths with dynamic ones and must preserve the containment).

### IPC & Store Infrastructure

- [x] T006 [P] [US2] Add `getColumnWidths: 'app:getColumnWidths'` and `setColumnWidths: 'app:setColumnWidths'` channels to the `Channels` const in `src/shared/ipc.ts`
- [x] T007 [P] [US2] Extend `PersistedState` with `repoColumnWidths: Record<string, ColumnWidths>` and add `getColumnWidths(path): Promise<ColumnWidths | null>` and `setColumnWidths(path, widths): Promise<void>` methods to the `store` object in `src/main/services/store.ts` — `getColumnWidths` returns the entry or `null` if absent (first open → defaults); `setColumnWidths` with `null` deletes the entry (reset); both persist `state.json` atomically
- [x] T008 [US2] Register `handle(Channels.getColumnWidths, …)` and `handle(Channels.setColumnWidths, …)` in `src/main/ipc.ts`, delegating to `store.getColumnWidths` / `store.setColumnWidths` (depends T006, T007)
- [x] T009 [P] [US2] Add typed `getColumnWidths: (path: string) => invoke<ColumnWidths | null>(…)` and `setColumnWidths: (path: string, widths: ColumnWidths | null) => invoke<void>(…)` methods to the `api` object in `src/preload/index.ts` (depends T006)

### Renderer Store

- [x] T010 [US2] Add `columnWidths: ColumnWidths | null` and `columnWidthsLoaded: boolean` state, plus `loadColumnWidths(repoPath)`, `resizeColumn(col, width)`, and `resetColumnWidths()` actions to `src/renderer/src/store/useStore.ts` — `loadColumnWidths` calls `api.getColumnWidths` and falls back to `DEFAULT_COLUMN_WIDTHS` when null; `resizeColumn` updates state in memory; `resetColumnWidths` sets defaults and calls `api.setColumnWidths(repoPath, null)` (depends T009, T002)
- [x] T011 [US2] Wire `loadColumnWidths(repo.path)` into `activateRepo` in `src/renderer/src/store/useStore.ts` so widths are loaded when a repo becomes active; clear `columnWidths` to null on `closeRepo` and `closeTab` (depends T010)
- [x] T012 [US2] Add a debounced `api.setColumnWidths` call to `resizeColumn` in `src/renderer/src/store/useStore.ts` so widths persist after drag (debounce ~400ms; depends T010)

### Dynamic Widths & Drag UI

- [x] T013 [US2] Replace the fixed-width header spans in `src/renderer/src/components/CommitGraph.tsx` with dynamic `style={{ width }}` driven by `columnWidths` from the store; when `description` is null, the Description column uses `flex-1` (fills remaining space); when it's a number, use that exact pixel width. Apply the same dynamic widths to every `CommitRow` cell so header and body stay in sync.
- [x] T014 [US2] Add draggable divider elements between the five data-column headers in `src/renderer/src/components/CommitGraph.tsx` — a thin hit-area span between each pair (Refs/Description, Description/Author, Author/Date, Date/SHA) with `cursor-col-resize` styling
- [x] T015 [US2] Implement the pointer-event drag handler in `src/renderer/src/components/CommitGraph.tsx` — `onPointerDown` on a divider starts a drag (call `setPointerCapture`), `pointermove` on window computes the new width from the delta and calls `store.resizeColumn(col, width)`, `pointerup` ends the drag. Enforce `MIN_COLUMN_WIDTHS`: the column being shrunk stops at its minimum and does not collapse or invert. When dragging the Description/Author divider with Description in flex mode, switch Description to a fixed pixel width on first drag so it becomes resizable.
- [x] T016 [US2] Add a "Reset column widths to defaults" entry to the commit history context menu in `src/renderer/src/components/CommitGraph.tsx` — add it to the background context menu (right-click on the graph/table area, not on a commit row), separated by a divider; clicking it calls `store.resetColumnWidths()` which snaps to defaults and clears the saved entry.

**Checkpoint**: At this point, columns are resizable, widths persist per repository, and the reset action works. US1 containment still holds with dynamic widths.

---

## Phase 4: User Story 3 — Column headers are clearly separated and readable (Priority: P3)

**Goal**: Header names are visually separated (no merging like "DescriptionAuthor"), headers align with their column bodies, and headers stay in sync during scroll and resize.

**Independent Test**: Look at the header row at various widths and after resizing; confirm each header name is visibly separated from its neighbors, Date and SHA headers are right-aligned matching their bodies, and headers stay over their columns.

**Depends on**: US1 (T003 header layout) and US2 (T013 dynamic widths) — headers must work with both fixed and dynamic widths.

### Implementation for User Story 3

- [x] T017 [US3] Add visible separation between adjacent header names in `src/renderer/src/components/CommitGraph.tsx` — add horizontal padding (`px-2` or similar) to each header span so no two names touch; ensure the padding fits within the column width so it doesn't cause overflow. Verify "Description" and "Author" read as two separate words at all widths.
- [x] T018 [US3] Align header text to match column body alignment in `src/renderer/src/components/CommitGraph.tsx` — add `text-right` to the Date and SHA header spans (matching the `text-right` on their body cells); keep Refs, Description, and Author left-aligned (matching their bodies).
- [x] T019 [US3] Verify headers stay positioned over their own column bodies during horizontal scroll and after column resizing in `src/renderer/src/components/CommitGraph.tsx` — the header row and the body rows use the same `width` values from `columnWidths`, so they scroll and resize in sync; manually verify no drift at narrow and wide widths.

**Checkpoint**: All three user stories are independently functional. Headers are clean and aligned.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and build gate.

- [x] T020 Run `npm run build` (typecheck + electron-vite build) and fix any errors in any touched file
- [ ] T021 Run the validation scenarios V1–V8 from `specs/003-commit-history-columns/quickstart.md` via `npm run dev` and confirm each passes
- [x] T022 [P] Verify no hardcoded hex colors were introduced — all styling uses `app-*` Tailwind semantic tokens or inline `width` only, per constitution Principle IV

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **User Story 1 (Phase 2)**: Depends on T001 (type) and T002 (constants) from Setup. No other dependencies — this is the MVP.
- **User Story 2 (Phase 3)**: Depends on Setup (T001, T002) and US1 (T003, T004 — the layout fixes US2 builds on). The IPC tasks (T006–T009) can start in parallel once T001 is done, but the UI tasks (T013–T016) depend on the store (T010–T012) and on US1's layout fixes.
- **User Story 3 (Phase 4)**: Depends on US1 (T003) and US2 (T013 — dynamic widths). It's a polish layer over the existing header layout.
- **Polish (Phase 5)**: Depends on all user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Setup — No dependencies on other stories. **This is the MVP.**
- **User Story 2 (P2)**: Depends on US1 (builds on the containment layout). The IPC/store infrastructure (T006–T012) can proceed in parallel with US1 once T001 is done, but the UI integration (T013–T016) must wait for US1.
- **User Story 3 (P3)**: Depends on US1 and US2 (headers must work with dynamic widths and containment).

### Within Each User Story

- Shared types and constants before UI changes
- IPC channels before handlers before preload before renderer store
- Store state/actions before component integration
- Layout fixes before drag interactions

### Parallel Opportunities

- T002 (constants) can run in parallel with T001 (type) — different files
- T006 (ipc.ts channels), T007 (store.ts service) can run in parallel — different files
- T009 (preload) can run in parallel with T007 — different files (both depend on T006)
- T022 (color audit) can run in parallel with T021 (validation) — different concerns

---

## Parallel Example: User Story 2 IPC Infrastructure

```bash
# Once T001 (type) is done, launch these in parallel (different files):
Task: "T006 Add getColumnWidths/setColumnWidths channels to src/shared/ipc.ts"
Task: "T007 Extend store service with repoColumnWidths in src/main/services/store.ts"

# Then once T006 is done, launch in parallel:
Task: "T008 Register IPC handlers in src/main/ipc.ts"
Task: "T009 Add typed api methods in src/preload/index.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001 type, T002 constants)
2. Complete Phase 2: User Story 1 (T003–T005 containment + tooltip)
3. **STOP and VALIDATE**: Test US1 independently — narrow window, scroll right, confirm containment; hover truncated cell, confirm tooltip
4. The MVP is deployable: the broken rendering is fixed

### Incremental Delivery

1. Setup → type and constants defined
2. US1 → containment fixed + tooltip → **MVP!** (broken rendering resolved)
3. US2 → columns resizable + persisted + reset → full resize feature
4. US3 → headers separated and aligned → polished table
5. Polish → build green + validation scenarios pass

### Parallel Team Strategy

With multiple developers:
1. Developer A: US1 (containment + tooltip)
2. Once T001 is done, Developer B: US2 IPC/store infrastructure (T006–T012)
3. After US1 + US2 infrastructure: Developer A or B: US2 UI (T013–T016)
4. Developer C: US3 (headers) after US1 and US2 UI are done

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- US1 is the MVP — it fixes the active visual defect with zero infrastructure changes
- US2 adds the full resize + persistence feature on top of US1's layout fixes
- US3 is a polish layer that depends on both prior stories
- Commit after each task or logical group (Conventional Commits, only when asked)
- `npm run build` must pass before any commit (constitution Principle III)
