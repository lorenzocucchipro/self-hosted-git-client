# Feature Specification: Sidebar Reference Name Visibility

**Feature Branch**: `002-sidebar-name-tooltip`

**Created**: 2026-10-01

**Status**: Draft

**Input**: User description: "In the same sidebar we worked on with spec 001, with the folder view we've just implemented, I want to fix the visualization of the names. If I hover the mouse on top of a branch for example, no hovering view is shown to display the whole name. I'm open to better suggestions about UI implementation."

## Clarifications

### Session 2026-10-01

- Q: Should the full name be revealed only when the text is actually truncated (overflowing the available width), or always shown on hover regardless of whether it fits? → A: Reveal only when the text is truncated. When the label fits entirely within its row, no hover affordance is shown, avoiding redundant noise for short names.
- Q: What should the hover affordance show — the full git reference name (e.g. `feature/epic-1/taskA`) or the full path from the root of the tree (e.g. `feature/epic-1/taskA` for a leaf, `feature/epic-1` for a folder)? → A: Show the full reference name for leaves and the full folder path for folder nodes, so the user can always read the complete name that the visible segment is part of.
- Q: Should the hover affordance also appear on the section headers ("Local branches", "Remote branches", "Tags")? → A: No — section headers are static labels, not references; they are out of scope. Only folder and leaf rows inside the trees get the affordance.
- Q: What mechanism should be used for the hover reveal, and what is its scope? → A: Use the same native `title` attribute mechanism already applied by default to the fetch button (and other existing UI elements), scoped to the sidebar elements only — not a custom floating view, and not app-wide. The sidebar folder and leaf rows get a native `title` showing the full name, consistent with how the fetch button already shows its label via `title`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read the full name of a truncated sidebar leaf on hover (Priority: P1)

A user is browsing the sidebar folder tree and a branch or tag leaf label is too long to fit its row, so it is visually cut off (e.g. only `taskA-with-a-very-l…` is visible). The user hovers the mouse pointer over that leaf row and, after a brief moment, a native tooltip appears showing the complete reference name (e.g. `feature/epic-1/taskA-with-a-very-long-name`). When the pointer leaves the row, the tooltip disappears. If the leaf label fits entirely within the row, no tooltip appears on hover. The tooltip uses the same native `title` mechanism already present on other UI elements like the fetch button.

**Why this priority**: The core of the request is that users currently cannot read the whole name of a truncated branch/tag. Leaves are the actual references users act on (checkout, merge, delete), so being able to confirm the full name before acting is the highest-value fix.

**Independent Test**: Open a repository with at least one branch or tag whose name is long enough to be truncated in the sidebar; hover over the truncated leaf and confirm the complete name becomes readable via the native tooltip; hover over a short leaf that fits and confirm no tooltip appears.

**Acceptance Scenarios**:

1. **Given** a leaf row whose label is wider than the available row width and is therefore truncated, **When** the user hovers the pointer over that row, **Then** a native tooltip appears displaying the complete reference name.
2. **Given** a leaf row whose label fits entirely within the row, **When** the user hovers the pointer over that row, **Then** no tooltip appears.
3. **Given** a tooltip is currently shown for a leaf, **When** the pointer leaves the row, **Then** the tooltip disappears promptly.
4. **Given** a truncated leaf belonging to the remote branches or tags section, **When** the user hovers it, **Then** the tooltip shows the full name including the remote prefix (for remote branches) or the full tag name, consistent with the local branches behaviour.

---

### User Story 2 - Read the full path of a truncated sidebar folder on hover (Priority: P2)

A user is browsing the sidebar folder tree and a folder node label is too long to fit its row (e.g. a deeply nested folder whose segment name is long). The user hovers the pointer over that folder row and, after a brief moment, a native tooltip appears showing the full folder path (e.g. `feature/epic-1/long-folder-segment-name`). When the pointer leaves, the tooltip disappears. If the folder label fits, no tooltip appears. The tooltip uses the same native `title` mechanism as the leaf rows.

**Why this priority**: Folders are grouping nodes derived from shared prefixes; while users act on leaves, being able to read a truncated folder path helps them navigate and understand the hierarchy. It is secondary to leaves but keeps the behaviour consistent across all row types.

**Independent Test**: Open a repository with a slash-separated branch/tag name whose intermediate folder segment is long enough to be truncated in the sidebar; collapse the parent so the long folder is visible; hover over the truncated folder row and confirm the full folder path becomes readable via the native tooltip.

**Acceptance Scenarios**:

1. **Given** a folder row whose label is wider than the available row width and is therefore truncated, **When** the user hovers the pointer over that row, **Then** a native tooltip appears displaying the full folder path.
2. **Given** a folder row whose label fits entirely within the row, **When** the user hovers the pointer over that row, **Then** no tooltip appears.
3. **Given** a tooltip is currently shown for a folder, **When** the pointer leaves the row, **Then** the tooltip disappears promptly.

---

### User Story 3 - Consistent name visibility across all three sidebar sections (Priority: P3)

A user interacts with the "Local branches", "Remote branches" and "Tags" sections of the sidebar. Regardless of which section they are in, the hover-to-reveal-full-name behaviour works the same way: any truncated folder or leaf row shows the complete name on hover via the native `title` tooltip, and any row that fits shows nothing on hover. The behaviour is identical across the three sections, so a user who learns it in one section expects the same in the others. The mechanism is the same native `title` attribute already used elsewhere in the application (e.g. the fetch button), so no new custom UI component is introduced.

**Why this priority**: Consistency is what makes the feature feel finished rather than partial. It is lower priority than the core leaf/folder reveal because it is about uniformity rather than the existence of the behaviour, but it is required for a coherent sidebar.

**Independent Test**: In a repository that has truncated names in all three sections, hover over a truncated row in each section and confirm the native tooltip appears with the same behaviour in all three.

**Acceptance Scenarios**:

1. **Given** truncated rows exist in the local branches, remote branches and tags sections, **When** the user hovers a truncated row in each section, **Then** the native tooltip appears in all three with the same behaviour.
2. **Given** the user moves between sections, **When** they hover rows that fit entirely, **Then** no tooltip appears in any section, consistently.

---

### Edge Cases

- **Short names that fit**: Rows whose label fits entirely within the available width never trigger a tooltip; the native `title` is reserved for genuinely truncated content.
- **Very long full names**: When the full name shown in the native tooltip is itself very long, the browser's native tooltip behaviour handles wrapping/display; the feature does not need to implement custom wrapping since it uses the native mechanism.
- **Deeply nested leaves**: A leaf many levels deep, whose visible segment is short but whose full name is long, must still reveal the complete name (including all ancestor segments) on hover when its visible segment is truncated.
- **Folder containing the current branch**: The native `title` tooltip must not interfere with the existing "current branch inside" indicator on collapsed folders; both can coexist on the same folder row.
- **Hover during expand/collapse**: If the user clicks a folder's chevron to expand or collapse while hovering, the tooltip (if shown) must disappear or update correctly so it never shows a stale name for a row that no longer exists or has changed.
- **Rapid pointer movement across rows**: Moving the pointer quickly across many truncated rows must not leave behind lingering tooltips; the native `title` mechanism handles dismissal tied to pointer leave.
- **Right-to-left or unusual characters**: Names containing characters that affect text direction or width (e.g. wide CJK characters) must still be measured correctly so the `title` is only set when the label genuinely overflows.
- **Theme and contrast**: The native tooltip appearance is governed by the operating system / browser, not the application's theming tokens; the feature does not need to style the native tooltip.
- **Section headers**: Section headers ("Local branches", "Remote branches", "Tags") are static labels and never receive the `title` tooltip for name reveal.
- **Empty sections**: When a section is empty and shows its empty state, there are no rows to hover; the feature has no effect there.
- **Existing native tooltips on other elements**: The feature is scoped to the sidebar only; native `title` attributes already present on other UI elements (e.g. the fetch button, icon buttons) are not modified or removed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When a leaf row (branch or tag) in any of the three sidebar sections has a label that is truncated (does not fit within its row width), the sidebar MUST set a native `title` attribute on that row showing the complete reference name, so the user can read the whole name on hover.
- **FR-002**: When a folder row in any of the three sidebar sections has a label that is truncated, the sidebar MUST set a native `title` attribute on that row showing the full folder path (the complete prefix the folder represents).
- **FR-003**: Rows whose label fits entirely within the available row width MUST NOT have a `title` attribute set for name reveal, so short names do not produce redundant tooltips.
- **FR-004**: The native `title` tooltip MUST disappear when the pointer leaves the row, as governed by the native browser/OS tooltip behaviour.
- **FR-005**: For remote branch leaves, the `title` MUST include the remote prefix (e.g. `origin/feature/epic-1/taskA`), matching the full remote tracking branch name; for local branches and tags, the `title` MUST be the full local branch or tag name.
- **FR-006**: The native `title` mechanism MUST be applied identically to all three sidebar sections (local branches, remote branches, tags), with the same behaviour, so the experience is consistent across the sidebar.
- **FR-007**: The native `title` tooltip MUST NOT interfere with existing row interactions: selecting a leaf still triggers checkout/view, the context menu still opens on right-click, and the folder chevron still expands/collapses on click.
- **FR-008**: The native `title` tooltip MUST NOT interfere with the existing "current branch inside" indicator shown on collapsed folders that contain the current branch; both may appear on the same folder row.
- **FR-009**: The `title` MUST only be set when the row's label is genuinely truncated: the sidebar MUST determine whether a row's label is truncated based on the actual rendered width versus the available row width, not on a fixed character count or name length heuristic.
- **FR-010**: The feature MUST use the native `title` attribute mechanism — the same mechanism already used by existing UI elements such as the fetch button — and MUST NOT introduce a custom floating view or tooltip component.
- **FR-011**: The feature is scoped to the sidebar's folder and leaf rows only; it MUST NOT modify or remove existing native `title` attributes on other UI elements elsewhere in the application.
- **FR-012**: Rapid pointer movement across rows MUST NOT leave lingering tooltips; the native `title` mechanism handles dismissal tied to pointer leave.
- **FR-013**: Sidebar section headers ("Local branches", "Remote branches", "Tags") MUST NOT receive a `title` attribute for name reveal; only folder and leaf rows inside the trees are eligible.

### Key Entities *(include if feature involves data)*

- **Row Label**: The visible text shown for a folder or leaf row in the tree. It is the single path segment for the node. The feature is concerned with revealing the full name when this label is truncated.
- **Full Name**: The complete reference name (for a leaf) or the complete folder path (for a folder) that the visible segment is part of. This is what the native `title` attribute displays.
- **Native Title Tooltip**: The browser/OS-native tooltip that appears on hover over an element with a `title` attribute. The feature reuses this existing mechanism — already present on other UI elements like the fetch button — rather than introducing a custom tooltip component. It is set only when a row's label is genuinely truncated.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can read the complete name of any truncated branch, tag or folder row in the sidebar by hovering over it, with the native tooltip appearing within the standard OS/browser tooltip delay.
- **SC-002**: 100% of rows whose label fits entirely within the row width produce no tooltip, so only genuinely truncated content triggers the reveal.
- **SC-003**: The native `title` mechanism works identically across the local branches, remote branches and tags sections, so a user who has seen it in one section gets the same experience in the other two with no relearning.
- **SC-004**: All existing row interactions (leaf checkout/view, context menu, folder expand/collapse, current-branch indicator) remain fully functional and unaffected by the native `title` tooltip.
- **SC-005**: The feature introduces no custom tooltip component; it reuses the native `title` attribute already used by existing UI elements like the fetch button.

## Assumptions

- The sidebar folder tree from spec 001 is already implemented and renders folder and leaf rows with labels that may be truncated when they exceed the available row width.
- The application already uses native `title` attributes on various UI elements (e.g. the fetch button, icon buttons); this feature reuses the same native mechanism on sidebar rows.
- The native `title` tooltip appearance, timing and dismissal are governed by the operating system / browser and are not styled by the application.
- The hover-reveal is a presentation-only enhancement; it does not change the underlying data model, the git operations, or the expand/collapse state of folders.
- The `title` is set only when a row's label is genuinely truncated (rendered width exceeds available width), determined at render/hover time, not by a fixed character-count heuristic.
- Keyboard interaction with the tooltip is out of scope; the tooltip is triggered by mouse/touch hover only, consistent with the mouse-only expand/collapse decision in spec 001.
- The feature is scoped to the sidebar's folder and leaf rows only; existing native `title` attributes on other UI elements are not modified.
