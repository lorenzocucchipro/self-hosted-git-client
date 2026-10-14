# Feature Specification: Robust Main View

**Feature Branch**: `005-robust-main-view`

**Created**: 2026-10-13

**Status**: Draft

**Input**: User description: "Make the main window's three-pane layout and commit-history table safe to modify without regressions, and bring it to the target behaviour: full-width git history table in columns with horizontal scroll, resizable columns with smooth drag (graph column fixed, SHA column resizable), resizable/persisted/collapsible sidebars with non-invasive closed hints, full history via virtualization, and a diff view as an explicit full-width mode with a close button and a graph/diff toggle that preserves the pending diff."

## Clarifications

### Session 2026-10-13

- Q: When the user toggles from the diff view to the graph, selects a different commit or file, then toggles back to the diff, should the diff show the originally opened file or the newly selected commit's file? → A: The toggle restores the original diff (snapshot): the file and commit from when the user toggled away are preserved; selecting a different commit in graph view updates the right panel but not the pending diff.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Stable, Aligned Commit History Table (Priority: P1)

A user opens a repository and sees the git history as a table in the center of the window. The table has columns (Graph, Refs, Description, Author, Date, SHA) that are perfectly aligned between the header and every row. The user can drag any column divider (including after the SHA column) to resize that column; the table grows horizontally and scrolls if the window isn't wide enough. The Graph column is fixed-width and cannot be resized. Dragging is smooth without visual jank or lag. The column widths are remembered per repository across restarts.

**Why this priority**: The commit history table is the primary view of the application. If columns are misaligned, resizing is janky, or widths aren't preserved, the core experience is broken. This is the foundation everything else builds on.

**Independent Test**: Open a repository, drag several column dividers, verify header and rows stay aligned at all widths, verify the table scrolls horizontally when columns exceed window width, verify the Graph column never changes width, restart the app and verify the widths are restored.

**Acceptance Scenarios**:

1. **Given** a repository is open, **When** the user drags the Description column divider to the right, **Then** the Description column grows, the table's horizontal scroll area grows, and all other columns keep their widths.
2. **Given** a repository is open, **When** the user drags the SHA column divider, **Then** the SHA column resizes (currently not possible).
3. **Given** column widths have been adjusted, **When** the user restarts the application and reopens the same repository, **Then** the column widths are restored to their last values.
4. **Given** a repository is open, **When** the user drags any column divider rapidly, **Then** the resize is smooth with no visible lag, stuttering, or re-render flicker.
5. **Given** a repository is open, **When** the user attempts to drag the Graph column divider, **Then** the Graph column does not change width (no divider is present on the graph column).

---

### User Story 2 - Resizable, Collapsible, Persisted Sidebars (Priority: P1)

A user sees two sidebars by default: the left sidebar (local/remote branches, stashes, tags) and the right sidebar (changed files + stage, or commit details). Both sidebars can be resized by dragging a handle. Both can be collapsed via a button on the top toolbar. When collapsed, a thin sliver with a subtle icon remains as a non-invasive visual reminder that the sidebar is hidden; clicking the sliver or the toolbar button re-expands the sidebar to its previous width. The sidebars cannot be expanded so far that they hide the center view entirely. Sidebar widths and open/closed state persist across restarts.

**Why this priority**: Sidebars frame the main view. If they can't be resized, collapse without a reminder, or eat the center view, the layout feels broken and claustrophobic. This is co-equal with the table because it defines the space the table lives in.

**Independent Test**: Open a repository, drag both sidebar handles to resize, collapse both via toolbar buttons, verify thin slivers appear, click the slivers to re-expand, verify previous widths are restored, restart and verify state persists, drag a sidebar to its maximum and verify the center view is still visible.

**Acceptance Scenarios**:

1. **Given** a repository is open, **When** the user drags the left sidebar's right edge, **Then** the sidebar resizes smoothly and the center view shrinks accordingly.
2. **Given** a repository is open, **When** the user drags a sidebar handle so far that the center would disappear, **Then** the sidebar stops at a maximum width that guarantees a minimum center width.
3. **Given** a repository is open, **When** the user clicks the left sidebar toggle in the toolbar, **Then** the left sidebar collapses and a thin sliver with an icon remains visible.
4. **Given** a sidebar is collapsed, **When** the user clicks the sliver or the toolbar button, **Then** the sidebar re-expands to its previous width.
5. **Given** sidebar widths and open/closed state have been set, **When** the user restarts the application, **Then** the sidebar widths and open/closed state are restored.
6. **Given** both sidebars are open, **When** the user resizes the application window smaller, **Then** the sidebars re-clamp if needed so the center minimum width is maintained.

---

### User Story 3 - Full History with Smooth Scrolling (Priority: P2)

A user with a repository containing thousands of commits sees the full commit history (not capped at 800) and can scroll through it smoothly. Only the visible rows (plus a small overscan buffer) are rendered in the DOM, so performance stays high regardless of history length. Day-group headers and the "Uncommitted changes" row still render correctly within the virtualized list.

**Why this priority**: A 800-commit cap with no indicator is a silent limitation that confuses users with large repositories. Virtualization is the enabler for removing the cap without performance degradation. It's P2 because the table and sidebars must be stable first.

**Independent Test**: Open a repository with 10,000+ commits, verify all commits are loaded (not capped), scroll through the history rapidly, verify no lag, verify day headers appear at the correct positions, verify the WIP row renders when there are uncommitted changes.

**Acceptance Scenarios**:

1. **Given** a repository with 10,000+ commits, **When** the user opens it, **Then** the full history is loaded and visible (no 800-commit cap).
2. **Given** a large repository is open, **When** the user scrolls rapidly through the history, **Then** scrolling is smooth with no visible lag or blank gaps.
3. **Given** a large repository is open, **When** the user scrolls to a day boundary, **Then** the day-group header renders correctly at that position.
4. **Given** a repository with uncommitted changes, **When** the user views the history, **Then** the "Uncommitted changes" row appears at the top and is selectable.

---

### User Story 4 - Diff View with Close and Graph/Diff Toggle (Priority: P2)

A user clicks a file to view its diff. The diff opens as a full-width view replacing the graph in the center. The diff toolbar has an X button (close + dismiss) and a Graph/Diff toggle button. Clicking the X closes the diff completely and returns to the graph, clearing the diff search. Clicking the toggle switches to the graph view while keeping the diff "pending" — the file, the commit it belongs to, and any in-diff search state are snapshotted and preserved. While in graph view, selecting a different commit updates the right panel but does not change the pending diff. When in graph view with a pending diff, the toggle button shows a subtle indicator (e.g. an accent dot) so the user knows a diff is waiting. Clicking the toggle from graph view returns to the diff, restoring the exact file and commit that were being viewed when the user toggled away. The toggle is reachable from both the diff toolbar and the main toolbar.

**Why this priority**: The current single close button conflates "I'm done" with "let me peek at the graph." The toggle preserves context and makes the diff a non-destructive round-trip. It's P2 because it's a UX improvement, not a stability fix.

**Independent Test**: Open a file diff, click the toggle to go to graph, verify a pending-diff indicator appears on the toggle in the toolbar, click the toggle again, verify the same file's diff is shown with search state preserved, click the X, verify the diff is fully closed and the indicator is gone.

**Acceptance Scenarios**:

1. **Given** a file diff is open, **When** the user clicks the X button, **Then** the diff closes completely, the graph is shown, and any in-diff search state is cleared.
2. **Given** a file diff is open, **When** the user clicks the Graph/Diff toggle, **Then** the graph view is shown, the file and its commit are snapshotted, and in-diff search state is preserved.
3. **Given** the user is in graph view with a pending diff, **When** the user selects a different commit, **Then** the right panel updates to show the new commit's details but the pending diff is unchanged.
4. **Given** the user is in graph view with a pending diff, **When** the user looks at the toggle in the toolbar, **Then** a subtle indicator shows that a diff is waiting.
5. **Given** the user is in graph view with a pending diff, **When** the user clicks the toggle, **Then** the diff view reopens showing the snapshotted file and commit with its search state intact.
6. **Given** the user is in graph view with no pending diff, **When** the user looks at the toggle, **Then** no pending-diff indicator is shown.

---

### User Story 5 - No Blank-Window Crashes (Priority: P1)

A user performs actions that change the number of ref labels on a commit (e.g. a remote fetch adds a branch or tag to a commit that previously had only one label). The application does not crash or show a blank window. If any rendering error occurs in any pane, an error boundary shows a fallback message instead of blanking the entire window.

**Why this priority**: A blank window is the worst possible user experience — the user loses all context and must restart. This is a latent crash that can be triggered by normal git operations (fetch, branch creation). It must be fixed before any other work.

**Independent Test**: Trigger a ref-label count change on a commit (e.g. create a branch on the HEAD commit, or fetch a remote that adds a tag), verify no crash occurs, verify the commit row renders correctly with the new labels.

**Acceptance Scenarios**:

1. **Given** a commit has one ref label, **When** a fetch adds a second ref label to that commit, **Then** the commit row renders both labels without crashing.
2. **Given** any pane is rendering, **When** a rendering error occurs, **Then** an error boundary shows a fallback message in that pane instead of blanking the window.

---

### Edge Cases

- What happens when the window is resized to its minimum width (960px) with both sidebars open? The sidebars must re-clamp to maintain the center minimum width.
- What happens when a repository has zero commits? The empty-state message must still render within the virtualized container.
- What happens when a commit has zero ref labels? The refs column must render empty without layout shift.
- What happens when column widths are reset to defaults? The Description column returns to flex mode (null width) and the table adjusts.
- What happens when the user switches repository tabs? Column widths load for the new repo; sidebar widths and open/closed state persist across tab switches (they are window-level, not repo-level).
- What happens when the diff is pending and the user switches repository tabs? The pending diff is cleared (the file belongs to the previous repo).
- What happens when the user selects a different commit while a diff is pending in graph view? The right panel updates to the new commit's details, but the pending diff snapshot is unchanged; toggling back restores the original diff.
- What happens when the user collapses both sidebars? The center view expands to fill the space; the thin slivers remain at the edges.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST display the commit history as a table with columns: Graph, Refs, Description, Author, Date, SHA.
- **FR-002**: The system MUST keep the header and every row of the table perfectly aligned at all column widths.
- **FR-003**: The system MUST allow the user to resize every column except the Graph column by dragging a divider.
- **FR-004**: The system MUST make the SHA column resizable (currently it is not).
- **FR-005**: The system MUST NOT allow the Graph column to be resized.
- **FR-006**: When a column is resized, the system MUST grow the table's horizontal scroll area (push semantics) rather than shrinking neighbouring columns.
- **FR-007**: The system MUST scroll the table horizontally when the total column width exceeds the available center width.
- **FR-008**: The system MUST persist column widths per repository across application restarts.
- **FR-009**: The system MUST provide smooth, lag-free column resizing without re-rendering rows that did not change.
- **FR-010**: The system MUST display both the left and right sidebars by default when a repository is open.
- **FR-011**: The system MUST allow the user to resize both sidebars by dragging a handle.
- **FR-012**: The system MUST enforce a maximum sidebar width that guarantees a minimum center view width.
- **FR-013**: The system MUST allow the user to collapse and re-expand each sidebar via a toolbar button.
- **FR-014**: When a sidebar is collapsed, the system MUST show a thin sliver with a subtle icon as a non-invasive visual reminder.
- **FR-015**: When a collapsed sidebar is re-expanded, the system MUST restore it to its previous width.
- **FR-016**: The system MUST persist sidebar widths and open/closed state across application restarts.
- **FR-017**: The system MUST re-clamp sidebar widths when the window is resized smaller so the center minimum is maintained.
- **FR-018**: The system MUST load and display the full commit history (not capped at 800 commits).
- **FR-019**: The system MUST render only visible rows (plus overscan) in the DOM for performance, regardless of history length.
- **FR-020**: The system MUST render day-group headers and the "Uncommitted changes" row correctly within the virtualized list.
- **FR-021**: The system MUST provide a full-width diff view that replaces the graph in the center when a file is opened.
- **FR-022**: The diff view MUST have an X button that closes the diff completely and clears in-diff search state.
- **FR-023**: The system MUST provide a Graph/Diff toggle that switches between views while preserving a snapshot of the pending diff's file, commit, and search state. Selecting a different commit while in graph view MUST NOT change the pending diff snapshot.
- **FR-024**: When in graph view with a pending diff, the toggle MUST show a subtle indicator that a diff is waiting.
- **FR-025**: The Graph/Diff toggle MUST be reachable from both the diff view and the graph view.
- **FR-026**: The system MUST NOT crash when a commit's ref label count changes from one to two (or vice versa).
- **FR-027**: The system MUST display an error boundary fallback instead of a blank window when a rendering error occurs in any pane.
- **FR-028**: The system MUST maintain the existing right-panel behaviour: switching between ChangesPanel (for WIP selection) and DetailPanel (for commit selection) based on the current selection.

### Key Entities

- **ColumnWidths**: Per-repository persisted widths for the five resizable columns (Refs, Description, Author, Date, SHA). Description can be "flex" (fill remaining space) or a fixed pixel width. Graph column width is derived from the graph layout and is not user-configurable.
- **SidebarLayoutState**: Window-level persisted state for both sidebars: width in pixels and open/closed boolean. Not per-repository.
- **EditorViewState**: Tracks whether the center shows the graph or the diff, whether a diff is "pending" (snapshotted but graph is shown), and the snapshot itself: the file path, the commit hash, and any in-diff search state. Selecting a different commit while in graph view updates the right panel but does not replace the snapshot.
- **CommitRow**: A single row in the virtualized history table, containing the graph cell (SVG), ref badges, description, author, date, and SHA. Must be renderable independently with stable props for memoization.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can resize any column (including SHA) by dragging and see smooth, lag-free updates with no row re-render flicker.
- **SC-002**: Header and row column edges are aligned to within 1 pixel at all column widths.
- **SC-003**: Users can scroll through a repository with 10,000+ commits without perceptible lag or blank gaps.
- **SC-004**: Column widths, sidebar widths, and sidebar open/closed state are restored exactly after restarting the application.
- **SC-005**: Both sidebars can be collapsed and re-expanded, and the center view never shrinks below a minimum usable width regardless of sidebar or window size.
- **SC-006**: A user can switch between graph and diff views via the toggle and return to the exact same file with search state preserved, without closing the diff.
- **SC-007**: No user action (including fetch, branch creation, tag creation) causes a blank window or unrecoverable crash.
- **SC-008**: Developers can modify the table or sidebar layout without introducing column misalignment or regressions, verified by a unit test covering the column-width-to-layout model.

## Assumptions

- The minimum center view width is approximately 480 pixels; the exact value will be confirmed during implementation.
- Sidebar widths and open/closed state are window-level preferences (not per-repository), persisted alongside existing UI preferences (theme, auto-fetch interval, default diff view).
- Column widths remain per-repository (current behaviour).
- The existing right-panel content model (switching by selection type) is unchanged.
- The existing IPC envelope, git service, and store git actions are unchanged.
- The existing sticky-header-in-scroll-container pattern for the table is preserved; only the internal layout mechanism (flex → grid) changes.
- A virtualization library may be added as a new dependency, vetted per the constitution's dependency rules (maintained, compatible license, published at least 7 days ago).
- The existing `closeEditor()` behaviour (clearing editor search state) is preserved for the X button; only the new toggle action preserves search state.
- The "pending diff" indicator is non-invasive (a small accent dot or subtle highlight), consistent with the sidebar collapse sliver pattern.
