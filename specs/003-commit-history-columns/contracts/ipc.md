# IPC Contract: Column Width Persistence

This feature adds two new IPC channels following the project's 4-layer contract
(shared channel → main handler → preload bridge → renderer `call()`).

Every call returns the typed envelope `{ ok: true, data } | { ok: false, error }`.

## New Channels

### `app:getColumnWidths`

**Channel name**: `Channels.getColumnWidths` = `'app:getColumnWidths'`

**Direction**: renderer → main

**Args**: `(repoPath: string)`

**Returns**: `ColumnWidths | null`
- `null` when no saved widths exist for this repo (first open → use defaults).
- A `ColumnWidths` object when the repo has saved widths.

**Side effects**: None (pure read).

### `app:setColumnWidths`

**Channel name**: `Channels.setColumnWidths` = `'app:setColumnWidths'`

**Direction**: renderer → main

**Args**: `(repoPath: string, widths: ColumnWidths | null)`
- `widths` is a `ColumnWidths` object to save/replace.
- `null` clears the saved entry for this repo (used by "Reset column widths to
  defaults" so the next open also shows defaults).

**Returns**: `void`

**Side effects**: Updates the `repoColumnWidths` map in `state.json` and persists it.

## Shared Type (added to `src/shared/types.ts`)

```typescript
/** User-chosen widths (px) for the five resizable commit-history columns.
 *  `description: null` means "flex" (fill remaining space) — the default. */
export interface ColumnWidths {
  refs: number
  description: number | null
  author: number
  date: number
  sha: number
}
```

## Four-Layer Touch Points

1. **`src/shared/ipc.ts`** — add `getColumnWidths: 'app:getColumnWidths'` and
   `setColumnWidths: 'app:setColumnWidths'` to the `Channels` const.
2. **`src/main/ipc.ts`** — register both with `handle(Channels.x, …)`, delegating to
   `store.getColumnWidths(repoPath)` / `store.setColumnWidths(repoPath, widths)`.
3. **`src/preload/index.ts`** — add typed methods:
   - `getColumnWidths: (path: string) => invoke<ColumnWidths | null>(Channels.getColumnWidths, path)`
   - `setColumnWidths: (path: string, widths: ColumnWidths | null) => invoke<void>(Channels.setColumnWidths, path, widths)`
4. **Renderer** — call via `call(api.getColumnWidths(repo.path))` and
   `call(api.setColumnWidths(repo.path, widths))` from the Zustand store actions.

## Main-Process Store Service (extension of `src/main/services/store.ts`)

```typescript
// Added to PersistedState:
repoColumnWidths: Record<string, ColumnWidths>

// Added to the `store` export:
getColumnWidths(path: string): Promise<ColumnWidths | null>
setColumnWidths(path: string, widths: ColumnWidths | null): Promise<void>
```

- `getColumnWidths` returns the entry for `path` or `null` if absent.
- `setColumnWidths` with a non-null `widths` sets/replaces the entry; with `null`
  deletes the entry (reset). Both persist the full `state.json` atomically.

## Renderer Store Actions (extension of `src/renderer/src/store/useStore.ts`)

```typescript
// State:
columnWidths: ColumnWidths | null
columnWidthsLoaded: boolean

// Actions:
loadColumnWidths: (repoPath: string) => Promise<void>
resizeColumn: (col: keyof ColumnWidths, width: number) => void
resetColumnWidths: () => Promise<void>
```

- `loadColumnWidths` reads via IPC on repo open; sets `columnWidths` and
  `columnWidthsLoaded = true`.
- `resizeColumn` updates `columnWidths` in memory (live) and debounces a
  `setColumnWidths` IPC call.
- `resetColumnWidths` sets in-memory widths to defaults and calls
  `setColumnWidths(repoPath, null)` to clear the saved entry.
