# Feature Specification: Sidebar & History Table UI Polish

**Feature Branch**: `004-sidebar-history-ui-polish`

**Created**: 2026-10-02

**Status**: Draft

**Input**: User description: "UI assessment: the changes that have been made so far in `specs/002`, `specs/003` aren't solid and reliable.
1. Talking about the sidebar, we've worked on indentation, but it's still weak and not perfect. In particular it works on first level folder, but nested folders inside a parent folder are misaligned and doesn't give to the user a clear idea of the hierarchy. You can see in the first screenshot as the folder `BPMA-1343` that is child inside folder `BPMA-1310` almost looks like at the same level of the parent. I expect the full structure to be perfectly indented in each level, to give clear evidence of the hierarchy.
2. Talking about the main view of the app with the graph history of the repository:
- columns are still fixed, there's no icon to grab with the mouse to change the width of the specific column
- Label in the header of the table as `Graph`, `Description` and the rest of them don't have the "title" to show the label while hovering the mouse and when they aren't fully displayed (as in the second screenshot)
- When the app window is small and the horizontal scrolling is active, when user scroll right appears still a white space and the text has an overflow in it and it looks very bad (third screenshot)"

## Clarifications

### Session 2026-10-02

- Q: Should the Graph column be freely resizable like the other columns, or kept fixed with a larger minimum width because the commit-graph lane rendering needs a stable width? → A: The Graph column is not user-resizable; it auto-sizes dynamically to the width required by the rendered graph lanes.
- Q: When a repository is opened for the first time (no saved column widths yet), should the table use the current fixed widths as the default, or auto-fit columns to the window width so all columns are visible without horizontal scrolling? → A: Use sensible per-column default widths (not tied to window size) and let horizontal scrolling appear as needed.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Clear Nested Hierarchy in the Sidebar (Priority: P1)

A user browsing the branch list sees a folder nesting depth that is visually unmistakable: every level of nesting is indented further than its parent, so a folder such as `BPMA-1343` inside `BPMA-1310` (inside `feature`) is immediately recognizable as a child, not a sibling.

**Why this priority**: The sidebar is the primary navigation surface of the app. A broken hierarchy misleads the user about which branches belong to which group and erodes trust in the tool. This was explicitly flagged as "weak and not perfect" in the assessment of the previous iteration.

**Independent Test**: Open a repository containing branches with at least three levels of nesting (e.g. `feature/BPMA-1310/BPMA-1343/...`) and visually verify that each level of the tree is clearly indented relative to its parent at every depth.

**Acceptance Scenarios**:

1. **Given** a repository with branches nested three or more levels deep, **When** the user expands all folders in the sidebar, **Then** every item is indented proportionally to its depth, and no child item visually aligns with its parent's indentation column.
2. **Given** a mix of folders and leaf branches at the same depth, **When** the user scans the sidebar, **Then** items at the same depth share a consistent indentation, and collapsible folders remain distinguishable from leaf branches.
3. **Given** a deeply nested folder that is collapsed, **When** the user expands it, **Then** its children appear with the correct deeper indentation without layout jumps or misalignment.

---

### User Story 2 - No Overflow Artifacts When Scrolling the History Table (Priority: P1)

A user with a small app window scrolls the commit-history table horizontally to reach the rightmost columns (Date, SHA) and sees them rendered cleanly inside the table boundaries, with no bare white strip, no text spilling outside its cell, and a fully painted row background across the entire scrollable width.

**Why this priority**: A visible white gap with overflowing text makes the app look broken and unfinished. It affects every user with a smaller window or many columns — a frequent situation described in the original column-layout assessment.

**Independent Test**: Resize the app window small enough to force a horizontal scrollbar in the history view, scroll all the way right, and verify that every column's content stays inside its cell, row backgrounds and hover/selection highlights extend to the end of the scrollable area, and no white space appears at the right edge.

**Acceptance Scenarios**:

1. **Given** the window is too narrow to show all columns, **When** the user scrolls horizontally to the far right, **Then** the rightmost visible content is the last column's data — no empty white strip follows it.
2. **Given** any cell whose content is longer than the visible column width, **When** the table is scrolled horizontally, **Then** the content is clipped or ellipsized within its cell boundaries and never paints over adjacent space or outside the table.
3. **Given** a selected or hovered commit row, **When** the user scrolls horizontally, **Then** the highlight background covers the full width of the scrollable content, not just the visible viewport portion.

---

### User Story 3 - Resizable History Table Columns (Priority: P2)

A user adjusts the width of any text-bearing history-table column (Refs, Description, Author, Date, SHA) by dragging a visible handle on the boundary between column headers, so they can widen columns they care about (e.g. Description) and shrink ones they don't. The Graph column is excluded from manual resizing: it auto-sizes to the width required by the rendered commit-graph lanes.

**Why this priority**: Fixed columns were the second complaint in the original column-layout assessment and remain unaddressed. Resizing lets each user adapt the table to their branch naming and screen size.

**Independent Test**: Drag the divider between two column headers left and right and verify both columns resize accordingly, the cursor changes to a resize cursor over the handle, and content reflows (with truncation where needed) within its new width.

**Acceptance Scenarios**:

1. **Given** the pointer hovers over a column divider in the table header, **When** the user moves the mouse there, **Then** a visible grab affordance and resize cursor are shown.
2. **Given** the user drags a column divider, **When** the divider is dragged left or right, **Then** the column width updates live and no column shrinks below a sensible minimum that keeps its label readable.
3. **Given** the user has resized columns, **When** the app is closed and reopened on the same repository, **Then** the previously chosen column widths are restored.
4. **Given** a column has been narrowed, **When** content no longer fits, **Then** it is truncated with an ellipsis instead of overflowing, and the horizontal scrolling behavior from User Story 2 remains correct.

---

### User Story 4 - Tooltips for Truncated Header Labels (Priority: P3)

A user whose header label is cut off (e.g. a narrowed "Description" column) hovers the header and sees the full label in a tooltip, so column identity is never ambiguous.

**Why this priority**: This is a smaller affordance than the layout fixes, but it directly complements resizable columns: once columns can be narrowed, truncated labels must remain discoverable. It also addresses truncated branch-name chips in the Refs column.

**Independent Test**: Narrow a column so its header label is truncated, hover the header, and verify the full label appears as a tooltip; also hover a truncated ref label chip and verify its full name appears.

**Acceptance Scenarios**:

1. **Given** a header label that is not fully displayed, **When** the user hovers the header cell, **Then** a tooltip shows the complete label text.
2. **Given** a ref/branch label chip whose name is truncated in the Refs column, **When** the user hovers the chip, **Then** a tooltip shows the full branch/tag name.
3. **Given** a header or chip that is fully visible, **When** the user hovers it, **Then** no redundant tooltip is required (or a harmless one may appear).

---

### Edge Cases

- Extremely deep folder nesting (4+ levels): indentation must accumulate at every level without pushing content out of the sidebar viewport; long names still truncate with the existing tooltip behavior from `002-sidebar-name-tooltip`.
- A folder name so long that even its own line scrolls: indentation and indentation guides must not break or overlap the expand/collapse chevron.
- Resizing a column while another user action refreshes the commit list (e.g. a fetch completing): manual widths must not be reset by data refreshes.
- Minimum-width columns: shrinking all columns to their minimum must not reintroduce the white-gap scrolling artifact from User Story 2.
- Window enlarged after horizontal scrolling: the table must stretch its painted background to the new width without leaving the previously scrolled state broken.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every nesting level in the sidebar folder tree MUST be visually indented by a consistent per-level step relative to its parent, at every depth — not only the first level.
- **FR-002**: Sidebar indentation MUST remain aligned across folder rows and leaf branch rows at the same depth, including the position of expand/collapse chevrons and branch icons.
- **FR-003**: The history table MUST clip or ellipsize cell content that exceeds its column width; content MUST never paint outside its cell or beyond the table's right edge.
- **FR-004**: When the table is wider than its viewport and the user scrolls horizontally, row backgrounds (including hover and selection states) MUST extend across the entire scrollable width — no unpainted white strip may appear.
- **FR-005**: The history table header MUST provide a draggable divider on each column boundary so users can resize every text-bearing column (Refs, Description, Author, Date, SHA). The Graph column MUST NOT be manually resizable; it MUST auto-size to the width required by the rendered commit-graph lanes.
- **FR-006**: The pointer MUST switch to a horizontal-resize cursor when hovering a column divider (for the resizable columns only), and resizing MUST update column width interactively during the drag.
- **FR-007**: Each resizable column MUST have a minimum width that keeps its header label recognizable; the table MUST NOT allow shrinking below it.
- **FR-008**: Manually chosen column widths MUST be persisted per repository and restored across app restarts; data refreshes MUST NOT reset them. When a repository is opened for the first time (no saved widths), the table MUST use sensible per-column default widths that are not tied to the current window size; horizontal scrolling appears as needed when the defaults exceed the window width.
- **FR-009**: Hovering a history-table header whose label is truncated MUST show the full label in a tooltip.
- **FR-010**: Hovering a truncated ref/branch label chip in the Refs column MUST show the chip's full name in a tooltip.

### Key Entities *(include if feature involves data)*

- **Column layout preferences**: Per-repository record of user-chosen history-table column widths; persisted locally, restored on app start; invalidated/reset only implicitly when a column set changes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For any repository with folders nested 1–5 levels deep, 100% of sidebar rows indent correctly for their depth — verified by visual inspection, with zero rows misaligned with their parent's level.
- **SC-002**: At any window size that forces horizontal scrolling, scrolling to the far right shows table content with no white gap and no text overflowing cell boundaries, in 100% of tested window widths (from minimum supported width upward).
- **SC-003**: Every history-table column can be resized by dragging its header divider, with live updates, in under 1 second of user interaction per adjustment and without any layout flicker.
- **SC-004**: Column widths chosen by the user persist across a full app restart for the same repository in 100% of cases.
- **SC-005**: In user validation, no reviewer can mistake a nested sidebar entry for a sibling of its parent folder, and no reviewer reports truncated header labels as unidentifiable after hovering.

## Assumptions

- The fixes build directly on the structures delivered by `002-sidebar-name-tooltip` (sidebar tooltips, truncation) and `003-commit-history-columns` (column layout); this feature corrects and completes them rather than replacing them.
- Column width preferences are stored locally on the user's machine, per repository — no sync or sharing of preferences is in scope.
- Persisting resized columns across app restarts is expected by default (standard desktop-app behavior), even though not explicitly requested.
- First-open column widths use sensible per-column defaults that are independent of the current window size; horizontal scrolling is accepted when those defaults exceed the window width.
- Column resizing is mouse-driven only; keyboard-based column resizing is out of scope.
- The minimum window width supported by the app remains whatever the app currently enforces (or the OS minimum); behavior below that is out of scope.
- Tooltip styling reuses the existing tooltip behavior/style already introduced for sidebar branch names, keeping the app visually consistent.
