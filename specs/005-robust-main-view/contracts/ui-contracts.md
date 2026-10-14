# UI Component Contracts: Robust Main View

**Date**: 2026-10-13

This document defines the contracts for new and significantly modified
components. Existing components that are only touched minimally (e.g.
`StatusBar`, `TitleBar`) are not included.

## New Components

### ErrorBoundary

**Purpose**: Catches rendering errors in a subtree and shows a fallback
instead of a blank window.

**Props**:
| Prop | Type | Description |
|------|------|-------------|
| `children` | `ReactNode` | The subtree to guard |
| `fallback` | `ReactNode \| ((error: Error) => ReactNode)` | Fallback UI |

**Contract**:
- Catches errors thrown during render, in lifecycle methods, and in
  constructors of the whole tree below it.
- Shows the fallback (or `fallback(error)`) when an error is caught.
- Does NOT catch errors in event handlers, async code, or effects (those
  are handled by the store's `showToast` error path).
- Used in `App.tsx` to wrap: the left sidebar, the center pane, and the
  right pane — each independently, so a crash in one doesn't hide the others.

---

### CommitTable

**Purpose**: Renders the commit history as a CSS grid table with a sticky
header and a virtualized body.

**Props**:
| Prop | Type | Description |
|------|------|-------------|
| `commits` | `Commit[]` | Full commit list (not capped) |
| `layout` | `GraphLayout` | Computed graph layout (lanes, edges) |
| `columnWidths` | `ColumnWidths` | Current column widths |
| `graphWidth` | `number` | Fixed graph column width |
| `selection` | `Selection` | Current selection |
| `searchMatches` | `Set<string> \| null` | Search filter |
| `status` | `RepoStatus \| null` | Repo status (for WIP row) |
| `stashes` | `Stash[]` | Stash list |
| `currentBranch` | `string \| null` | Current branch name |
| `detached` | `boolean` | Detached HEAD |
| `onSelectCommit` | `(hash: string) => void` | Stable callback |
| `onSelectWip` | `() => void` | Stable callback |
| `onResizeColumn` | `(col, width) => void` | Stable callback |
| `onResetColumns` | `() => void` | Stable callback |

**Contract**:
- Header and all rows share a single `gridTemplateColumns` derived from
  `columnWidths` + `graphWidth` via `columnLayout.ts`.
- `min-width` on the grid container = sum of all track widths → horizontal
  scroll when content exceeds container.
- Graph column track = `minmax(graphWidth, graphWidth)` (fixed, not resizable).
- All other columns have a `ColumnDivider` in the header.
- Body is virtualized: only visible rows + overscan are in the DOM.

---

### CommitRow (memoized)

**Purpose**: Renders a single commit row in the grid. Must be independently
memoizable.

**Props**: See `data-model.md` → `CommitRow`.

**Contract**:
- Wrapped in `React.memo` with shallow prop comparison.
- All callback props are stable (`useCallback` in `CommitTable`).
- Uses the same `gridTemplateColumns` as the header (inherited via CSS).
- SVG graph cell is a direct child (no wrapper div that would break grid).

---

### GraphCell

**Purpose**: Renders the SVG graph (lanes, edges, node) for a single row.

**Props**:
| Prop | Type | Description |
|------|------|-------------|
| `row` | `GraphRow` | Layout data |
| `commit` | `Commit` | Commit data (for pushed/stash state) |
| `graphWidth` | `number` | SVG width |
| `rowHeight` | `number` | SVG height |
| `isStash` | `boolean` | Whether this is a stash row |

**Contract**:
- Pure SVG, no state, no effects.
- Width = `graphWidth`, height = `rowHeight` (measured or fixed).
- Lanes, edges, and node drawn from `row.incoming`, `row.outgoing`,
  `row.passing`, `row.col`, `row.color`, `row.current`.

---

### ColumnDivider

**Purpose**: Push-semantics resize handle for a single column.

**Props**:
| Prop | Type | Description |
|------|------|-------------|
| `column` | `keyof ColumnWidths` | Which column this divider controls |
| `currentWidth` | `number` | Current width of the column |
| `minWidth` | `number` | Minimum width (from `MIN_COLUMN_WIDTHS`) |
| `onResize` | `(width: number) => void` | Called with new width during drag |

**Contract**:
- On `pointerdown`: capture pointer, record start X and start width.
- On `pointermove`: compute `newWidth = max(minWidth, startWidth + delta)`.
  Call `onResize(newWidth)`. No max-clamp (push semantics).
- On `pointerup`: release pointer capture. The store's `resizeColumn`
  debounces persistence.
- Visual: 8px wide, transparent, with a visible 1px line on hover.
- If the column is `description` and currently `null` (flex), pin it to the
  measured DOM width on first drag (not a hardcoded fallback).

---

### columnLayout (pure function)

**Purpose**: Derive the grid template and minimum width from column widths.

**Signature**:
```typescript
function buildGridLayout(
  columnWidths: ColumnWidths,
  graphWidth: number
): { gridTemplateColumns: string; tableMinWidth: number }
```

**Contract**:
- `gridTemplateColumns` is a space-separated list of CSS track values:
  - Graph: `minmax({graphWidth}px, {graphWidth}px)`
  - Each resizable column: `{width}px` (or `1fr` if `description === null`)
- `tableMinWidth` = sum of all fixed track widths + `MIN_COLUMN_WIDTHS.description`
  (for the flex case).
- Pure: no side effects, no DOM access, deterministic from inputs.
- Unit-tested in `columnLayout.test.ts`.

## Modified Components

### App.tsx

**Changes**:
- Remove local `rightWidth` state; read from store.
- Add left sidebar resize handle (mirrors the existing right handle).
- Wrap each pane in `<ErrorBoundary>`.
- Render collapse slivers when sidebars are closed.
- Apply max-width clamp on sidebar drag and window resize.

### Sidebar.tsx

**Changes**:
- Use `sidebarWidth` from store instead of hardcoded `w-60`.
- No other behavior change (content, sections, context menus unchanged).

### Toolbar.tsx

**Changes**:
- Add right sidebar toggle button (mirrors the existing left toggle).
- Add Graph/Diff toggle button with pending-diff indicator (accent dot when
  `pendingDiff !== null` and `!editorOpen`).

### DiffEditor.tsx

**Changes**:
- Add Graph/Diff toggle button to the left of the existing X button.
- Toggle calls `toggleEditorView()` (not `closeEditor()`).
- X button unchanged (still calls `closeEditor()`).

### useStore.ts

**Changes**:
- Add `sidebarOpen`, `sidebarWidth`, `rightOpen`, `rightWidth` state.
- Add `setSidebarWidth`, `setRightWidth`, `toggleSidebar`, `toggleRightSidebar`
  actions (persisted via `savePrefs`).
- Add `pendingDiff: EditorSnapshot | null` state.
- Add `toggleEditorView()` action (snapshot/restore logic).
- Remove `800` cap in `refreshAll` → `getCommits(p)` (no limit arg, or a very
  high limit).
- `closeEditor()` also clears `pendingDiff`.
- `activateRepo()` also clears `pendingDiff`.

### prefs.ts

**Changes**:
- Extend `Prefs` interface with `sidebarOpen`, `sidebarWidth`, `rightOpen`,
  `rightWidth`.
- Update `loadPrefs()` and `savePrefs()` to include the new fields.
- Defaults: `sidebarOpen: true, sidebarWidth: 240, rightOpen: true, rightWidth: 504`.
