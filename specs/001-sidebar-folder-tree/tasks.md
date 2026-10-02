---
description: "Task list for sidebar folder tree feature implementation"
---

# Tasks: Sidebar Folder Tree for Branches and Tags

**Input**: Design documents from `/specs/001-sidebar-folder-tree/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: No test framework is configured in this project. Validation is by `npm run build` + live run (`npm run dev`) per AGENTS.md. No test tasks are generated.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Single project: `src/` at repository root (renderer-only changes)
- All changes are in `src/renderer/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the new pure helper module and persistence helpers shared by all three user stories.

- [x] T001 [P] Create `src/renderer/src/lib/refTree.ts` with the `RefTreeNode` discriminated-union type and the `buildRefTree()` function signature
- [x] T002 [P] Add `loadExpandedFolders(repoPath: string): Set<string>` and `saveExpandedFolders(repoPath: string, expanded: Set<string>): void` to `src/renderer/src/lib/prefs.ts`, keyed by `app-expanded-${repoPath}` in `localStorage`, returning an empty set when no state is stored (first open → all collapsed)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core tree-building logic that MUST be complete before ANY user story can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Implement `buildRefTree()` in `src/renderer/src/lib/refTree.ts`: split each ref name on `/`; every segment before the last becomes a folder node, the last segment becomes a leaf node; preserve encounter order from the input array (no re-sorting — FR-016); a leaf and a folder with the same label coexist as siblings keyed by `(label, kind)` (FR-010); every `/`-separated segment is always its own folder even with a single child (FR-018); folders have `ref: null` and `children: RefTreeNode[]`; leaves carry the original `Branch` or `Tag` ref; set `path` to the full prefix up to and including the node and `depth` to the zero-based level
- [x] T004 Implement `folderContainsCurrent(node: RefTreeNode): boolean` in `src/renderer/src/lib/refTree.ts`: returns true if any descendant `leaf-branch` node has `ref.current === true` (recursive over `children`); used by the renderer for the collapsed-folder current-branch indicator (FR-011)
- [x] T005 Create `src/renderer/src/components/RefTree.tsx` with the `RefTree` component skeleton: accept `RefTreeProps` (`nodes`, `repoPath`, `onMenu`, `setConfirm`, `remote?`); render a list of top-level nodes; folder nodes render a chevron (`ChevronRight` collapsed / `ChevronDown` expanded from `lucide-react`) + label and recurse into `children` when expanded; leaf-branch nodes delegate to the existing `BranchRow` from `Sidebar.tsx`; leaf-tag nodes render a tag icon + name (matching current tag row style); load/save expand/collapse state via `loadExpandedFolders`/`saveExpandedFolders` from `prefs.ts`; indent by `node.depth` (FR-006); all colors via Tailwind semantic tokens (`app-*`), no hardcoded hex

**Checkpoint**: Foundation ready — `buildRefTree()` produces a correct tree and `RefTree` renders folders/leaves with expand/collapse. User story integration can now begin.

---

## Phase 3: User Story 1 - Browse nested local branches as a collapsible folder tree (Priority: P1) 🎯 MVP

**Goal**: The "Local branches" sidebar section renders local branches as a collapsible folder tree split on `/`, with persisted expand/collapse state and the current-branch indicator on collapsed ancestors.

**Independent Test**: Open a repo with slash-separated local branch names; confirm folders/leaves render correctly, expand/collapse works, the current branch is highlighted, and collapsed ancestors of the current branch show the indicator.

### Implementation for User Story 1

- [x] T006 [US1] In `src/renderer/src/components/Sidebar.tsx`, replace the flat `local.map((b) => <BranchRow .../>)` block inside the "Local branches" `<Section>` with a `<RefTree>` call: build the tree via `buildRefTree(local, { leafKind: 'leaf-branch' })` and pass `repoPath={repo?.path ?? ''}`, `onMenu={cm.open}`, `setConfirm={setConfirm}` (no `remote` flag) — FR-001
- [x] T007 [US1] Verify the `RefTree` component in `src/renderer/src/components/RefTree.tsx` passes `remote={false}` (default) to `BranchRow` for local branch leaves so existing local-branch actions (Checkout, Merge, Delete) remain unchanged — FR-007, FR-008
- [x] T008 [US1] In `src/renderer/src/components/RefTree.tsx`, render the current-branch indicator: for each collapsed folder where `folderContainsCurrent(node)` is true, show a small accent dot/badge on the chevron or label using `text-app-accent` / `bg-app-accent` tokens; hide the indicator when the folder is expanded and the highlighted leaf is visible — FR-011
- [x] T009 [US1] Confirm the current branch leaf still renders the existing `Check` icon and `font-semibold` highlight (delegated to `BranchRow`) regardless of nesting depth — FR-011
- [x] T010 [US1] Confirm single-segment local branches (e.g. `main`, `develop`) render as top-level leaves alongside top-level folders — FR-009
- [x] T011 [US1] Confirm a colliding `feature` leaf and `feature/...` folder both appear at the top level — FR-010
- [x] T012 [US1] Run `npm run build` and fix any typecheck/build errors

**Checkpoint**: User Story 1 is fully functional and testable independently via `npm run dev` (see quickstart.md Scenarios 1–3).

---

## Phase 4: User Story 2 - Browse nested remote branches as a collapsible folder tree (Priority: P2)

**Goal**: The "Remote branches" sidebar section renders remote tracking branches as a collapsible folder tree, with the remote name as the top-level node.

**Independent Test**: Open a repo with a remote containing slash-separated branch names; confirm the remote appears as a top-level node and nested branches render as folders/leaves beneath it, expandable and collapsible. Multiple remotes each appear as separate top-level nodes.

### Implementation for User Story 2

- [x] T013 [US2] In `src/renderer/src/components/Sidebar.tsx`, replace the flat `remote.map((b) => <BranchRow ... remote />)` block inside the "Remote branches" `<Section>` with a `<RefTree>` call: build the tree via `buildRefTree(remote, { leafKind: 'leaf-branch' })` (the remote name is the first `/`-segment and becomes the top-level folder) and pass `remote` flag so `BranchRow` uses remote actions — FR-002
- [x] T014 [US2] Verify `RefTree` passes `remote` through to `BranchRow` so existing remote-branch actions (Checkout create local, Merge, Delete remote branch) remain unchanged — FR-007
- [x] T015 [US2] Confirm multiple remotes (e.g. `origin`, `upstream`) each render as separate top-level folder nodes, each independently expandable/collapsible — FR-002
- [x] T016 [US2] Run `npm run build` and fix any typecheck/build errors

**Checkpoint**: User Stories 1 AND 2 both work independently (see quickstart.md Scenario 4).

---

## Phase 5: User Story 3 - Browse tags as a collapsible folder tree (Priority: P3)

**Goal**: The "Tags" sidebar section renders tags as a collapsible folder tree using the same `/`-splitting rules and interaction model as branches.

**Independent Test**: Open a repo with a mix of flat and slash-separated tag names; confirm flat tags appear as leaves and nested tags appear as folders/leaves, all expandable/collapsible.

### Implementation for User Story 3

- [x] T017 [US3] In `src/renderer/src/components/RefTree.tsx`, implement the `leaf-tag` render branch: a tag icon (`TagIcon` from `lucide-react`, `text-app-warning`) + the tag name, matching the existing tag row visual style; tag leaves are not checkout targets — FR-003, FR-008
- [x] T018 [US3] In `src/renderer/src/components/Sidebar.tsx`, replace the flat `tags.map(...)` block inside the "Tags" `<Section>` with a `<RefTree>` call: build the tree via `buildRefTree(tags, { leafKind: 'leaf-tag' })` — FR-003
- [x] T019 [US3] Confirm flat tags (e.g. `v1.0.0`) render as top-level leaves and nested tags (e.g. `release/v1.0.0`) render as folders + leaves — FR-009
- [x] T020 [US3] Run `npm run build` and fix any typecheck/build errors

**Checkpoint**: All three user stories are independently functional (see quickstart.md Scenario 5).

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Consistency, persistence edge cases, and final validation across all three sections.

- [x] T021 [P] Verify expand/collapse state persists per repository across app restarts: expand folders in one repo, quit and relaunch, confirm state is restored; open a second repo and confirm it has independent state — FR-015 (see quickstart.md Scenario 6)
- [x] T022 [P] Verify empty folders are auto-removed: delete the last branch under a prefix, refresh the sidebar, confirm the now-empty folder disappears (tree is rebuilt from current `branches`/`tags` on each refresh) — FR-019 (see quickstart.md Scenario 7)
- [x] T023 [P] Verify all three sections use the identical folder-tree visual language and interaction model (chevron, indentation, expand/collapse) — FR-014, SC-004
- [x] T024 [P] Verify performance: in a repo with 200+ slash-separated branch/tag names, toggle folders open/closed and confirm no perceptible lag; initial tree render under 1 second — SC-002, FR-013 (see quickstart.md Scenario 9)
- [x] T025 Run the full `quickstart.md` validation (Scenarios 1–9) against a scratch repo with nested branch/tag names
- [x] T026 Run `npm run build` (typecheck + electron-vite build) and ensure it passes with no errors before commit

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — T001 and T002 can run in parallel (different files)
- **Foundational (Phase 2)**: Depends on Setup (T001 for the module stub, T002 for persistence) — BLOCKS all user stories
- **User Stories (Phases 3–5)**: All depend on Foundational (Phase 2) completion
  - US1 (Phase 3) is the MVP and should be completed first
  - US2 (Phase 4) and US3 (Phase 5) can proceed in parallel after US1, or sequentially in priority order
- **Polish (Phase 6)**: Depends on all three user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Foundational only — no dependencies on other stories
- **User Story 2 (P2)**: Depends on Foundational only — reuses the same `RefTree` component and `buildRefTree` helper; independently testable
- **User Story 3 (P3)**: Depends on Foundational only — reuses the same `RefTree` component; the `leaf-tag` render branch (T017) is tag-specific

### Within Each User Story

- `buildRefTree` (T003) and `RefTree` (T005) are foundational and shared
- Story tasks are mostly edits to `Sidebar.tsx` wiring plus verification
- Build (`npm run build`) is run at the end of each story phase

### Parallel Opportunities

- T001 and T002 (Setup) can run in parallel (different files)
- Polish tasks T021–T024 can run in parallel (independent validation scenarios)
- US2 and US3 can be worked on in parallel after US1 (they touch the same `Sidebar.tsx` section blocks but different sections; coordinate to avoid merge conflicts, or do sequentially)

---

## Parallel Example: Setup Phase

```bash
# Launch both setup tasks together (different files):
Task: "Create src/renderer/src/lib/refTree.ts stub (T001)"
Task: "Add loadExpandedFolders/saveExpandedFolders to src/renderer/src/lib/prefs.ts (T002)"
```

## Parallel Example: Polish Phase

```bash
# Launch validation scenarios together:
Task: "Verify expand/collapse persistence across restarts (T021)"
Task: "Verify empty folders auto-removed (T022)"
Task: "Verify consistent visual language across sections (T023)"
Task: "Verify performance with 200+ refs (T024)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001, T002)
2. Complete Phase 2: Foundational (T003–T005) — CRITICAL, blocks all stories
3. Complete Phase 3: User Story 1 (T006–T012)
4. **STOP and VALIDATE**: Run `npm run dev` and quickstart.md Scenarios 1–3
5. Demo if ready — local branches tree is the MVP

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 → Validate (MVP: local branches tree)
3. Add User Story 2 → Validate (remote branches tree)
4. Add User Story 3 → Validate (tags tree)
5. Polish → Full validation across all three sections

### Parallel Team Strategy

With multiple developers:
1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Sidebar local-branches wiring)
   - Developer B: User Story 2 (Sidebar remote-branches wiring)
   - Developer C: User Story 3 (RefTree leaf-tag branch + Sidebar tags wiring)
3. Coordinate `Sidebar.tsx` edits (different sections) to avoid conflicts

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable via `npm run dev`
- No test framework is configured; validation is by build + live run per AGENTS.md
- Commit after each task or logical group (only when explicitly asked, per AGENTS.md)
- Stop at any checkpoint to validate a story independently
- All colors must use Tailwind semantic tokens (`app-*`); never hardcode hex
- No new IPC channels, no new dependencies, no backend changes
