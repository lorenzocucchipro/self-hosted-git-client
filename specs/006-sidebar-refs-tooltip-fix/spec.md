# Feature Specification: Sidebar Tooltips & Refs Column Overlay Fix

**Feature Branch**: `006-sidebar-refs-tooltip-fix`

**Created**: 2026-10-14

**Status**: Draft

**Input**: User description: "A new stable version of the software has been achieved. The next step is fixing what has been done in previous tries. Three improvements are needed: (1) add the 'title' tooltip feature to every content in the left and right sidebar so users can read the full text when it's truncated; (2) the folder tree indentation in Local branches and Remote branches sections is confirmed working correctly — no change needed; (3) the Refs column in the Graph view has a custom colored hover overlay that is clipped by the parent's `overflow-hidden`, so the tooltip is hidden by the next column — the overlay should hover on top of every other content as every other tooltip already does."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Truncated sidebar content shows tooltip on hover (Priority: P1)

A user opens a repository and sees the left and right sidebars. When a text element (working changes label, section header, remote name/URL, stash message, file path, author name) is too long to fit in its container, hovering over it shows a native OS tooltip with the full text. When the text fits, no tooltip appears. The tooltip behavior is consistent across all sidebar sections in both the left and right panels.

**Why this priority**: Tooltips on truncated text are a basic usability feature. Without them, users cannot read full branch names, file paths, or remote URLs when the sidebar is narrow. Inconsistency between sections (some have tooltips, some don't) makes the UI feel unfinished.

**Independent Test**: Open a repository, narrow the left sidebar until text truncates, hover over each truncated element (working changes, section headers, remote names, stash messages), verify a tooltip appears with the full text. Do the same for the right sidebar (file paths in ChangesPanel and DetailPanel). Verify that short, non-truncated text does NOT show a tooltip.

**Acceptance Scenarios**:

1. **Given** a repository is open with a narrow left sidebar, **When** the user hovers over the truncated "Working changes" label, **Then** a native tooltip shows the full text "Working changes".
2. **Given** a repository with remotes configured, **When** the sidebar is narrow enough to truncate the remote name or fetch URL, **Then** hovering shows the full name/URL in a tooltip.
3. **Given** a repository with stashes, **When** a stash message is truncated, **Then** hovering over it shows the full message.
4. **Given** the right sidebar shows the ChangesPanel with long file paths, **When** the user hovers over a truncated file path, **Then** a tooltip shows the full path (and no tooltip appears for short paths that fit).
5. **Given** the right sidebar shows the DetailPanel with a long author name, **When** the user hovers over the truncated author line, **Then** a tooltip shows the full author name and email.
6. **Given** any sidebar section with text that fits entirely in its container, **When** the user hovers over it, **Then** no tooltip appears.

---

### User Story 2 - Refs column hover overlay is not clipped (Priority: P1)

A user viewing the commit history table sees the Refs column with branch/tag badges. When a badge is truncated (branch name too long for the column), hovering over it reveals the full badge — with its lane color, icon, and solid background — floating on top of the Description column content. The overlay is not clipped or hidden by the Refs column boundary. The overlay has a shadow and solid background so it reads as a floating popup, not as content bleeding into the next column.

**Why this priority**: The Refs column is the primary way users identify which branches point to which commits. The colored overlay ties the badge to its graph lane, making the commit graph readable. If the overlay is clipped, users cannot read long branch names and lose the color association — a core UX regression.

**Independent Test**: Open a repository with branches that have long names (e.g. `feature/very-long-branch-name-here`), narrow the Refs column so the badge truncates, hover over the truncated badge, verify the full colored badge overlay appears on top of the Description column content without being clipped.

**Acceptance Scenarios**:

1. **Given** a commit with a branch badge whose name is truncated in the Refs column, **When** the user hovers over the badge, **Then** the full badge overlay appears with its lane color, icon, and solid background, extending into the Description column area.
2. **Given** a commit with multiple refs showing the "+X" chip, **When** the user hovers over the chip, **Then** the full set of badges appears as a floating popup on top of the Description column, not clipped by the Refs column boundary.
3. **Given** the Refs column hover overlay is visible, **When** the user moves the mouse away, **Then** the overlay disappears and the Description column content is fully visible again.
4. **Given** a commit with a short branch name that fits entirely in the Refs column, **When** the user hovers over the badge, **Then** no overlay appears (the badge is already fully visible).
5. **Given** the Refs column is resized to be very narrow, **When** the user hovers over a truncated badge, **Then** the overlay extends rightward but does not cause the grid layout to shift or the column to expand.

---

### Edge Cases

- What happens when the sidebar is resized to its minimum width? All truncated text should show tooltips on hover.
- What happens when a tooltip is displayed and the user scrolls the sidebar? The tooltip should disappear and reappear only on the next hover.
- What happens when the Refs column is resized to be very narrow (e.g., 80px)? The overlay should still appear and not cause layout shifts.
- What happens when a branch name contains special characters or emoji? The tooltip and overlay should display them correctly.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST apply the `useTruncatedTitle` hook to the "Working changes" button text span in the left sidebar so it shows a tooltip only when truncated.
- **FR-002**: System MUST apply the `useTruncatedTitle` hook to all section headers (Local branches, Remote branches, Remotes, Tags, Stashes) in the left sidebar.
- **FR-003**: System MUST apply the `useTruncatedTitle` hook to remote names and fetch URLs in the Remotes section of the left sidebar.
- **FR-004**: System MUST apply the `useTruncatedTitle` hook to stash messages in the Stashes section of the left sidebar.
- **FR-005**: System MUST replace static `title` attributes with the `useTruncatedTitle` hook on Unstaged and Staged file rows in ChangesPanel for conditional tooltip behavior.
- **FR-006**: System MUST replace static `title` attributes with the `useTruncatedTitle` hook on Conflict rows in ChangesPanel.
- **FR-007**: System MUST apply the `useTruncatedTitle` hook to file paths in the FileRow component of DetailPanel.
- **FR-008**: System MUST apply the `useTruncatedTitle` hook to the author/email line in DetailPanel.
- **FR-009**: System MUST remove the `overflow-hidden` CSS class from the Refs column container in CommitRow.tsx (line 62).
- **FR-010**: System MUST add `min-w-0 relative` classes to the Refs column container in CommitRow.tsx to prevent grid track expansion and establish positioning context.
- **FR-011**: System MUST ensure the ExpandableBadge hover overlay (z-30) is no longer clipped by the Refs column boundary and appears on top of adjacent columns.
- **FR-012**: System MUST ensure the RefLabels "+X" popup (z-40) is no longer clipped by the Refs column boundary and appears on top of adjacent columns.

### Key Entities

- **Tooltip**: A native OS-level tooltip triggered by the `title` HTML attribute, shown only when text is truncated (scrollWidth > clientWidth).
- **Hover Overlay**: An absolutely-positioned DOM element that appears on hover, displaying the full branch/tag badge with lane color, icon, and solid background.
- **Refs Column**: The second column in the commit history table, containing branch/tag badges and the "+X" chip for multiple refs.
- **useTruncatedTitle Hook**: A React hook that measures text overflow and conditionally sets the `title` attribute only when needed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All sidebar text elements that can be truncated show a tooltip when text overflows, and no tooltip appears when text fits entirely.
- **SC-002**: Tooltips appear within 100ms of mouse hover (standard OS tooltip delay).
- **SC-003**: The Refs column hover overlay is visible and readable when hovering over truncated branch/tag badges, extending into the Description column without being clipped.
- **SC-004**: The Refs column overlay preserves the lane color, icon, and solid background styling when displayed.
- **SC-005**: Resizing the Refs column to various widths (80px to 300px) does not cause layout shifts or grid track expansion.
- **SC-006**: The grid layout remains perfectly aligned between the header and all rows after removing `overflow-hidden` from the Refs column.
- **SC-007**: No visual regression in the commit history table appearance or behavior.

## Assumptions

- The `useTruncatedTitle` hook is already implemented and proven in RefTree.tsx and BranchRow.tsx, so it can be reused without modification.
- The native `title` attribute tooltip behavior is consistent across all supported platforms (macOS, Windows, Linux).
- The Refs column default width of 200px is sufficient for most branch names; users can resize it if needed.
- The Description column is wide enough to accommodate the Refs overlay extending into it without significant usability impact.
- No other CSS properties on the Refs column container will interfere with the removal of `overflow-hidden`.
- The project follows Conventional Commits for commit messages.
- The build process (npm run build) must pass before any commit.
