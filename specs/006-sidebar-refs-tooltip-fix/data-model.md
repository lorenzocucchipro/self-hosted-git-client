# Data Model: Sidebar Tooltips & Refs Column Overlay Fix

**Feature**: Sidebar Tooltips & Refs Column Overlay Fix  
**Date**: 2026-10-14  
**Status**: Design Phase 1

## Overview

This feature is purely presentational and does not introduce new data entities or state structures. It operates on existing DOM elements and uses the proven `useTruncatedTitle` hook to measure text overflow and conditionally set native `title` attributes.

## Existing Entities (No Changes)

### 1. Tooltip

**What it represents**: A native HTML `title` attribute that the OS renders as a floating tooltip.

**Key attributes**:
- `title` (string): The full text to display in the tooltip
- `condition`: Set only when `scrollWidth > clientWidth` (text is truncated)
- `trigger`: Mouse hover (native OS behavior)
- `delay`: ~100ms (standard OS tooltip delay)

**Lifecycle**:
- Created: When `useTruncatedTitle` hook detects overflow on `mouseenter`
- Displayed: By the OS tooltip system
- Cleared: When `mouseleave` or text no longer overflows

**Validation rules**:
- Must not be set when text fits entirely in container
- Must contain the full, untruncated text
- Must be set only on elements with `truncate` or similar overflow handling

**Relationships**:
- One tooltip per truncated text element
- No relationship to other entities (OS-managed)

### 2. Hover Overlay

**What it represents**: An absolutely-positioned DOM element that appears on hover, showing the full branch/tag badge with styling.

**Key attributes**:
- `position`: absolute
- `z-index`: 30 (ExpandableBadge) or 40 (RefLabels)
- `display`: hidden by default, shown via CSS `group-hover` on parent
- `background`: solid `bg-app-panel-2` with `shadow-lg`
- `content`: Full badge text with icon and lane color

**Lifecycle**:
- Created: Rendered in DOM as part of ExpandableBadge or RefLabels component
- Displayed: On parent hover via CSS `group-hover:inline-flex`
- Hidden: When mouse leaves parent

**Validation rules**:
- Must have `z-index` high enough to appear above adjacent columns
- Must have solid background to read as floating popup
- Must not be clipped by parent's `overflow` property
- Must preserve lane color and icon styling

**Relationships**:
- One overlay per badge (ExpandableBadge or RefLabels)
- Parent: Refs column cell (CommitRow.tsx)
- Sibling: In-flow badge (collapsed state)

### 3. Refs Column Cell

**What it represents**: The grid cell in the commit history table that contains branch/tag badges.

**Key attributes**:
- `className`: `min-w-0 relative flex items-center gap-1 py-1 pl-1 pr-2`
- `overflow`: NOT `hidden` (changed from previous state)
- `min-width`: 0 (prevents grid track expansion)
- `position`: relative (establishes positioning context for absolute overlays)
- `width`: 200px (default, user-resizable)

**Lifecycle**:
- Created: Rendered as part of CommitRow grid
- Updated: When user resizes column or hovers over badge
- Destroyed: When row is removed from DOM (virtualized)

**Validation rules**:
- Must not have `overflow: hidden` (clips overlays)
- Must have `min-w-0` to prevent grid expansion
- Must have `position: relative` for overlay positioning
- Must maintain grid alignment with header

**Relationships**:
- Parent: CommitRow (grid container)
- Children: RefLabels, ExpandableBadge, in-flow badges
- Sibling: Description, Author, Date, SHA columns

### 4. useTruncatedTitle Hook

**What it represents**: A React hook that measures text overflow and conditionally sets the `title` attribute.

**Key attributes**:
- `fullText` (string): The complete text to show in tooltip
- `ref` (React.Ref): Attached to the element being measured
- `onMouseEnter` (function): Callback that measures overflow and sets `title`
- `measurement`: `scrollWidth > clientWidth`

**Lifecycle**:
- Initialized: When component mounts
- Measured: On `mouseenter` event
- Updated: If `fullText` prop changes
- Cleaned: On component unmount (ref cleared)

**Validation rules**:
- Must measure only on `mouseenter` (not on every render)
- Must set `title` only when overflow detected
- Must remove `title` when text fits
- Must handle rapid hover/unhover without memory leaks

**Relationships**:
- Used by: RefTree (folders, tags), BranchRow (branches), Sidebar (working changes, section headers, remotes, stashes), ChangesPanel (files), DetailPanel (files, author)
- Returns: `{ ref, onMouseEnter }` tuple

## State Transitions

### Tooltip State Machine

```
[No Title]
    ↓ (mouseenter, scrollWidth > clientWidth)
[Title Set]
    ↓ (mouseleave OR scrollWidth ≤ clientWidth)
[No Title]
```

### Overlay State Machine

```
[Hidden]
    ↓ (parent hover)
[Visible]
    ↓ (parent unhover OR scroll)
[Hidden]
```

### Refs Column State Machine

```
[Clipped Overlay] (before fix)
    ↓ (remove overflow-hidden, add min-w-0 relative)
[Visible Overlay] (after fix)
```

## Validation Rules Summary

| Entity | Rule | Enforcement |
|--------|------|-------------|
| Tooltip | Set only when truncated | `useTruncatedTitle` hook logic |
| Tooltip | Contains full text | Passed as `fullText` prop |
| Overlay | Not clipped by parent | CSS `min-w-0 relative` on parent |
| Overlay | Appears on top | `z-index: 30/40` + no `overflow: hidden` |
| Refs Cell | Maintains grid alignment | `min-w-0` prevents expansion |
| Hook | Measures on hover only | `onMouseEnter` callback |

## No New Entities or State

This feature does **not** introduce:
- New database tables or records
- New Zustand store slices
- New IPC channels or messages
- New React context or providers
- New component state (beyond existing)
- New data structures or types

All changes are **purely presentational** — measuring existing DOM and setting native HTML attributes.

## Implementation Notes

1. **Hook Reuse**: The `useTruncatedTitle` hook is already implemented and proven in RefTree.tsx and BranchRow.tsx. No new hook implementation needed.

2. **CSS-Only Change**: The Refs column fix is a single CSS class change in CommitRow.tsx line 62. No JavaScript logic changes needed.

3. **No Data Flow Changes**: The feature does not affect how data flows through the application. It only affects how existing data is presented to the user.

4. **Backward Compatibility**: All changes are additive or CSS-only. No breaking changes to components, props, or state.

5. **Testing**: Validation is manual via `npm run dev` (no unit tests configured in the project). See quickstart.md for validation scenarios.
