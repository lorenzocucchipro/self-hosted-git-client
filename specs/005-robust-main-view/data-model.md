# Data Model: Robust Main View

**Date**: 2026-10-13

## Entities

### ColumnWidths (existing, unchanged)

Per-repository persisted widths for the five resizable columns.

| Field | Type | Description |
|-------|------|-------------|
| `refs` | `number` | Width in px for the Refs column |
| `description` | `number \| null` | Width in px, or `null` for flex (fill remaining) |
| `author` | `number` | Width in px for the Author column |
| `date` | `number` | Width in px for the Date column |
| `sha` | `number` | Width in px for the SHA column |

**Persistence**: Per-repo JSON file in Electron `userData` via existing IPC
(`getColumnWidths`/`setColumnWidths`). No change to this entity.

**Validation**: Each width must be ≥ its minimum in `MIN_COLUMN_WIDTHS`.
`description` can be `null` (flex) or ≥ 120px.

---

### SidebarLayoutState (new)

Window-level persisted state for both sidebars.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `sidebarOpen` | `boolean` | `true` | Left sidebar visible |
| `sidebarWidth` | `number` | `240` | Left sidebar width in px |
| `rightOpen` | `boolean` | `true` | Right sidebar visible |
| `rightWidth` | `number` | `504` | Right sidebar width in px |

**Persistence**: `localStorage` via `lib/prefs.ts` (extends `Prefs` interface).
Not per-repository — window-level preference.

**Validation**:
- `sidebarWidth` clamped to `[180, innerWidth - rightWidth - centerMin]`.
- `rightWidth` clamped to `[360, innerWidth - sidebarWidth - centerMin]`.
- `centerMin` = 480px (assumption, confirmable during implementation).
- On window resize: re-clamp both so `sidebarWidth + rightWidth ≤ innerWidth - centerMin`.

**State transitions**:
- `open → closed`: user clicks toolbar toggle or sliver. Store `lastWidth`
  (the width before collapse) for restore. Set width to sliver width (e.g. 0
  or 8px for the sliver itself).
- `closed → open`: restore `lastWidth`. If `lastWidth` would violate the
  center minimum (e.g. window shrank while collapsed), clamp to max allowed.

---

### EditorSnapshot (new)

Snapshot of the diff view state when the user toggles to graph view.

| Field | Type | Description |
|-------|------|-------------|
| `filePath` | `string` | The file being diffed |
| `commitHash` | `string` | The commit the file belongs to (or `'wip'` for working changes) |
| `editorSearchOpen` | `boolean` | Whether the in-diff search bar was open |
| `editorSearchQuery` | `string` | The in-diff search query text |

**Persistence**: In-memory only (Zustand store). Not persisted to disk —
a pending diff is a transient session state, not a preference.

**Lifecycle**:
- **Created**: when the user clicks the Graph/Diff toggle while in diff view.
- **Restored**: when the user clicks the toggle while in graph view with a
  pending snapshot. The diff view reopens with the snapshotted file, commit,
  and search state.
- **Cleared**: when the user clicks the X (close + dismiss), switches
  repository tabs, or closes the repo.
- **Not modified**: selecting a different commit while in graph view updates
  `selection` and the right panel but does not touch the snapshot.

---

### EditorViewState (new, store-level)

Tracks the center view mode and pending diff.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `editorOpen` | `boolean` | `false` | `true` = diff view shown, `false` = graph shown |
| `pendingDiff` | `EditorSnapshot \| null` | `null` | Snapshot when toggled away from diff |

**State transitions**:

```
                    openEditor()
  graph ──────────────────────────→ diff
    ↑                                 │
    │  toggleEditorView()             │  toggleEditorView()
    │  (snapshot pendingDiff)         │  (restore from pendingDiff)
    └─────────────────────────────────┘
                    closeEditor()
  diff ──────────────────────────→ graph (clears pendingDiff)
```

- `openEditor()`: sets `editorOpen = true`. Used when clicking a file.
- `closeEditor()`: sets `editorOpen = false`, clears `pendingDiff`, clears
  `editorSearchOpen`/`editorSearchQuery`. The X button.
- `toggleEditorView()`: if `editorOpen`, snapshot current diff state into
  `pendingDiff` and set `editorOpen = false`. If `!editorOpen` and
  `pendingDiff` exists, restore from snapshot and set `editorOpen = true`.

---

### CommitRow (component contract, not persisted)

A single row in the virtualized history table. Not a data entity — a
rendering contract for memoization.

| Prop | Type | Description |
|------|------|-------------|
| `row` | `GraphRow` | Layout data (lanes, edges, node position) |
| `commit` | `Commit` | Commit data (hash, author, date, subject, refs) |
| `graphWidth` | `number` | Fixed graph column width in px |
| `columnWidths` | `ColumnWidths` | Current column widths |
| `selected` | `boolean` | Whether this row is the current selection |
| `dimmed` | `boolean` | Whether to dim (search filter active) |
| `currentBranch` | `string \| null` | Current branch name |
| `detached` | `boolean` | Detached HEAD state |
| `onClick` | `() => void` | Stable callback (useCallback in parent) |
| `onMenu` | `(e: MouseEvent) => void` | Stable callback |
| `onBranchMenu` | `(e: MouseEvent, g: BranchGroup) => void` | Stable callback |
| `onTagMenu` | `(e: MouseEvent, r: CommitRef) => void` | Stable callback |

**Memoization requirement**: `React.memo` with a shallow comparison. All
function props must be stable (`useCallback` in the parent) so that rows
that didn't change are not re-rendered during column resize or scroll.
