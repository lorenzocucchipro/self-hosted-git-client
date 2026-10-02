# Feature Specification: Sidebar Folder Tree for Branches and Tags

**Feature Branch**: `001-sidebar-folder-tree`

**Created**: 2026-10-01

**Status**: Draft

**Input**: User description: "In the sidebar I want to add to the view a folder structure to improve the view of the different sections. For example `Local branches` shows the branches as a title, while I prefer that every `/` becomes a folder. Something like `feature/epic-1/taskA` and `feature/epic-1/taskB` I expect to visualize them as: `feature -> epic-1 -> taskA` and `feature -> epic-1 -> taskB`. So `feature` is a folder that contains a list of branches like `epic-1`, `epic-2`, `branch-3`; `epic-1` itself is a folder with other branches in it; `taskA` and `taskB` are branches. Every folder has to be shown both closed or open through a classic icon that lets the user open and close, like an arrow `>` that changes its aspect based on if the folder is open or closed. This behaviour has to be valid for: local branches, remote branches, tags."

## Clarifications

### Session 2026-10-01

- Q: When a folder is collapsed and it contains the currently checked-out branch (or another highlighted reference) as a descendant leaf, should the folder display an indicator that it contains the current branch? → A: Yes — collapsed folders containing the current branch show a small indicator (e.g. a dot, badge, or accent on the chevron/label) so users can locate it without expanding.
- Q: How should sibling folders and leaves be ordered within each folder in the tree? → A: Preserve the order returned by git (as the backend provides it), no re-sorting.
- Q: Should users be able to expand and collapse folders using the keyboard (e.g. arrow keys), in addition to clicking the chevron with the mouse? → A: No — mouse/touch click on the chevron only; keyboard navigation is out of scope for this feature.
- Q: When a folder contains only a single child (one sub-folder or one leaf), should it still be rendered as an expandable folder, or should single-child paths be flattened? → A: Always render every `/`-separated segment as its own folder, even single-child paths — preserves the exact name structure.
- Q: When a branch or tag is deleted (or fetched/added) and a folder that previously had children becomes empty, or a new folder needs to appear, how should the tree handle the now-empty folder? → A: Auto-remove folders that become empty after a refresh — folders only exist when they contain at least one leaf.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse nested local branches as a collapsible folder tree (Priority: P1)

A user with many local branches organized using slash-separated names (e.g. `feature/epic-1/taskA`, `feature/epic-1/taskB`, `feature/epic-2/taskC`, `bugfix/login`) opens the sidebar and sees the "Local branches" section rendered as a hierarchical folder tree instead of a flat list. Each path segment before the last `/` becomes a collapsible folder node; the final segment is a leaf branch node. The user can click the arrow/chevron icon beside any folder to expand or collapse it, revealing or hiding its children. When collapsed, only the folder name is shown; when expanded, its child folders and branch leaves are listed underneath, indented to reflect the hierarchy.

**Why this priority**: Local branches are the most frequently used reference type. Converting the flat list into a tree is the core value of the feature and the foundation the other two sections (remotes, tags) build on.

**Independent Test**: Open a repository that contains at least a few slash-separated local branch names; confirm the tree renders folders and leaves correctly and that expanding/collapsing a folder shows/hides its children.

**Acceptance Scenarios**:

1. **Given** a repository with local branches `feature/epic-1/taskA` and `feature/epic-1/taskB`, **When** the user opens the sidebar "Local branches" section, **Then** a single `feature` folder is shown containing an `epic-1` folder, which in turn contains `taskA` and `taskB` leaves.
2. **Given** the tree is rendered with `feature` collapsed, **When** the user clicks the chevron next to `feature`, **Then** the `epic-1` child folder appears; clicking again collapses it and hides all descendants.
3. **Given** local branches with no slash (e.g. `main`, `develop`), **When** the section is rendered, **Then** they appear as top-level leaf nodes alongside any top-level folders.
4. **Given** a branch whose name shares a folder prefix with others but also exists as a leaf at that level (e.g. `feature` and `feature/epic-1/taskA`), **When** the tree is rendered, **Then** both the `feature` leaf and the `feature` folder are represented without one hiding the other.

---

### User Story 2 - Browse nested remote branches as a collapsible folder tree (Priority: P2)

A user opens the "Remote branches" section of the sidebar and sees remote tracking branches (e.g. `origin/feature/epic-1/taskA`, `origin/feature/epic-2/taskB`) rendered as the same kind of collapsible folder tree. The remote name (e.g. `origin`) is treated as the top-level grouping, and everything after it is split on `/` into folders and leaves, exactly as for local branches. Expand/collapse behaviour is identical to local branches.

**Why this priority**: Remote branches are the second most common reference and share the same nesting pattern. Reusing the tree presentation keeps the sidebar consistent.

**Independent Test**: Open a repository with at least one remote containing slash-separated branch names; confirm the remote name appears as a top-level node and the nested branches render as folders/leaves beneath it, expandable and collapsible.

**Acceptance Scenarios**:

1. **Given** remote branches `origin/feature/epic-1/taskA` and `origin/feature/epic-2/taskB`, **When** the user opens "Remote branches", **Then** an `origin` top-level node is shown containing a `feature` folder, which contains `epic-1` and `epic-2` folders, each containing their respective task leaves.
2. **Given** a repository with multiple remotes (e.g. `origin` and `upstream`), **When** the section is rendered, **Then** each remote is a separate top-level node, each independently expandable/collapsible.
3. **Given** a collapsed `origin` node, **When** the user clicks its chevron, **Then** its child folders/leaves are revealed; clicking again collapses it.

---

### User Story 3 - Browse tags as a collapsible folder tree (Priority: P3)

A user opens the "Tags" section of the sidebar and sees tags (e.g. `v1.0.0`, `release/v1.0.0`, `release/v1.1.0-rc1`) rendered as the same collapsible folder tree. Tags without a slash appear as top-level leaves; tags with slashes are split into folders and a leaf exactly as branches are. Expand/collapse behaviour is identical to the other sections.

**Why this priority**: Tags are used less frequently than branches but follow the same naming conventions; applying the tree uniformly keeps the sidebar coherent.

**Independent Test**: Open a repository with a mix of flat and slash-separated tag names; confirm flat tags appear as leaves and nested tags appear as folders/leaves, all expandable/collapsible.

**Acceptance Scenarios**:

1. **Given** tags `v1.0.0`, `release/v1.0.0` and `release/v1.1.0-rc1`, **When** the user opens "Tags", **Then** `v1.0.0` appears as a top-level leaf and a `release` folder appears containing `v1.0.0` and `v1.1.0-rc1` leaves.
2. **Given** the `release` folder is collapsed, **When** the user clicks its chevron, **Then** its child tags are revealed; clicking again hides them.

---

### Edge Cases

- **Empty section**: When a section (local branches, remote branches, or tags) has no entries, the section renders its existing empty state and no folder tree is shown.
- **Single-segment names**: Names with no `/` (e.g. `main`, `v1.0.0`) always render as a leaf, never as a folder.
- **Name collision between a folder and a leaf at the same path**: If both `feature` (a branch/tag) and `feature/x` exist, both the `feature` leaf and the `feature` folder are shown at the same level so neither reference is hidden.
- **Deeply nested names**: Trees with many levels of nesting must remain navigable; indentation and expand/collapse must work at every depth without performance degradation on repositories with hundreds of branches/tags.
- **Large repositories**: Repositories with a high number of branches/tags must render the tree without noticeable lag; collapsing folders keeps the visible node count manageable.
- **Special characters in names**: Branch/tag names containing characters other than `/` (e.g. `-`, `.`, `_`) are displayed verbatim as folder/leaf labels.
- **Sibling ordering**: Sibling folders and leaves are displayed in the order the git backend returns them; no alphabetical or type-based re-sorting is applied, so the tree order matches the backend's reference order.
- **Keyboard navigation**: Expand/collapse is mouse/touch only; keyboard navigation of the tree is out of scope for this feature.
- **Single-child folders**: Every `/`-separated segment is always rendered as its own folder, even when it contains only one child; single-child paths are never flattened or merged, so the tree always mirrors the exact name structure.
- **Empty folders after deletion**: Folders are derived from existing references only. When the last leaf under a folder is deleted, the folder is automatically removed on the next refresh; folders never persist as empty nodes.
- **Selection and actions**: Selecting a leaf branch/tag must continue to trigger the existing behaviour (e.g. checkout, view) exactly as it did in the flat list; folder nodes are not selectable as a checkout target.
- **Collapsed folder containing the current branch**: When the current branch is nested under one or more collapsed folders, each collapsed ancestor folder must show an indicator (e.g. a dot, badge, or accent) so the user can find the current branch without expanding. The indicator disappears once the folder is expanded and the highlighted leaf becomes visible.
- **Expand/collapse state persistence**: The expanded/collapsed state of folders MUST persist per repository across app restarts, so when the user reopens the app or switches back to a repository, the folders they had expanded remain expanded. State is scoped per repository (switching repositories does not carry the expand/collapse state from one repository to another).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The sidebar MUST render the "Local branches" section as a hierarchical folder tree where every `/` in a branch name separates a folder level, and the final segment is a leaf branch node.
- **FR-002**: The sidebar MUST render the "Remote branches" section as a hierarchical folder tree, treating the remote name as the top-level node and splitting the remainder of each remote tracking branch name on `/` into folders and a leaf.
- **FR-003**: The sidebar MUST render the "Tags" section as a hierarchical folder tree using the same `/`-based splitting rules as local and remote branches.
- **FR-004**: Every folder node MUST display a toggle icon (chevron/arrow) that changes appearance based on whether the folder is expanded or collapsed (e.g. `>` when collapsed, `v` when expanded).
- **FR-005**: Clicking a folder's toggle icon MUST expand or collapse it, showing or hiding all of its descendant folders and leaves.
- **FR-006**: Folder nodes MUST be visually indented relative to their parent so the hierarchy depth is clear at every level.
- **FR-007**: Leaf nodes (actual branches/tags) MUST remain selectable and MUST trigger the same actions (e.g. checkout, view details) that were available for them in the previous flat list.
- **FR-008**: Folder nodes MUST NOT be treated as a checkout target; selecting a folder does not perform a checkout.
- **FR-009**: When a branch/tag name has no `/`, it MUST be rendered as a top-level leaf node, not a folder.
- **FR-010**: When both a leaf and a folder share the same path prefix (e.g. `feature` and `feature/x`), both MUST be displayed at the same level without one hiding the other.
- **FR-011**: The currently checked-out branch (and any other currently highlighted reference) MUST remain visually highlighted/indicated when rendered as a leaf in the tree, regardless of its nesting depth. When the containing folder is collapsed (and the leaf is therefore hidden), every collapsed ancestor folder MUST display a small indicator (e.g. a dot, badge, or accent on the chevron/label) showing that the current branch is contained within it, so users can locate the current branch without expanding.
- **FR-012**: The tree MUST reflect the current set of branches/remotes/tags: adding, deleting, or fetching new references updates the tree on the next sidebar refresh, with new folders/leaves appearing and removed ones disappearing.
- **FR-013**: The expand/collapse interaction MUST be responsive enough that toggling a folder in a repository with hundreds of branches/tags completes without perceptible lag.
- **FR-014**: The folder tree presentation MUST be applied consistently to all three sections (local branches, remote branches, tags) so the visual language and interaction model are identical across them.
- **FR-015**: The expand/collapse state of folders MUST persist per repository across app restarts. When the user reopens the app or switches back to a previously visited repository, folders that were expanded MUST be rendered expanded; state is scoped per repository and is not shared between repositories.
- **FR-016**: Sibling folders and leaves within each folder MUST be displayed in the order returned by the git backend (as the backend provides the reference list), without any re-sorting by the tree presentation layer.
- **FR-017**: Expand/collapse interaction MUST be available via mouse/touch click on a folder's toggle icon only. Keyboard navigation of the tree (arrow-key movement, keyboard expand/collapse) is explicitly out of scope for this feature.
- **FR-018**: Every `/`-separated segment of a branch/tag name MUST be rendered as its own folder node, even when a folder contains only a single child. Single-child intermediate paths MUST NOT be flattened or merged; the tree always reflects the exact segment structure of each name.
- **FR-019**: Folders are derived from existing references only. When a refresh causes a folder to have no remaining leaves (e.g. after the last branch under a prefix is deleted), the empty folder MUST be automatically removed from the tree. Folders only exist while they contain at least one leaf; new folders appear when a reference with a new prefix is added.

### Key Entities *(include if feature involves data)*

- **Tree Node**: A single entry in the rendered tree. Has a label (the path segment), a type (folder or leaf), a depth/indent level, and an expand/collapse state (folders only). A leaf node corresponds to an actual branch or tag; a folder node is a grouping derived from shared path prefixes and has no corresponding git ref.
- **Reference**: An underlying git reference (local branch, remote tracking branch, or tag) that becomes a leaf in the tree. Retains all existing metadata and actions (checkout, view, etc.).
- **Tree Section**: One of the three sidebar groupings (Local branches, Remote branches, Tags) that each render an independent folder tree from their underlying references.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can locate a specific nested branch or tag in the sidebar in under 5 seconds by expanding the relevant folders, compared to scanning a flat list.
- **SC-002**: A repository with 200+ slash-separated branch/tag names renders the full tree in under 1 second with no perceptible lag when expanding or collapsing any folder.
- **SC-003**: 100% of existing branch/tag actions (checkout, view, delete, etc.) remain available and functional when references are presented as tree leaves.
- **SC-004**: All three sections (local branches, remote branches, tags) present references using the identical folder-tree visual language and interaction model, so a user who learns the behaviour on one section can use the others without relearning.
- **SC-005**: Users can expand or collapse any folder with a single click, and the toggle icon clearly communicates the current state (expanded vs. collapsed) at a glance.

## Assumptions

- The existing sidebar already groups references into "Local branches", "Remote branches", and "Tags" sections; this feature changes the presentation within those sections from a flat list to a folder tree, not the sections themselves.
- The existing per-reference actions (checkout, view, delete, etc.) remain unchanged; only how references are listed and navigated changes.
- Branch and tag names use `/` as the only hierarchy separator; other characters (`-`, `.`, `_`) are part of a single segment and do not create nesting.
- Remote tracking branch names always begin with the remote name followed by `/` (standard git convention), so the remote name is reliably the top-level node in the remote branches tree.
- The expand/collapse state of folders persists per repository across app restarts; the first time a repository is opened (no stored state), all folders start collapsed.
- The feature is scoped to the sidebar presentation only; no changes to how git operations are performed or to the underlying data model.
- The application's existing theming/branding tokens continue to govern all colors and icons used in the tree.
- Keyboard navigation of the folder tree is out of scope; expand/collapse is performed via mouse/touch click on the toggle icon only.
