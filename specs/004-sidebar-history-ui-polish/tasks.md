---

description: "Task list for Sidebar & History Table UI Polish"
---

# Tasks: Sidebar & History Table UI Polish

**Input**: Design documents from `/specs/004-sidebar-history-ui-polish/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: No test framework configured — verification is `npm run build` + live `npm run dev` validation per quickstart.md. No test tasks generated.

**Organization**: Tasks grouped by user story. US1 touches the sidebar (`RefTree.tsx`, `BranchRow.tsx`); US2/US3/US4 all touch `CommitGraph.tsx` and are therefore sequential (same file).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Single project: `src/` at repository root (Electron app: `src/renderer/src/`, `src/main/`, `src/shared/`)

---

## Phase 1: Setup

**Purpose**: Verify the starting state — no new infrastructure needed for this feature.

- [ ] T001 Verify `npm run build` passes on the current branch before making changes (baseline green build)

---

## Phase 2: Foundational

**Purpose**: No foundational/blocking tasks required — this feature is a pure presentation fix with no new IPC, no new dependencies, no schema changes. All infrastructure (column-width persistence, `useTruncatedTitle` hook, `ColumnDivider` component) already exists from specs 002/003.

**Checkpoint**: Proceed directly to user stories.

---

## Phase 3: User Story 1 - Clear Nested Hierarchy in the Sidebar (Priority: P1) MVP

**Goal**: Every nesting level in the sidebar folder tree is indented 20px further than its parent, at every depth — fixing the issue where nested folders (e.g. `BPMA-1343` inside `BPMA-1310`) look like siblings of their parent.

**Independent Test**: Open a repository with branches nested 3+ levels deep, expand all folders, and verify each level is clearly indented relative to its parent. See quickstart.md Scenario 1.

### Implementation for User Story 1

- [x] T002 [US1] Increase the per-level indentation step from 12px to 20px in `src/renderer/src/components/RefTree.tsx` — change `const indent = `${node.depth * 12}px`` to `const indent = `${node.depth * 20}px`` (line 64), so every depth level is visually distinct. Research R1.
- [x] T003 [US1] Verify folder chevrons and leaf branch icons left-align at the same depth in `src/renderer/src/components/RefTree.tsx` and `src/renderer/src/components/BranchRow.tsx` — both use `px-3` (12px) internal padding after the indent wrapper, so at the same `depth` their content starts at the same x-position. Confirm no adjustment needed, or fix if misaligned. Contract C1.
- [x] T004 [US1] Verify the `useTruncatedTitle` tooltip (from spec 002) still works correctly with the new 20px indentation step in `src/renderer/src/components/RefTree.tsx` (folder rows, tag leaves) and `src/renderer/src/components/BranchRow.tsx` (leaf branches) — long names must still truncate with ellipsis and show the full name on hover.

**Checkpoint**: Sidebar hierarchy is unmistakable at every depth. Validate with quickstart.md Scenario 1.

---

## Phase 4: User Story 2 - No Overflow Artifacts When Scrolling the History Table (Priority: P1)

**Goal**: When the app window is small and horizontal scrolling is active, scrolling right shows no white gap and no text overflow — row backgrounds (hover/selection) extend across the full scrollable width, and all cell content is clipped within its cell.

**Independent Test**: Resize the window narrow enough to force horizontal scrolling, scroll all the way right, and verify no white strip, no text overflow, and full-width row backgrounds. See quickstart.md Scenario 2.

### Implementation for User Story 2

- [x] T005 [US2] Fix commit row width so row backgrounds (hover, selection, stash tint) paint across the full scrollable width in `src/renderer/src/components/CommitGraph.tsx` — ensure each `CommitRow` (and the WIP row, day header, and sticky header) has a minimum width equal to the sum of all column widths (`graphWidth + refs + description + author + date + sha`). Use `w-max min-w-full` (or equivalent) on the row container so the row is at least as wide as its content and at least as wide as the viewport. Research R2, Contract C2.
- [x] T006 [US2] Ensure every column cell in `CommitRow` clips overflow consistently in `src/renderer/src/components/CommitGraph.tsx` — verify that the Refs, Description (both flex `null` and fixed-width branches), Author, Date, and SHA cells all have `overflow-hidden` and that text content uses `truncate` or `OverflowTitle` so `text-overflow: ellipsis` applies. Fix any cell where content can spill outside its boundaries. Research R2, Contract C3.
- [x] T007 [US2] Verify the sticky header row in `src/renderer/src/components/CommitGraph.tsx` (lines 103–125) has the same total width as the commit rows, so the header columns align with the body columns at every scroll position. Contract C2.

**Checkpoint**: No white gap, no text overflow at any window width or scroll position. Validate with quickstart.md Scenario 2.

---

## Phase 5: User Story 3 - Resizable History Table Columns (Priority: P2)

**Goal**: Column resize dividers are visible at rest and highlight on hover; every text column (Refs, Description, Author, Date, SHA) is resizable by dragging; the Graph column is auto-sized and not resizable. Column widths persist across restarts.

**Independent Test**: Drag each column divider and verify live resizing, visible dividers, `col-resize` cursor, minimum-width enforcement, and Graph column immutability. See quickstart.md Scenario 3.

### Implementation for User Story 3

- [x] T008 [US3] Make the `ColumnDivider` separator line always visible (not just on hover) in `src/renderer/src/components/CommitGraph.tsx` (lines 973–1030) — change the 1px vertical line from `group-hover:bg-app-accent` to always `bg-app-border` with `group-hover:bg-app-accent` for the hover highlight. Optionally widen the visible line to 2px for better discoverability. Research R3, Contract C4.
- [x] T009 [US3] Verify no `ColumnDivider` exists before the Graph column in `src/renderer/src/components/CommitGraph.tsx` (the header at lines 115–124 has dividers only between Refs↔Description, Description↔Author, Author↔Date, Date↔SHA) — confirm the Graph column is excluded from manual resizing and auto-sizes via `graphWidth = layout.width * LANE_W + PAD * 2`. Research R4, Contract C4.
- [x] T010 [US3] Verify column width persistence works end-to-end in `src/renderer/src/components/CommitGraph.tsx` and `src/renderer/src/store/useStore.ts` — `resizeColumn` (line 595) debounces saves to the main process; `loadColumnWidths` (line 590) restores saved widths or falls back to `DEFAULT_COLUMN_WIDTHS`. Confirm resizing, closing, and reopening the app restores the chosen widths. Research R6, Contract C4.

**Checkpoint**: All text columns are resizable with visible dividers; Graph is not; widths persist. Validate with quickstart.md Scenarios 3 and 4.

---

## Phase 6: User Story 4 - Tooltips for Truncated Header Labels (Priority: P3)

**Goal**: A truncated header label shows its full text in a native `title` tooltip on hover; truncated ref chips already reveal their full name via the existing hover overlay.

**Independent Test**: Narrow a column until its header label is truncated, hover it, and verify the full label appears as a tooltip. See quickstart.md Scenario 5.

### Implementation for User Story 4

- [x] T011 [US4] Apply the existing `useTruncatedTitle` hook to the `ColumnHeader` component in `src/renderer/src/components/CommitGraph.tsx` (lines 953–970) — import `useTruncatedTitle` from `../lib/useTruncatedTitle`, attach the hook's `ref` and `onMouseEnter` to the header `<span>`, passing the `label` string as the full text. The hook sets `title` only when `scrollWidth > clientWidth`. Research R5, Contract C5.
- [x] T012 [US4] Verify the existing `ExpandableBadge` hover overlay (lines 618–674) already satisfies the ref-chip tooltip requirement (FR-010) in `src/renderer/src/components/CommitGraph.tsx` — confirm that a truncated branch/tag chip reveals its full name on hover. If the overlay is insufficient, add a `title` attribute as a fallback. Contract C6.

**Checkpoint**: Truncated headers show tooltips; truncated ref chips reveal full names. Validate with quickstart.md Scenarios 5 and 6.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final verification across all user stories.

- [x] T013 Run `npm run build` and verify it passes (typecheck + electron-vite build green) — the build is the quality gate per constitution Principle III.
- [ ] T014 Run all quickstart.md validation scenarios (1–6) with `npm run dev` against a repository with nested branches, and verify each scenario passes. Requires manual UI validation.
- [x] T015 Verify no hardcoded hex colors were introduced — all colors use Tailwind semantic tokens (`bg-app-border`, `bg-app-accent`, etc.) per constitution Principle IV. Check `src/renderer/src/components/RefTree.tsx` and `src/renderer/src/components/CommitGraph.tsx`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: None — skip to user stories.
- **US1 (Phase 3)**: Depends on T001 (green baseline). Touches `RefTree.tsx`, `BranchRow.tsx` — independent of US2/US3/US4.
- **US2 (Phase 4)**: Depends on T001. Touches `CommitGraph.tsx` — sequential with US3/US4 (same file).
- **US3 (Phase 5)**: Depends on US2 (same file, builds on row-width fix). Touches `CommitGraph.tsx`.
- **US4 (Phase 6)**: Depends on US3 (same file). Touches `CommitGraph.tsx`.
- **Polish (Phase 7)**: Depends on all user stories complete.

### User Story Dependencies

- **US1 (P1)**: Independent — can run in parallel with US2 if different developers handle the two files.
- **US2 (P1)**: Independent of US1. Must complete before US3/US4 (same file, row-width fix is foundational for divider/tooltip work).
- **US3 (P2)**: Depends on US2 (same file). Independent of US1.
- **US4 (P3)**: Depends on US3 (same file). Independent of US1.

### Parallel Opportunities

- **US1 vs US2**: Can run in parallel — US1 touches `RefTree.tsx`/`BranchRow.tsx`, US2 touches `CommitGraph.tsx` (different files, no conflict).
- **Within US1**: T002, T003, T004 are sequential (same file, each builds on the previous).
- **Within US2/US3/US4**: All sequential (same file `CommitGraph.tsx`).

---

## Parallel Example: US1 + US2

```bash
# Developer A: US1 (sidebar indentation) — RefTree.tsx, BranchRow.tsx
Task: "T002 [US1] Increase indentation step to 20px in RefTree.tsx"
Task: "T003 [US1] Verify chevron/icon alignment at same depth"
Task: "T004 [US1] Verify tooltip behavior with new indentation"

# Developer B: US2 (table overflow) — CommitGraph.tsx (different file, no conflict)
Task: "T005 [US2] Fix commit row width for full-width backgrounds"
Task: "T006 [US2] Ensure all cells clip overflow consistently"
Task: "T007 [US2] Verify header row width matches body rows"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

Both US1 and US2 are P1 and independent (different files). Complete them first:

1. Complete Phase 1: Setup (T001 — verify green build)
2. Complete Phase 3: US1 (sidebar indentation — T002–T004)
3. Complete Phase 4: US2 (table overflow — T005–T007)
4. **STOP and VALIDATE**: Test US1 and US2 independently per quickstart.md Scenarios 1 and 2.

### Incremental Delivery

1. US1 + US2 → MVP (both P1, the most visible bugs)
2. Add US3 → resizable columns with visible dividers (P2)
3. Add US4 → header tooltips (P3, complements US3)
4. Polish → build verification + full quickstart validation

### Single Developer (Sequential)

Since US2/US3/US4 all touch `CommitGraph.tsx`, a single developer should work them in order: US2 → US3 → US4. US1 can be interleaved at any point (different file).

---

## Notes

- [P] tasks = different files, no dependencies. Only US1 vs US2 qualify for parallel work.
- US2/US3/US4 all modify `CommitGraph.tsx` — must be sequential to avoid merge conflicts.
- No test tasks generated — no test framework configured; verification is build + live validation.
- No new dependencies, no IPC changes, no data model changes (per plan.md and data-model.md).
- Commit after each user story checkpoint (per AGENTS.md: one cohesive change per commit).
