# Phase 1: Data Model

## Entities

### RefTreeNode

A single node in the rendered folder tree. Produced by the pure `buildRefTree()` helper from the existing `Branch[]` / `Tag[]` arrays.

| Field | Type | Description |
|--------|------|-------------|
| `kind` | `'folder' \| 'leaf-branch' \| 'leaf-tag'` | Distinguishes grouping folders from selectable leaves. |
| `label` | `string` | The single path segment shown in the UI (e.g. `feature`, `epic-1`, `taskA`, `v1.0.0`). Never contains `/`. |
| `path` | `string` | The full prefix up to and including this node, used as the persistence key for expand/collapse state (e.g. `feature`, `feature/epic-1`). For remote branches the remote name is the first segment (e.g. `origin`, `origin/feature`). |
| `depth` | `number` | Zero-based indent level; top-level nodes are depth 0. Drives left-padding in the renderer. |
| `children` | `RefTreeNode[]` | Present and non-empty for `kind: 'folder'`. Empty/absent for leaves. Order = encounter order from the source array (FR-016, no re-sorting). |
| `ref` | `Branch \| Tag \| null` | The underlying git reference for leaves; `null` for folders (folders have no git ref — FR-008). |

### ExpandedState

The persisted expand/collapse state for one repository.

| Field | Type | Description |
|--------|------|-------------|
| `expandedPaths` | `Set<string>` | Set of full folder `path` values (see `RefTreeNode.path`) that are expanded. Absence = collapsed. Persisted per repo path in `localStorage`. |

## Validation rules (from requirements)

- **FR-009 / single-segment names**: a name with no `/` produces a single leaf at depth 0 (no folder).
- **FR-010 / leaf+folder collision**: a `feature` leaf and a `feature` folder can coexist as siblings. The builder keys children by `(label, kind)` so neither overwrites the other.
- **FR-016 / ordering**: `children` arrays preserve the order in which refs were encountered in the source `branches`/`tags` array (git's `for-each-ref` order). No sort is applied.
- **FR-018 / single-child folders**: every `/`-separated segment always becomes a folder, even with one child. The builder never merges segments.
- **FR-019 / empty folders**: folders exist only because a leaf under them exists. When the last leaf is removed (next refresh), the folder disappears automatically because the tree is rebuilt from the current `branches`/`tags` on each render/refresh — empty folders are never stored or retained.

## State transitions

- **Folder expand**: user clicks chevron → `expandedPaths.add(path)` → persist → re-render shows children.
- **Folder collapse**: user clicks chevron → `expandedPaths.delete(path)` → persist → re-render hides children.
- **Refresh**: `refreshAll()` updates `branches`/`tags` → tree is rebuilt from scratch → folders with no remaining leaves vanish (FR-019); `expandedPaths` is retained but stale entries (folders that no longer exist) are ignored/ignored on read.
- **Repo switch**: `expandedPaths` is loaded from `localStorage` keyed by the new repo path; the previous repo's state is untouched (FR-015).

## Derived flag: containsCurrent

Computed at render time (not stored): for each folder node, `containsCurrent = children.some(c => c.kind === 'leaf-branch' && c.ref.current) || children.some(c => c.kind === 'folder' && c.containsCurrent)`. When the folder is collapsed and `containsCurrent` is true, the renderer shows the indicator (FR-011).
