# Phase 0: Research

## R1 — How are branches and tags currently provided to the renderer?

**Decision**: Reuse the existing store data; no new IPC.

**Rationale**: `refreshAll()` in `src/renderer/src/store/useStore.ts` already fetches `branches` (`Branch[]`) and `tags` (`Tag[]`) via `api.getBranches()` and `api.getTags()`. `getBranches()` uses `git for-each-ref` over `refs/heads` and `refs/remotes`, returning entries in git's natural ref order with `isRemote` and `current` flags. `getTags()` uses `git for-each-ref` over `refs/tags`. The renderer already splits these into local/remote via `b.isRemote`. The tree is a pure transformation of these arrays — no backend or IPC changes are needed.

**Alternatives considered**:
- Add a new `getRefTree` IPC channel that returns a pre-built tree from the main process. Rejected: violates YAGNI, splits logic across processes unnecessarily, and the spec explicitly scopes the change to "sidebar presentation only".
- Fetch refs on-demand as folders expand. Rejected: all refs are already loaded eagerly by `refreshAll()`; lazy loading would add complexity for no benefit at this scale (hundreds, not millions, of refs).

## R2 — How to split a ref name into folder segments?

**Decision**: Split on `/` only. For remote branches, the remote name is the first segment (top-level node); the remainder is split into folders + a leaf. For local branches and tags, the whole name is split into folders + a leaf.

**Rationale**: The spec (FR-001/002/003, Assumptions) fixes `/` as the only separator. `getBranches()` returns remote branch names in `origin/feature/epic-1/taskA` form, so the remote is reliably the first segment (Assumption: "Remote tracking branch names always begin with the remote name followed by `/`"). The final segment of the split is always the leaf; every preceding segment is a folder.

**Alternatives considered**:
- Treat other characters (`-`, `.`, `_`) as separators. Rejected by spec (Assumptions: "other characters are part of a single segment and do not create nesting").
- Flatten single-child intermediate folders. Rejected by clarification (FR-018: always render every segment as its own folder).

## R3 — How to handle a leaf and folder sharing the same prefix (e.g. `feature` and `feature/x`)?

**Decision**: A folder and a leaf with the same label can coexist as siblings at the same level. The tree builder uses a key that distinguishes node type, so a `feature` leaf and a `feature` folder are both rendered.

**Rationale**: FR-010 requires both to be visible. Git allows both `feature` (a branch) and `feature/epic-1/taskA` to exist simultaneously. The builder must not let the folder node overwrite or hide the leaf node at the same path.

**Alternatives considered**:
- Merge them into one node (folder that is also selectable). Rejected: FR-008 says folders are not checkout targets; merging would break FR-007/FR-008.

## R4 — How to preserve git's reference order (no re-sorting)?

**Decision**: The tree builder preserves insertion order. It iterates the `branches`/`tags` arrays in the order returned by the store (which mirrors `git for-each-ref`), and appends children to folders in encounter order. Siblings are rendered in that encounter order.

**Rationale**: FR-016 requires the tree to match the backend's reference order with no re-sorting. `git for-each-ref` returns refs in a stable, deterministic order (sorted by refname by default). Preserving encounter order satisfies FR-016 directly.

**Alternatives considered**:
- Sort folders-first then leaves, alphabetical. Rejected by clarification (user chose backend order).
- Sort alphabetically regardless of type. Rejected by clarification.

## R5 — How to persist expand/collapse state per repository?

**Decision**: Store the set of expanded folder paths per repository path in `localStorage`, keyed by repo path. Extend the existing `prefs.ts` pattern with a small `loadExpandedFolders(repoPath)` / `saveExpandedFolders(repoPath, set)` pair, or a sibling module. State is a `Set<string>` of full folder paths (e.g. `feature`, `feature/epic-1`).

**Rationale**: FR-015 requires per-repo persistence across restarts. `localStorage` is already used for `Prefs` in `src/renderer/src/lib/prefs.ts`, so this reuses an established, dependency-free mechanism. Keying by repo path keeps state isolated per repository (switching repos does not carry state over). On first open (no stored state), all folders start collapsed (Assumption).

**Alternatives considered**:
- Store expand/collapse state in the Zustand store only (in-memory). Rejected: would not survive restarts (FR-015).
- Add an IPC channel to persist via the main-process store. Rejected: over-engineering for a small UI preference; `localStorage` is sufficient and already used for prefs.

## R6 — How to show the "current branch contained" indicator on collapsed ancestor folders?

**Decision**: During tree render, walk from each collapsed folder down to its leaves; if any descendant leaf is the current branch (`branch.current === true`), render a small accent dot/badge on the folder's chevron or label. The indicator is hidden once the folder is expanded (the highlighted leaf becomes visible).

**Rationale**: FR-011 (clarified) requires collapsed ancestor folders of the current branch to show an indicator. The check is a simple recursive "contains current" predicate computed at render time from the already-available `branch.current` flag — no new data needed.

**Alternatives considered**:
- Auto-expand the folder containing the current branch. Rejected by clarification (user chose indicator, not auto-expand).

## R7 — Are any new dependencies needed?

**Decision**: No. The tree builder is pure TypeScript; the renderer uses React (already present) and `lucide-react` icons (`ChevronRight`/`ChevronDown` already imported in `Sidebar.tsx`); persistence uses `localStorage`.

**Rationale**: Constitution Principle V (Simplicity) and the spec's Assumptions require no new dependencies. All primitives are already in the project.

**Alternatives considered**:
- Use a tree-view library (e.g. `react-arborist`). Rejected: adds a dependency for a shallow, self-contained tree; violates YAGNI and Principle V.

## R8 — Does the feature need any new IPC channels?

**Decision**: No. All data (`branches`, `tags`) is already in the store. Expand/collapse state is renderer-local (`localStorage`).

**Rationale**: Constitution Principle II requires touching the four IPC layers for any new channel. Since no new data crosses the main↔renderer boundary, the IPC contract is untouched — the lowest-risk option.

**Alternatives considered**:
- Add `getRefTree` IPC. Rejected (see R1).
