# Research: Sidebar Reference Name Visibility

**Date**: 2026-10-01 | **Spec**: [spec.md](./spec.md)

## Research Tasks

### R1: How to conditionally set a native `title` only when text is truncated

**Decision**: Measure overflow on `mouseenter` using `scrollWidth > clientWidth` on the text element, and set/remove the `title` attribute dynamically via a React ref.

**Rationale**: The native `title` attribute is static HTML — it cannot be "shown only sometimes" without JS. The most idiomatic React approach is a small hook that, on `mouseenter`, checks whether the rendered text overflows its container (`element.scrollWidth > element.clientWidth`). If it does, the hook sets `element.title` to the full name; if it doesn't, it clears `element.title`. This is cheap (one DOM read per hover), requires no new dependencies, and works with the existing `truncate` (CSS `text-overflow: ellipsis`) classes already on the rows.

**Alternatives considered**:
- *Always set `title`*: Simplest, but violates FR-003 (rows that fit must not show a tooltip). Rejected.
- *Measure on render with ResizeObserver*: More complex; would need to observe every row and re-measure on sidebar resize. Overkill for a hover-triggered affordance. Rejected in favour of the simpler `mouseenter` measurement.
- *Custom tooltip component (e.g. Radix Popover)*: Violates FR-010 (must use native `title`, no custom component) and constitution principle V (minimal dependencies). Rejected.

### R2: Existing `title` usage on sidebar rows and how to unify it

**Decision**: Replace the existing inconsistent `title` attributes on sidebar rows with the unified conditional mechanism. Currently:
- `BranchRow.tsx` line 59: `title={remote ? branch.name : undefined}` — only remote branches get a static `title`; local branches get none.
- `RefTree.tsx` line 86: tag leaves have `title={node.ref.name}` — always set, even when the name fits.
- `RefTree.tsx` folder rows: no `title` at all.

All three are replaced by the conditional hook so the behaviour is uniform: `title` appears only when the label is truncated, showing the full name (leaf) or full path (folder).

**Rationale**: The spec (FR-006, FR-009, FR-011) requires identical behaviour across all three sections and truncation-only triggering. Keeping the old static titles would produce tooltips on non-truncated rows (violating FR-003) and inconsistent behaviour between local branches (no title), remote branches (always title), and tags (always title). Replacing them with the hook unifies everything.

**Alternatives considered**:
- *Keep existing static titles and only add the hook to rows without one*: Would leave remote branches and tags with always-on tooltips even when they fit, violating FR-003. Rejected.
- *Remove existing titles and don't replace them*: Would lose the name-reveal entirely for remote branches and tags. Rejected.

### R3: What full name/path to show for each row type

**Decision**:
- **Leaf branches** (local): `branch.name` (the full branch name, e.g. `feature/epic-1/taskA`).
- **Leaf branches** (remote): `branch.name` (already includes the remote prefix, e.g. `origin/feature/epic-1/taskA` — the backend returns the full remote tracking name).
- **Leaf tags**: `tag.name` (the full tag name, e.g. `release/v1.1.0-rc1`).
- **Folder nodes**: `node.path` (the full folder path built by `buildRefTree`, e.g. `feature/epic-1`).

**Rationale**: The `RefTreeNode` already carries `path` (for folders) and `ref.name` (for leaves), so no new data is needed — the hook just needs to receive the full text string. This satisfies FR-001, FR-002, and FR-005.

**Alternatives considered**:
- *Show only the visible segment*: Defeats the purpose — the user already sees the segment; they need the full name. Rejected.
- *Show the full path for leaves too (e.g. `feature/epic-1/taskA` for a leaf)*: For leaves, `ref.name` already IS the full path, so this is the same as the decision. No alternative needed.

### R4: Interaction with the "current branch inside" indicator on collapsed folders

**Decision**: The `title` is set on the folder's `<button>` element (or its text `<span>`), while the "current branch inside" indicator is a separate `<span>` with its own `title="Current branch is inside"`. They coexist on the same row without conflict — the folder row's name-reveal `title` is on the text element, and the indicator's `title` is on the badge element.

**Rationale**: The existing code (RefTree.tsx lines 100-114) already has the indicator as a separate `<span>` with its own `title`. Setting the folder's name-reveal `title` on the text `<span>` (or the `<button>`) keeps them independent. When the user hovers the text, they see the folder path; when they hover the badge, they see "Current branch is inside".

**Alternatives considered**:
- *Put both titles on the same element*: The browser shows only one `title` per element; combining would lose one. Rejected.

### R5: Performance of overflow measurement with many rows

**Decision**: Measurement happens only on `mouseenter` for the single hovered row — a single `scrollWidth > clientWidth` comparison. No measurement is done for non-hovered rows, so performance is O(1) per hover regardless of tree size.

**Rationale**: The spec (FR-009, SC-001) requires the tooltip to appear within the standard OS delay. A single DOM property read is sub-millisecond and does not block the frame. No ResizeObserver, no layout thrashing, no per-row measurement on render.

**Alternatives considered**:
- *Pre-measure all rows on render*: Would cause layout thrashing with hundreds of rows. Rejected.
- *Debounce the measurement*: Unnecessary — a single `scrollWidth` read is already faster than any debounce timeout. Rejected.
