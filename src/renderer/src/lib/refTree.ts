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

type RefItem = Branch | Tag

function isBranch(ref: RefItem): ref is Branch {
  return 'current' in ref
}

/**
 * Build a folder tree from a list of refs by splitting each name on `/`.
 * - The last segment becomes a leaf; all preceding segments become folders.
 * - Sibling order is preserved as encountered (no re-sorting — FR-016).
 * - A leaf and a folder with the same label can coexist as siblings (FR-010).
 * - Every `/`-separated segment is rendered as its own folder, even with a
 *   single child (FR-018).
 */
export function buildRefTree(
  refs: RefItem[],
  opts: { leafKind: 'leaf-branch' | 'leaf-tag' }
): RefTreeNode[] {
  const roots: RefTreeNode[] = []
  const index = new Map<string, RefTreeNode>()

  for (const ref of refs) {
    const segments = ref.name.split('/')
    const leafLabel = segments[segments.length - 1]
    let parentPath = ''
    let depth = 0

    // Create or find ancestor folders.
    for (let i = 0; i < segments.length - 1; i++) {
      const label = segments[i]
      const path = parentPath ? `${parentPath}/${label}` : label
      let folder = index.get(`folder:${path}`)
      if (!folder) {
        folder = {
          kind: 'folder',
          label,
          path,
          depth,
          children: [],
          ref: null
        }
        index.set(`folder:${path}`, folder)
        if (parentPath) {
          const parent = index.get(`folder:${parentPath}`)
          if (parent && parent.kind === 'folder') {
            parent.children.push(folder)
          }
        } else {
          roots.push(folder)
        }
      }
      parentPath = path
      depth++
    }

    // Create the leaf node, coexisting with a same-label folder (FR-010).
    const leafPath = parentPath ? `${parentPath}/${leafLabel}` : leafLabel
    const leaf: RefTreeNode =
      opts.leafKind === 'leaf-branch'
        ? {
            kind: 'leaf-branch',
            label: leafLabel,
            path: leafPath,
            depth,
            ref: ref as Branch
          }
        : {
            kind: 'leaf-tag',
            label: leafLabel,
            path: leafPath,
            depth,
            ref: ref as Tag
          }

    if (parentPath) {
      const parent = index.get(`folder:${parentPath}`)
      if (parent && parent.kind === 'folder') {
        parent.children.push(leaf)
      }
    } else {
      roots.push(leaf)
    }
  }

  return roots
}

/** True if any descendant leaf-branch has `ref.current === true`. */
export function folderContainsCurrent(node: RefTreeNode): boolean {
  if (node.kind !== 'folder') return false
  for (const child of node.children) {
    if (child.kind === 'leaf-branch' && child.ref.current) return true
    if (child.kind === 'folder' && folderContainsCurrent(child)) return true
  }
  return false
}
