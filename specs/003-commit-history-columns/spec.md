# Feature Specification: Commit History Column Layout

**Feature Branch**: `003-commit-history-columns`

**Created**: 2026-10-02

**Status**: Draft

**Input**: User description: "In the main view of the software, the portion where the user can see the history of the commits there are several problems: (1) After scrolling right to see the other columns like `Date` or `Sha`, when the window size is too little to show all the columns all together on the screen, the visualization is broken because the columns do not contain correctly the content and it goes outside the border; (2) the columns cannot be resized in width — they are fixed and the user cannot adjust the size to show more or less content; (3) the column names aren't correctly positioned, for example `Description` and `Author` are touching so much they look like one word."

## Clarifications

### Session 2026-10-02

- Q: Should user-set column widths persist after the app is closed and reopened, or reset to defaults on every start? → A: Persist widths across restarts, remembered separately per repository.
- Q: How should the user read the full value of a cell whose content is truncated because its column is too narrow? → A: Hover on a truncated cell shows a native tooltip with the full value, only when the content is actually truncated — the same native mechanism already used in the sidebar (spec 002).
- Q: Which columns should be user-resizable by dragging? → A: All five data columns (Refs, Description, Author, Date, SHA) are resizable; the Graph column stays auto-sized by the branch-lane layout.
- Q: Should the user be able to reset all column widths back to their defaults, and if so, how? → A: Yes — a "Reset column widths to defaults" entry in the commit history's context menu (right-click) restores the default widths for the current repository.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Column content always stays contained within its column (Priority: P1)

A user opens a repository and the commit history table shows the columns (Graph, Refs, Description, Author, Date, SHA). When the window is too narrow to show all columns at once, the user scrolls horizontally to see the right-hand columns (Date, SHA). Regardless of window size or scroll position, the content of every cell stays visually inside its own column: it is clipped or truncated within the column boundaries and never spills over into adjacent columns or outside the table area. The rendering looks clean at all widths.

**Why this priority**: This is an active visual defect that makes the main screen of the product look broken — content currently overflows its column edges and escapes the row boundaries. Fixing the broken rendering is the foundation for every other improvement to this table.

**Independent Test**: Open any repository with commits, resize the window so it is too narrow to display all columns, scroll fully to the right, and confirm that every cell's content is contained within its column and that no text overflows beyond column or row boundaries.

**Acceptance Scenarios**:

1. **Given** the commit history is visible and the window is too narrow to show all columns, **When** the user scrolls horizontally to view the Date and SHA columns, **Then** the content of each cell remains inside its column boundaries and does not spill into neighboring columns or outside the table edge.
2. **Given** a commit with a long description, long author name, or long refs labels, **When** the row is rendered at any window width, **Then** the overflowing text is truncated or clipped within its own column instead of overlapping neighboring columns.
3. **Given** a cell whose content is truncated because it does not fit its column, **When** the user hovers the pointer over that cell, **Then** a native tooltip appears showing the full value (same mechanism as the sidebar's truncated-name tooltip).
4. **Given** a cell whose content fits entirely within its column, **When** the user hovers the pointer over that cell, **Then** no tooltip appears.
5. **Given** the window is resized to any width down to a small minimum, **When** the user views any row, **Then** no cell content ever renders outside the column or the table container at any point.

---

### User Story 2 - Resize columns by dragging their dividers (Priority: P2)

A user wants to see more of the Description column (which holds the commit message) at the expense of other columns, or wants to shrink the Author column to make room for others. The user grabs the divider between two column headers and drags it left or right; the column to the left of the divider grows or shrinks accordingly, live, while the content adapts (truncating when too narrow). Each column respects a sensible minimum width so it never collapses to an unusable size. When the total of column widths exceeds the visible area, horizontal scrolling remains available and works as in User Story 1.

**Why this priority**: Users work with very different repository shapes — long commit messages vs. many refs vs. unfamiliar author names — and a one-size-fits-all fixed layout serves none of them well. Interactive resizing is the standard expectation for a developer tool's data table and is the second problem explicitly reported.

**Independent Test**: Drag the divider between Description and Author to the right and confirm the Description column widens and Author narrows; drag it back and confirm the reverse; verify each column stops resizing at its minimum width instead of collapsing.

**Acceptance Scenarios**:

1. **Given** the commit history is visible, **When** the user positions the pointer over the divider between two column headers, **Then** the pointer changes to indicate the divider is draggable.
2. **Given** the user drags a column divider, **When** the drag is in progress, **Then** the adjacent column resizes live and its content re-truncates to fit the new width.
3. **Given** a column has reached its minimum width, **When** the user keeps dragging to shrink it further, **Then** the column stops at its minimum width and does not collapse or invert.
4. **Given** the user has resized columns such that the total width exceeds the visible area, **When** they scroll horizontally, **Then** all columns still render correctly contained (per User Story 1).
5. **Given** the user has resized columns, **When** they scroll through the history or select different commits, **Then** the chosen widths remain stable and do not jump or reset.
6. **Given** the user has customized column widths and wants to undo it, **When** they right-click in the commit history and choose "Reset column widths to defaults", **Then** all data columns snap back to their default widths immediately and the saved custom widths for that repository are cleared.

---

### User Story 3 - Column headers are clearly separated and readable (Priority: P3)

A user glances at the header row above the commit history. Each column name (Graph, Refs, Description, Author, Date, SHA) is visually distinct and clearly positioned over the column it labels, with comfortable spacing between adjacent header names — "Description" and "Author" read as two separate words in two separate columns, never appearing to merge into one. The header alignment matches the body of its column (e.g. right-aligned columns have right-aligned headers over their content) and the header stays aligned with its column body at all widths, after resizing, and while scrolling.

**Why this priority**: Headers that visually run together make the table hard to scan and erode trust in a tool built for precision work. It is a small, self-contained polish fix on top of the alignment and resizing work.

**Independent Test**: Look at the header row with the window at various widths and after resizing columns, and confirm each header name sits fully within its own column with visible separation from its neighbors and alignment matching the column body it labels.

**Acceptance Scenarios**:

1. **Given** the commit history is visible, **When** the user reads the header row, **Then** every column name is fully readable and visibly separated from adjacent column names (no two names touch or appear merged).
2. **Given** a column whose body content is right-aligned (Date, SHA), **When** the user views the header, **Then** the header text alignment matches the body alignment it labels.
3. **Given** the user resizes columns or shrinks the window, **When** the header row is viewed, **Then** headers remain positioned over their own column bodies and never drift out of sync with them.

---

### Edge Cases

- **Window narrower than the sum of minimum column widths**: The table falls back to horizontal scrolling with all content contained; columns never shrink below their minimums to "fit" the window.
- **Very long commit message or author name**: The text truncates within its column (the existing full-details view — commit detail panel — remains the way to read the complete message/author).
- **Rapid or extreme dragging**: The resize interaction stays responsive and columns never end at invalid widths (zero, negative, or overlapping columns).
- **Column resized while new commits stream in**: Row updates (e.g. after a fetch or commit) reuse the user's chosen widths; widths don't reset on data change.
- **Column resized, then window resized**: Column widths remain as the user set them; no automatic re-layout undoes the customization.
- **Reset clears saved state**: After "Reset column widths to defaults", reopening the same repository must show the default widths, not the previously customized ones.
- **Refs column with many/very wide labels**: The refs labels truncate within the Refs column's chosen width instead of pushing other columns around.
- **Graph column widens with branches**: When the history contains many parallel branches, widening the graph area must not break containment of the columns after it, nor shrink text columns below their minimums.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every cell in the commit history table MUST keep its content visually contained within its column boundaries at all window widths and scroll positions; content that does not fit MUST be truncated or clipped inside its own column rather than overflowing.
- **FR-002**: No cell content MUST ever render outside the table container or overlap an adjacent column, for any combination of commit data (long messages, author names, ref labels) and window sizes.
- **FR-012**: When a cell's content is truncated because it does not fit its column, hovering over that cell MUST show a native tooltip with the complete cell value (full commit message, full author name, full ref label); cells whose content fits MUST NOT show this tooltip. The tooltip MUST use the same native mechanism already applied in the sidebar (spec 002) and MUST NOT introduce a custom tooltip component. Truncation is determined by actual rendered width versus available column width, not by a character-count heuristic.
- **FR-013**: The commit history's context menu (right-click) MUST include a "Reset column widths to defaults" entry that restores the default column widths for the current repository and clears its saved custom widths; the reset takes effect immediately and is itself persisted so the defaults are restored on the next reopen.
- **FR-003**: When the table's total column width exceeds the visible area, the user MUST be able to scroll horizontally to reach the hidden columns, and containment per FR-001/FR-002 MUST hold at every scroll position.
- **FR-004**: Users MUST be able to resize the width of the data columns (Refs, Description, Author, Date, SHA) by dragging the divider between column headers, columns MUST resize live during the drag, and their content MUST re-adapt (re-truncate) to the new width.
- **FR-005**: Each resizable column MUST enforce a sensible minimum width so it can never collapse to an unusable or inverted size during dragging.
- **FR-006**: The pointer MUST give a visible affordance (cursor change) when hovering over a draggable column divider.
- **FR-007**: Column widths chosen by the user MUST remain stable across data changes (new commits after fetch/commit, selection changes, scrolling) and MUST NOT reset or jump unexpectedly. Each repository's chosen widths MUST be saved when resized and restored the next time that repository is opened, even after the app is closed and reopened; a repository the app has never seen MUST start from the default widths.
- **FR-008**: Each header name MUST be visually separated from adjacent header names so no two names (e.g. "Description" and "Author") can appear as a single merged word, at any window width and after any resize.
- **FR-009**: Each header's text alignment MUST match the alignment of its column body (e.g. right-aligned headers over right-aligned Date and SHA bodies).
- **FR-010**: Headers MUST remain positioned over their own column body at all times — in sync during horizontal scrolling and after column resizing.
- **FR-011**: The Graph column width MUST continue to adapt to the history's branch layout, and its growth MUST NOT push text columns below their minimum widths or break containment.

### Key Entities *(include if feature involves data)*

- **Commit History Column**: One of the six columns of the history table — Graph, Refs, Description, Author, Date, SHA. Each has a header name, a current width, a minimum width, a content alignment, and behavior for content overflow (truncate/clip).
- **Column Layout State**: The user's set of chosen column widths for the commit history table (defaults on first open of a repository, mutated on drag). It is stored per repository, survives data refresh, selection changes and app restarts, and is loaded back when the same repository is opened again.
- **Native Title Tooltip**: The browser/OS-native tooltip that appears on hover over a truncated cell, showing the cell's complete value. It reuses the same mechanism added to the sidebar in spec 002 — set only when the cell content is genuinely truncated.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At every tested window width (from the app's minimum usable window size to full screen) and every horizontal scroll position, 0 instances of cell content overflowing its column boundary or escaping the table container are observable.
- **SC-002**: 100% of data columns (Refs, Description, Author, Date, SHA) are resizable via drag, each with an enforced minimum, and content adapts to a new width immediately on drag.
- **SC-003**: Column header names are fully separated and readable in 100% of tested window/resize states — no two header names visually merge.
- **SC-004**: After any resize, every header stays aligned over its column body (0 misaligned headers in manual spot-checks across narrow and wide windows).
- **SC-005**: User-chosen column widths survive data changes and app restarts — reopening the same repository restores the last saved widths, and 0 unexpected resets are observed across fetch/commit/selection/scroll operations.
- **SC-006**: A "Reset column widths to defaults" action restores the default layout for the current repository in one step, and the reset persists across reopen.

## Assumptions

- The commit history table is the main view's commit list with the existing six columns: Graph, Refs, Description, Author, Date, SHA; column identities and order are unchanged.
- The Graph column's width remains managed by the branch layout (it widens with parallel branches) and is not user-resizable; only the five text/data columns are user-resizable.
- Each repository's chosen column widths are saved and restored on reopen (see Clarifications); a never-before-seen repository starts from sensible defaults.
- Truncated cell content does not need inline expansion; hovering a truncated cell reveals its full value via a native tooltip (see Clarifications), and the existing commit detail panel remains available.
- App restart with a small window must still be usable: horizontal scrolling with contained content is the fallback, per the edge cases.
- Toward specification compliance with project conventions, this feature introduces no new colors and respects the app's existing theming system; only layout behaviors change.
