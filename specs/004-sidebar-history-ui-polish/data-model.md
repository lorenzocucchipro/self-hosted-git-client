# Data Model

**Date**: 2026-10-02 | **Spec**: [spec.md](./spec.md)

## Entities

### ColumnWidths (existing — no schema change)

Per-repository user-chosen widths for the commit-history table columns.

| Field | Type | Description |
|-------|------|-------------|
| `refs` | `number` | Width in px of the Refs column |
| `description` | `number \| null` | Width in px, or `null` for flex (fill remaining space) |
| `author` | `number` | Width in px of the Author column |
| `date` | `number` | Width in px of the Date column |
| `sha` | `number` | Width in px of the SHA column |

**Note**: The Graph column is NOT in `ColumnWidths` — it auto-sizes from the
rendered graph layout (`graphWidth = layout.width * LANE_W + PAD * 2`) and is
never persisted or user-resizable.

**Persistence**: Stored as `repoColumnWidths: Record<string, ColumnWidths>` in
`state.json` (Electron `userData`), keyed by absolute repo path. Managed by
`src/main/services/store.ts`. `null` / absent entry → `DEFAULT_COLUMN_WIDTHS`.

**Defaults** (`DEFAULT_COLUMN_WIDTHS` in `useStore.ts`):
refs: 200, description: null (flex), author: 160, date: 80, sha: 64.

**Minimums** (`MIN_COLUMN_WIDTHS` in `useStore.ts`):
refs: 80, description: 120, author: 100, date: 60, sha: 50.

### RefTreeNode (existing — no schema change)

Sidebar folder-tree node. Already carries `depth: number` used for indentation.

| Field | Type | Description |
|-------|------|-------------|
| `kind` | `'folder' \| 'leaf-branch' \| 'leaf-tag'` | Node type |
| `label` | `string` | Display label (last path segment) |
| `path` | `string` | Full slash-separated path |
| `depth` | `number` | Nesting depth (0 = root) |
| `children` | `RefTreeNode[]` | Only on `folder` nodes |
| `ref` | `Branch \| Tag \| null` | Only on leaf nodes |

**No new entities, fields, or relationships are introduced by this feature.**
The data model is unchanged; this feature is a pure presentation/layout fix.

## Validation Rules

- Column widths must be ≥ `MIN_COLUMN_WIDTHS[col]` at all times (enforced
  during drag in `ColumnDivider`).
- `description: null` is valid and means "flex" (fill remaining space).
- Sidebar indentation step is a constant (20px), applied as
  `paddingLeft: depth * 20px` — not a data field, a rendering rule.

## State Transitions

No state transitions. Column widths transition from `DEFAULT_COLUMN_WIDTHS`
→ user-resized values → persisted, and back to defaults on reset. This
lifecycle already exists from spec 003 and is unchanged.
