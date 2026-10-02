# Data Model

## Entities

### ColumnWidths

The user's chosen widths for the five resizable data columns of the commit history table,
for a single repository.

| Field | Type | Description |
|-------|------|-------------|
| `refs` | `number` | Width in px of the Refs column |
| `description` | `number` | Width in px of the Description column |
| `author` | `number` | Width in px of the Author column |
| `date` | `number` | Width in px of the Date column |
| `sha` | `number` | Width in px of the SHA column |

**Relationships**: One `ColumnWidths` per repository path. Stored as
`Record<repoPath, ColumnWidths>` in the main-process persisted state. The Graph column
is **not** part of this entity — its width is derived from the branch-lane layout
(`graphWidth`) and is never user-resizable.

**Validation rules**:
- Every field MUST be a positive integer (px).
- Each field MUST be >= its column's minimum width
  (Refs 80, Description 120, Author 100, Date 60, SHA 50).
- A missing or invalid field falls back to the default width for that column.

**Defaults** (applied when a repo is opened for the first time):
- `refs` = 200 (matches the existing `REFS_W` constant)
- `description` = flex-1 fill (represented as `null` in storage; the column takes all
  remaining space after the fixed columns — see State Transitions below)
- `author` = 160 (matches the existing `w-40` = 160px)
- `date` = 80 (matches the existing `w-20` = 80px)
- `sha` = 64 (matches the existing `w-16` = 64px)

> **Note on `description`**: The Description column is the "flex" column — it absorbs the
> space left by the other columns so the row fills the available width. When persisted,
> a `null` description width means "use flex"; a numeric width means the user has
> explicitly resized it and that exact pixel width is restored. This keeps the default
> behavior (Description fills remaining space) identical to today, while still allowing
> the user to pin it to a specific width by dragging.

### ColumnLayoutState (renderer)

The in-memory representation of column widths for the currently active repository,
held in the Zustand store. It is the renderer-side view of the persisted `ColumnWidths`.

| Field | Type | Description |
|-----|------|-------------|
| `widths` | `ColumnWidths \| null` | `null` until loaded for the active repo |
| `loaded` | `boolean` | True once the widths for the active repo have been loaded |

**Relationships**: Derived from the persisted `ColumnWidths` for the active repo's path.
Reset to `null` when the active repo changes; reloaded by `loadColumnWidths(repoPath)`.

## State Transitions

```
[repo closed] --openRepo--> [loading] --loadColumnWidths--> [loaded (defaults or saved)]
[loaded] --drag divider--> [loaded (mutated widths)] --saveColumnWidths--> [loaded (persisted)]
[loaded] --"Reset to defaults"--> [loaded (defaults)] --saveColumnWidths (clears entry)--> [loaded (persisted defaults)]
[loaded] --closeRepo / switchTab--> [null] (cleared, reloaded for the new repo)
```

- **First open of a repo**: no saved entry exists → defaults are used → no entry is
  written until the user drags or resets.
- **Drag**: widths update in the store immediately (live resize); a debounced
  `saveColumnWidths` writes the new widths to the main-process store.
- **Reset**: the in-memory widths snap to defaults and the main-process entry for the
  repo is deleted (so the next open also shows defaults).
- **Repo switch**: the in-memory widths are cleared and reloaded for the new repo's
  path; the previous repo's widths are already persisted.

## Persistence Shape (main-process `state.json`)

The existing `PersistedState` interface in `src/main/services/store.ts` gains one field:

```typescript
interface PersistedState {
  recentRepos: RecentRepo[]
  openRepos: string[]
  activeRepo: string | null
  repoColumnWidths: Record<string, ColumnWidths> // NEW: keyed by absolute repo path
}
```

- The map is keyed by the repo's absolute path (same key used by `RecentRepo.path`).
- An absent key means "defaults" (first open).
- The whole map is read/written atomically with the rest of `state.json`.
