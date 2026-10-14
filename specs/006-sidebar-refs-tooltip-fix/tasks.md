# Tasks: Sidebar Tooltips & Refs Column Overlay Fix

**Input**: Design documents from `/specs/006-sidebar-refs-tooltip-fix/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), data-model.md, contracts/ui-contracts.md

**Tests**: No unit tests configured in the project. Validation is manual via `npm run dev` (see quickstart.md in plan.md).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and verification

- [x] T001 Verify `npm run build` passes with no errors or warnings
- [x] T002 Verify `npm run dev` starts successfully and app loads
- [x] T003 Prepare test repository with long branch names, file paths, and remote URLs for validation

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Review existing `useTruncatedTitle` hook implementation in `src/renderer/src/lib/useTruncatedTitle.ts` to understand the pattern
- [x] T005 Review existing usage of `useTruncatedTitle` hook in `src/renderer/src/components/RefTree.tsx` and `src/renderer/src/components/BranchRow.tsx`
- [x] T006 Verify Tailwind semantic tokens (`app-*`) are available in `src/renderer/src/branding.ts` for all colors used in overlays
- [x] T007 Review CommitRow.tsx grid structure and column layout in `src/renderer/src/components/CommitRow.tsx` (lines 50-100)
- [x] T008 Review ExpandableBadge and RefLabels overlay CSS in `src/renderer/src/components/RefBadges.tsx` (lines 40-210)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Truncated sidebar content shows tooltip on hover (Priority: P1) 🎯 MVP

**Goal**: Add native `title` tooltips to all sidebar text elements (left and right) using the `useTruncatedTitle` hook, ensuring tooltips appear only when text is genuinely truncated.

**Independent Test**: 
1. Open a repository with long branch names, file paths, and remote URLs
2. Narrow the left sidebar until text truncates
3. Hover over each element: "Working changes" label, section headers, remote names/URLs, stash messages
4. Verify tooltip appears with full text for truncated elements
5. Verify NO tooltip appears for text that fits entirely
6. Repeat for right sidebar (ChangesPanel and DetailPanel)

### Implementation for User Story 1

#### Left Sidebar Elements (Sidebar.tsx)

- [x] T009 [P] [US1] Add `useTruncatedTitle` hook to "Working changes" button text span in `src/renderer/src/components/Sidebar.tsx` (line 48)
  - Apply hook to the text span that displays "Working changes"
  - Ensure tooltip shows only when text is truncated (scrollWidth > clientWidth)
  - Preserve all existing styling and functionality

- [x] T010 [P] [US1] Add `useTruncatedTitle` hook to section headers in `src/renderer/src/components/Sidebar.tsx` (line 191 in Section component)
  - Apply hook to all section header labels: Local branches, Remote branches, Remotes, Tags, Stashes
  - Ensure tooltip shows only when text is truncated
  - Preserve all existing styling and functionality

- [x] T011 [P] [US1] Add `useTruncatedTitle` hook to remote name in `src/renderer/src/components/Sidebar.tsx` (line 75)
  - Apply hook to the remote name text element
  - Ensure tooltip shows only when text is truncated
  - Preserve all existing styling and functionality

- [x] T012 [P] [US1] Add `useTruncatedTitle` hook to remote fetch URL in `src/renderer/src/components/Sidebar.tsx` (line 76)
  - Apply hook to the remote fetch URL text element
  - Ensure tooltip shows only when text is truncated
  - Preserve all existing styling and functionality

- [x] T013 [P] [US1] Add `useTruncatedTitle` hook to stash message in `src/renderer/src/components/Sidebar.tsx` (line 166 in StashRow component)
  - Apply hook to the stash message text element
  - Ensure tooltip shows only when text is truncated
  - Preserve all existing styling and functionality

#### Right Sidebar Elements (ChangesPanel.tsx & DetailPanel.tsx)

- [x] T014 [P] [US1] Replace static `title` attribute with `useTruncatedTitle` hook on Unstaged file rows in `src/renderer/src/components/ChangesPanel.tsx` (line 223)
  - Replace static `title={file.path}` with conditional hook
  - Ensure tooltip shows only when text is truncated
  - Preserve all existing styling and functionality

- [x] T015 [P] [US1] Replace static `title` attribute with `useTruncatedTitle` hook on Staged file rows in `src/renderer/src/components/ChangesPanel.tsx` (line 223)
  - Replace static `title={file.path}` with conditional hook
  - Ensure tooltip shows only when text is truncated
  - Preserve all existing styling and functionality

- [x] T016 [P] [US1] Replace static `title` attribute with `useTruncatedTitle` hook on Conflict rows in `src/renderer/src/components/ChangesPanel.tsx` (line 63)
  - Replace static `title={path}` with conditional hook
  - Ensure tooltip shows only when text is truncated
  - Preserve all existing styling and functionality

- [x] T017 [P] [US1] Add `useTruncatedTitle` hook to file paths in FileRow component in `src/renderer/src/components/DetailPanel.tsx` (line 228)
  - Apply hook to the file path text element
  - Ensure tooltip shows only when text is truncated
  - Preserve all existing styling and functionality

- [x] T018 [P] [US1] Add `useTruncatedTitle` hook to author/email line in `src/renderer/src/components/DetailPanel.tsx` (lines 99-100)
  - Apply hook to the author name and email text element
  - Ensure tooltip shows only when text is truncated
  - Preserve all existing styling and functionality

#### Validation for User Story 1

- [x] T019 [US1] Validate User Story 1 using quickstart.md Scenario 1 (Sidebar Tooltips on Truncated Text)
  - Narrow left sidebar until text truncates
  - Hover over each element and verify tooltip appears
  - Verify no tooltip on short text that fits
  - Repeat for right sidebar elements
  - Document any issues found

- [x] T020 [US1] Run `npm run build` and verify no errors or warnings
  - Ensure TypeScript strict mode passes
  - Ensure electron-vite build succeeds
  - Ensure no regressions in other components

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Refs column hover overlay is not clipped (Priority: P1)

**Goal**: Fix the Refs column hover overlay clipping issue by removing `overflow-hidden` and adding `min-w-0 relative` to the Refs cell container, preserving the colored badge overlay for graph readability.

**Independent Test**:
1. Open a repository with long branch names
2. Narrow the Refs column so branch names truncate
3. Hover over truncated badges
4. Verify full badge overlay appears with lane color, icon, and solid background
5. Verify overlay extends into Description column without being clipped
6. Verify no layout shifts or grid misalignment
7. Resize Refs column to various widths (80px, 150px, 300px) and repeat

### Implementation for User Story 2

#### Refs Column CSS Fix (CommitRow.tsx)

- [x] T021 [US2] Remove `overflow-hidden` and add `min-w-0 relative` to Refs column container in `src/renderer/src/components/CommitRow.tsx` (line 62)
  - Change className from `overflow-hidden flex items-center gap-1 py-1 pl-1 pr-2` to `min-w-0 relative flex items-center gap-1 py-1 pl-1 pr-2`
  - `min-w-0`: Prevents CSS grid track from expanding to fit content
  - `relative`: Establishes positioning context for absolute overlays
  - Removed `overflow-hidden`: Allows overlays to be visible (not clipped)
  - Preserve all other classes and functionality

#### Validation for User Story 2

- [x] T022 [US2] Validate User Story 2 using quickstart.md Scenario 2 (Refs Column Overlay Not Clipped)
  - Narrow Refs column until badges truncate
  - Hover over truncated badges and verify overlay appears
  - Verify overlay shows lane color, icon, and solid background
  - Verify overlay extends into Description column without clipping
  - Verify no layout shifts or grid misalignment
  - Resize Refs column to various widths and repeat
  - Document any issues found

- [x] T023 [US2] Validate grid alignment using quickstart.md Scenario 4 (No Visual Regressions)
  - Verify header and all rows remain perfectly aligned
  - Verify no visual misalignment at any window width
  - Verify no layout shifts when hovering over badges
  - Verify no column expansion when overlay is visible
  - Document any issues found

- [x] T024 [US2] Run `npm run build` and verify no errors or warnings
  - Ensure TypeScript strict mode passes
  - Ensure electron-vite build succeeds
  - Ensure no regressions in other components

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup

- [x] T025 [P] Validate User Story 1 + User Story 2 together using quickstart.md Scenario 3 (Right Sidebar Tooltips)
  - Verify all sidebar tooltips work correctly
  - Verify Refs overlay works correctly
  - Verify no interactions between the two features

- [x] T026 Run complete quickstart.md validation checklist
  - Scenario 1: Sidebar tooltips ✓
  - Scenario 2: Refs overlay ✓
  - Scenario 3: Right sidebar tooltips ✓
  - Scenario 4: No visual regressions ✓
  - All acceptance scenarios from spec.md ✓

- [x] T027 Final build verification: `npm run build` passes with no errors or warnings

- [x] T028 Document any edge cases or issues found during validation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion - Can start immediately after
- **User Story 2 (Phase 4)**: Depends on Foundational completion - Can start immediately after (in parallel with US1)
- **Polish (Phase 5)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- Both stories are **completely independent** and can be implemented in parallel by different developers

### Within Each User Story

- Validation tasks MUST run after implementation tasks
- Build verification MUST run after all implementation tasks
- Story complete before moving to Polish phase

### Parallel Opportunities

**Phase 1 Setup**: All tasks can run sequentially (quick setup)

**Phase 2 Foundational**: All tasks can run in parallel (different files, no dependencies)

**Phase 3 User Story 1**: 
- All element additions (T009-T018) can run in parallel (different files)
- Validation (T019-T020) must run after implementation

**Phase 4 User Story 2**:
- CSS fix (T021) is a single task
- Validation (T022-T024) must run after implementation

**Phase 3 & 4 Together**: User Stories 1 and 2 can be implemented in parallel by different developers

**Phase 5 Polish**: All tasks can run sequentially (final validation)

---

## Parallel Example: User Story 1

```bash
# After Foundational phase completes, launch all element additions together:
Task T009: Add useTruncatedTitle to "Working changes" label
Task T010: Add useTruncatedTitle to section headers
Task T011: Add useTruncatedTitle to remote name
Task T012: Add useTruncatedTitle to remote fetch URL
Task T013: Add useTruncatedTitle to stash message
Task T014: Replace static title on Unstaged files
Task T015: Replace static title on Staged files
Task T016: Replace static title on Conflict rows
Task T017: Add useTruncatedTitle to DetailPanel file paths
Task T018: Add useTruncatedTitle to DetailPanel author/email

# After all implementation tasks complete, run validation:
Task T019: Validate User Story 1 with quickstart.md Scenario 1
Task T020: Run npm run build
```

---

## Parallel Example: User Story 2

```bash
# After Foundational phase completes (can run in parallel with User Story 1):
Task T021: Remove overflow-hidden, add min-w-0 relative to CommitRow.tsx

# After implementation completes, run validation:
Task T022: Validate User Story 2 with quickstart.md Scenario 2
Task T023: Validate grid alignment with quickstart.md Scenario 4
Task T024: Run npm run build
```

---

## Implementation Strategy

### MVP First (Both User Stories - They're Both P1)

1. Complete Phase 1: Setup ✓
2. Complete Phase 2: Foundational ✓
3. Complete Phase 3: User Story 1 (Sidebar Tooltips)
4. Complete Phase 4: User Story 2 (Refs Overlay)
5. **STOP and VALIDATE**: Test both stories independently and together
6. Deploy/demo if ready

### Why Both Stories Are MVP

Both User Stories are marked **Priority: P1** in the specification:
- **US1**: "Tooltips on truncated text are a basic usability feature"
- **US2**: "The Refs column is the primary way users identify which branches point to which commits"

Both are essential for the feature to be complete and usable. They are independent and can be implemented in parallel.

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 (Sidebar Tooltips) → Test independently
3. Add User Story 2 (Refs Overlay) → Test independently
4. Both stories together → Full feature ready → Deploy/Demo

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Sidebar Tooltips) - 10 tasks (T009-T020)
   - Developer B: User Story 2 (Refs Overlay) - 4 tasks (T021-T024)
3. Stories complete independently and integrate seamlessly
4. Both stories are fully testable before merging

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Validation uses quickstart.md scenarios (no unit tests configured in project)
- Build verification (`npm run build`) is the primary quality gate
- All changes are CSS-only or hook-reuse — no new code patterns or dependencies
- Commit after each user story phase (or after each task if preferred)
- Stop at any checkpoint to validate story independently
- Both User Stories are P1 priority and should be completed together for the MVP

---

## Task Summary

| Phase | Tasks | Purpose |
|-------|-------|---------|
| Phase 1: Setup | T001-T003 | Project initialization and verification |
| Phase 2: Foundational | T004-T008 | Review existing patterns and infrastructure |
| Phase 3: User Story 1 | T009-T020 | Sidebar tooltips (10 implementation + 2 validation) |
| Phase 4: User Story 2 | T021-T024 | Refs overlay fix (1 implementation + 3 validation) |
| Phase 5: Polish | T025-T028 | Final validation and cleanup |

**Total Tasks**: 28

**Implementation Tasks** (excluding validation & build): 12
- User Story 1: 10 tasks (T009-T018)
- User Story 2: 1 task (T021)

**Validation Tasks**: 13
- User Story 1: 2 tasks (T019-T020)
- User Story 2: 3 tasks (T022-T024)
- Polish: 4 tasks (T025-T028)

**Setup & Foundational**: 8 tasks (T001-T008)

---

**Next Step**: Begin Phase 1 Setup, then Phase 2 Foundational, then implement User Stories 1 and 2 in parallel.
