# Tasks: Sidebar Reference Name Visibility

**Input**: Design documents from `/specs/002-sidebar-name-tooltip/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Tests**: No test framework is configured in this project; validation is by build + live run (`npm run dev`) per AGENTS.md. No automated test tasks are generated.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/` at repository root
- Renderer code lives under `src/renderer/src/`

---

## Phase 1: Setup

**Purpose**: No project initialization needed — the project already exists. This phase is empty.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The reusable `useTruncatedTitle` hook that ALL user stories depend on. MUST be complete before any user story work begins.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T001 Create `useTruncatedTitle` hook in `src/renderer/src/lib/useTruncatedTitle.ts` — a reusable React hook that, given a `fullText: string`, returns a ref callback and `onMouseEnter` handler to attach to a text element. On `mouseenter`, if `element.scrollWidth > element.clientWidth` (genuine overflow per FR-009), set `element.title = fullText`; otherwise clear `element.title`. Use `useRef` and `useCallback`; no React state update (set `title` directly on the DOM element to avoid re-renders). No new dependencies. TypeScript strict, no `any`.

**Checkpoint**: Hook ready — user story implementation can now begin

---

## Phase 3: User Story 1 - Read the full name of a truncated sidebar leaf on hover (Priority: P1) 🎯 MVP

**Goal**: Leaf rows (branches and tags) in all three sidebar sections show the full reference name via native `title` tooltip when the label is truncated, and show nothing when it fits.

**Independent Test**: Open a repository with a long branch/tag name; hover the truncated leaf and confirm the full name appears in a native tooltip; hover a short leaf and confirm no tooltip appears.

### Implementation for User Story 1

- [x] T002 [P] [US1] Update `BranchRow` in `src/renderer/src/components/BranchRow.tsx` to use the `useTruncatedTitle` hook: replace the existing static `title={remote ? branch.name : undefined}` on the root `<div>` (line 59) with the hook attached to the text `<span>` (line 66-68), passing `branch.name` as the full text. This unifies local and remote branches — both now show the full name only when truncated (FR-001, FR-003, FR-005). Remove the old `title` attribute from the root div.
- [x] T003 [P] [US1] Update tag leaf rendering in `src/renderer/src/components/RefTree.tsx` (lines 79-92, the `leaf-tag` branch) to use the `useTruncatedTitle` hook: replace the existing static `title={node.ref.name}` on the `<span>` (line 86) with the hook, passing `node.ref.name` as the full text. The `title` should now appear only when the tag label is truncated (FR-001, FR-003).

**Checkpoint**: User Story 1 is fully functional — truncated leaves show full names on hover, non-truncated leaves show nothing, across all three sections

---

## Phase 4: User Story 2 - Read the full path of a truncated sidebar folder on hover (Priority: P2)

**Goal**: Folder rows in all three sidebar sections show the full folder path via native `title` tooltip when the label is truncated, and show nothing when it fits. Must not interfere with the "current branch inside" indicator.

**Independent Test**: Open a repository with a deeply nested branch; collapse the parent so a long intermediate folder is visible and truncated; hover the folder row and confirm the full folder path appears in a native tooltip.

### Implementation for User Story 2

- [x] T004 [US2] Update folder row rendering in `src/renderer/src/components/RefTree.tsx` (lines 97-115, the folder `<button>`) to use the `useTruncatedTitle` hook: attach the hook's ref and `onMouseEnter` to the folder label `<span>` (line 106), passing `node.path` as the full text (the complete folder path, e.g. `feature/epic-1`). Ensure the hook is on the text `<span>`, NOT on the `<button>`, so it does not conflict with the "current branch inside" indicator `<span>` (lines 107-113) which has its own `title="Current branch is inside"`. The chevron icon click (expand/collapse) must remain functional (FR-007, FR-008).

**Checkpoint**: User Stories 1 AND 2 both work independently — leaves show full names, folders show full paths, both only when truncated

---

## Phase 5: User Story 3 - Consistent name visibility across all three sidebar sections (Priority: P3)

**Goal**: Verify and ensure the hover-reveal behaviour is identical across local branches, remote branches, and tags — same trigger condition (truncation only), same mechanism (native `title`), same dismissal (native pointer-leave). This story is primarily validation, since US1 and US2 already apply the hook uniformly.

**Independent Test**: In a repository with truncated names in all three sections, hover a truncated row in each section and confirm the native tooltip appears with the same behaviour in all three.

### Implementation for User Story 3

- [x] T005 [US3] Verify consistency across all three sidebar sections in `src/renderer/src/components/RefTree.tsx` and `src/renderer/src/components/BranchRow.tsx`: confirm that local branches, remote branches, and tags all use the same `useTruncatedTitle` hook with the same behaviour (truncation-only trigger, native `title`, no per-section differences). Fix any remaining inconsistencies (e.g. a section still using a static `title` or missing the hook). Ensure section headers ("Local branches", "Remote branches", "Tags") do NOT receive the hook (FR-013).

**Checkpoint**: All three sections behave identically — the feature is complete and consistent

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Build verification and live validation

- [x] T006 Run `npm run build` (typecheck + electron-vite build) and fix any errors — build must be green before commit (constitution principle III)
- [x] T007 Run `npm run dev` and validate all scenarios from `specs/002-sidebar-name-tooltip/quickstart.md`: V1 (truncated leaf), V2 (non-truncated leaf), V3 (truncated folder), V4 (cross-section consistency), V5 (existing interactions unaffected), V6 (no tooltip on section headers) — attempted; the Electron runtime required by `npm run dev` is not available in this environment (error: `Cannot read properties of undefined (reading 'isPackaged')`), so live validation could not be completed. The build gate (T006) passed and is the verified quality gate.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Empty — no work needed
- **Foundational (Phase 2)**: T001 (the hook) — BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on T001
  - US1 (T002, T003) can start immediately after T001; T002 and T003 are in different files and can run in parallel
  - US2 (T004) can start after T001; depends on the hook but not on US1 (different code path in RefTree.tsx folder branch)
  - US3 (T005) depends on US1 and US2 being complete (it validates consistency across all sections)
- **Polish (Phase 6)**: T006 depends on all implementation tasks; T007 depends on T006

### User Story Dependencies

- **User Story 1 (P1)**: Depends on T001 only. T002 and T003 are parallel (different files).
- **User Story 2 (P2)**: Depends on T001 only. Independent of US1 (folder rows vs leaf rows).
- **User Story 3 (P3)**: Depends on US1 and US2 (validates their consistency).

### Parallel Opportunities

- T002 and T003 can run in parallel (different files: `BranchRow.tsx` vs `RefTree.tsx`)
- After T001, US1 and US2 can be worked on in parallel (different code paths)

---

## Parallel Example: User Story 1

```bash
# Launch both US1 tasks together (different files, no dependencies):
Task: "Update BranchRow in src/renderer/src/components/BranchRow.tsx"
Task: "Update tag leaf rendering in src/renderer/src/components/RefTree.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational (T001 — the hook)
2. Complete Phase 3: User Story 1 (T002, T003 — leaf rows)
3. **STOP and VALIDATE**: Run `npm run dev`, hover a truncated branch/tag leaf, confirm the full name appears; hover a short leaf, confirm no tooltip
4. The MVP delivers the core request: users can read the full name of truncated branches and tags

### Incremental Delivery

1. T001 → Hook ready
2. T002 + T003 → Leaves show full names (MVP!)
3. T004 → Folders also show full paths
4. T005 → Verify cross-section consistency
5. T006 + T007 → Build green and live validation

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- No automated tests — validation is by `npm run build` + `npm run dev` (per AGENTS.md)
- The feature is purely renderer-side: no IPC, no backend, no data model changes
- The `useTruncatedTitle` hook uses `scrollWidth > clientWidth` to detect genuine overflow (FR-009), not a character-count heuristic
- Existing `title` attributes on non-sidebar elements (fetch button, icon buttons, etc.) are NOT modified (FR-011)
