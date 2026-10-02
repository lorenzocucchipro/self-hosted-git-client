# Renderer Component Contract: RefTree

This feature is a desktop-app UI change with no external API. The "contract" is the
internal interface the new `RefTree` component exposes to `Sidebar.tsx` and the pure
helper it consumes from `lib/refTree.ts`.

## `lib/refTree.ts` — pure helpers

```ts
import type { Branch, Tag } from '@shared/types'

export type RefTreeNode =
  | {
      kind: 'folder'
      label: string
      path: string
      depth: number
      children: RefTreeNode[]
      ref: null
    }
  | {
      kind: 'leaf-branch'
      label: string
      path: string
      depth: number
      ref: Branch
    }
  | {
      kind: 'leaf-tag'
      label: string
      path: string
      depth: number
      ref: Tag
    }

/**
 * Build a folder tree from a list of refs by splitting each name on `/`.
 * - For local branches: the full name is split; the last segment is a leaf.
 * - For remote branches: pass the remote-stripped name (the remote name is
 *   the first segment / top-level folder).
 * - For tags: the full name is split; the last segment is a leaf.
 * Sibling order is preserved as encountered (no re-sorting). A leaf and a
 * folder with the same label coexist as siblings.
 */
export function buildRefTree(
  refs: Array<Branch | Tag>,
  opts: { leafKind: 'leaf-branch' | 'leaf-tag'; stripRemote?: boolean }
): RefTreeNode[]

/** True if any descendant leaf-branch has `ref.current === true`. */
export function folderContainsCurrent(node: RefTreeNode): boolean
```

## `components/RefTree.tsx` — React component

```tsx
interface RefTreeProps {
  nodes: RefTreeNode[]
  /** repo path, used as the localStorage key for expand/collapse persistence */
  repoPath: string
  /** existing context-menu + confirm handlers passed through from Sidebar */
  onMenu: (e: React.MouseEvent, items: MenuItem[]) => void
  setConfirm: (c: { title: string; message: string; onConfirm: () => void }) => void
  /** whether branch leaves are remote (drives BranchRow actions) */
  remote?: boolean
}
```

Behaviour:
- Renders each top-level node; folders render a chevron (`ChevronRight` collapsed /
  `ChevronDown` expanded) + label, and recurse into `children` when expanded.
- Leaf-branch nodes delegate to the existing `BranchRow` (unchanged actions).
- Leaf-tag nodes render a tag icon + name (matching the current tag row style).
- Expand/collapse state is read/written via `loadExpandedFolders(repoPath)` /
  `saveExpandedFolders(repoPath, set)` from the prefs module.
- Collapsed folders with `folderContainsCurrent(node) === true` show an accent dot
  on the chevron/label (FR-011).
- Indentation scales with `node.depth` (FR-006).
- All colors via Tailwind semantic tokens (`app-*`); no hardcoded hex.

## `lib/prefs.ts` — additions

```ts
/** Per-repo set of expanded folder paths, persisted in localStorage. */
export function loadExpandedFolders(repoPath: string): Set<string>
export function saveExpandedFolders(repoPath: string, expanded: Set<string>): void
```

Keyed by `app-expanded-${repoPath}`. Returns an empty set when no state is stored
(first open → all collapsed, per Assumptions).

## IPC contract

Unchanged. No new channels in `src/shared/ipc.ts`, `src/main/ipc.ts`, or
`src/preload/index.ts`. The feature consumes only data already in the Zustand
store (`branches`, `tags`, `repo.path`).
