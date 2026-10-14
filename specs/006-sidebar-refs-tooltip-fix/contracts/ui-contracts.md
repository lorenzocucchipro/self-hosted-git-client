# UI Contracts: Sidebar Tooltips & Refs Column Overlay Fix

**Feature**: Sidebar Tooltips & Refs Column Overlay Fix  
**Date**: 2026-10-14  
**Status**: Design Phase 1

## Overview

This document defines the UI contracts for the tooltip and overlay behavior across the application. These contracts specify the expected user-facing behavior and the component interfaces that implement them.

---

## Contract 1: Sidebar Tooltip Behavior

### Scope

All text elements in the left sidebar (Sidebar.tsx) and right sidebars (ChangesPanel.tsx, DetailPanel.tsx) that can be truncated.

### Elements Covered

| Component | Element | Prop/Attribute | Behavior |
|-----------|---------|---|----------|
| Sidebar | "Working changes" label | `title` (conditional) | Show tooltip when truncated |
| Sidebar (Section) | Section headers | `title` (conditional) | Show tooltip on all section headers |
| Sidebar | Remote name | `title` (conditional) | Show tooltip when truncated |
| Sidebar | Remote fetch URL | `title` (conditional) | Show tooltip when truncated |
| Sidebar (StashRow) | Stash message | `title` (conditional) | Show tooltip when truncated |
| ChangesPanel | File path (Unstaged/Staged) | `title` (conditional) | Show tooltip when truncated |
| ChangesPanel | Conflict file path | `title` (conditional) | Show tooltip when truncated |
| DetailPanel (FileRow) | File path | `title` (conditional) | Show tooltip when truncated |
| DetailPanel | Author/email line | `title` (conditional) | Show tooltip when truncated |

### Tooltip Trigger

```
User hovers over truncated text element
    ↓
useTruncatedTitle hook measures element
    ↓
IF scrollWidth > clientWidth:
    Set title attribute to full text
    OS renders native tooltip (~100ms delay)
ELSE:
    Remove title attribute
    No tooltip shown
```

### Expected User Experience

1. **Truncated text**: User hovers → tooltip appears with full text → user moves away → tooltip disappears
2. **Non-truncated text**: User hovers → no tooltip (text already fully visible)
3. **Sidebar resize**: User narrows sidebar → text truncates → tooltip appears on next hover
4. **Sidebar expand**: User widens sidebar → text fits → no tooltip on next hover

### Acceptance Criteria

- [ ] Tooltip appears within ~100ms of mouse hover (standard OS delay)
- [ ] Tooltip shows the complete, untruncated text
- [ ] Tooltip does NOT appear when text fits entirely in container
- [ ] Tooltip disappears when user moves mouse away
- [ ] Tooltip behavior is consistent across all sidebar sections
- [ ] No tooltip appears on short text (e.g., "main", "README.md")
- [ ] Tooltip appears on long text (e.g., "feature/very-long-branch-name-here")

### Implementation Interface

**Hook**: `useTruncatedTitle(fullText: string)`

```typescript
const title = useTruncatedTitle(element.textContent)

return (
  <span ref={title.ref} onMouseEnter={title.onMouseEnter} className="truncate">
    {displayText}
  </span>
)
```

**Hook Returns**:
- `ref`: React ref to attach to the element
- `onMouseEnter`: Callback to measure overflow and set `title`

**Hook Behavior**:
- Measures `scrollWidth > clientWidth` on `mouseenter`
- Sets `title` attribute if overflow detected
- Removes `title` attribute if no overflow
- Handles rapid hover/unhover without memory leaks

---

## Contract 2: Refs Column Overlay Behavior

### Scope

The Refs column in the commit history table (CommitRow.tsx), specifically the hover overlays for branch/tag badges.

### Overlay Types

| Overlay | Component | Z-Index | Trigger | Content |
|---------|-----------|---------|---------|---------|
| Badge Overlay | ExpandableBadge | z-30 | Hover on truncated badge | Full badge with lane color, icon, solid background |
| Refs Popup | RefLabels | z-40 | Hover on "+X" chip | All badges in floating popup |

### Overlay Trigger

```
User hovers over truncated badge in Refs column
    ↓
CSS group-hover selector activates
    ↓
Absolutely-positioned overlay becomes visible
    ↓
Overlay displays full badge with:
  - Lane color (from graph)
  - Branch/tag icon
  - Solid background (bg-app-panel-2)
  - Shadow (shadow-lg) indicating floating popup
    ↓
Overlay extends rightward into Description column
    ↓
User moves away
    ↓
Overlay disappears
```

### Expected User Experience

1. **Truncated badge**: User hovers → full badge overlay appears floating on top of Description column → user moves away → overlay disappears
2. **Multiple refs**: User hovers on "+X" chip → all badges appear in floating popup → user moves away → popup disappears
3. **Short badge**: User hovers → no overlay (badge already fully visible)
4. **Column resize**: User narrows Refs column → badge truncates → overlay appears on next hover
5. **No layout shift**: Overlay extends into Description column but does not cause grid to shift or expand

### Acceptance Criteria

- [ ] Overlay appears immediately on hover (no delay)
- [ ] Overlay shows full badge with lane color, icon, and solid background
- [ ] Overlay extends rightward into Description column without being clipped
- [ ] Overlay has shadow and solid background to read as floating popup
- [ ] Overlay does NOT appear when badge fits entirely in Refs column
- [ ] Overlay disappears when user moves mouse away
- [ ] Grid layout remains perfectly aligned between header and rows
- [ ] No layout shifts or column expansion when overlay is visible
- [ ] Overlay behavior works at all Refs column widths (80px to 300px)

### Implementation Interface

**CSS Change in CommitRow.tsx (line 62)**:

```tsx
// BEFORE:
<div className="overflow-hidden flex items-center gap-1 py-1 pl-1 pr-2">

// AFTER:
<div className="min-w-0 relative flex items-center gap-1 py-1 pl-1 pr-2">
```

**CSS Classes**:
- `min-w-0`: Prevents grid track from expanding to fit content
- `relative`: Establishes positioning context for absolute overlays
- Removed `overflow-hidden`: Allows overlays to be visible (not clipped)

**Overlay CSS (existing in ExpandableBadge)**:

```tsx
<span
  className={`${chip} ${className} bg-app-panel-2 absolute left-0 top-0 z-30 hidden w-max max-w-none whitespace-nowrap shadow-lg group-hover/ref:inline-flex`}
  style={style}
  aria-hidden="true"
>
  {icon}
  {name}
</span>
```

**Overlay CSS (existing in RefLabels)**:

```tsx
<span className="absolute left-0 top-0 z-40 hidden w-max max-w-[320px] group-hover/more:flex flex-wrap items-center gap-1 p-1.5 rounded-md border border-app-border bg-app-panel shadow-2xl">
  {labels}
</span>
```

---

## Contract 3: Grid Layout Stability

### Scope

The commit history table grid layout (CommitTable.tsx and CommitRow.tsx) must remain perfectly aligned after the Refs column CSS change.

### Grid Structure

```
Grid: [Graph] [Refs] [Description] [Author] [Date] [SHA]
      ↓       ↓      ↓              ↓       ↓     ↓
Header row with column names
Row 1 with data
Row 2 with data
...
```

### Alignment Requirements

- [ ] Header and all rows use the same `gridTemplateColumns` string
- [ ] Refs column width is consistent between header and rows
- [ ] No visual misalignment at any window width
- [ ] No layout shifts when hovering over badges
- [ ] No column expansion when overlay is visible
- [ ] Grid remains stable when Refs column is resized (80px to 300px)

### Implementation Interface

**Grid Template** (from columnLayout.ts):

```typescript
const gridTemplateColumns = `
  ${graphWidth}px
  ${columnWidths.refs}px
  ${columnWidths.description || '1fr'}
  ${columnWidths.author}px
  ${columnWidths.date}px
  ${columnWidths.sha}px
`
```

**Refs Cell CSS**:
- `min-w-0`: Prevents track expansion
- No `overflow: hidden`: Allows overlays
- `relative`: Positioning context
- `flex`: Flexbox for badge layout
- `items-center`: Vertical alignment

---

## Contract 4: Tooltip Consistency

### Scope

All tooltip behavior across the application must be consistent in appearance, delay, and triggering.

### Tooltip Mechanism

**Type**: Native HTML `title` attribute (OS-rendered)

**Appearance**: Platform-specific (macOS, Windows, Linux)

**Delay**: ~100ms (standard OS tooltip delay)

**Trigger**: Mouse hover (native OS behavior)

**Dismissal**: Mouse leave or scroll

### Consistency Rules

- [ ] All truncated text uses the same tooltip mechanism (`title` attribute)
- [ ] All tooltips have the same delay (~100ms)
- [ ] All tooltips show the complete, untruncated text
- [ ] No custom tooltip components (use native OS tooltips)
- [ ] No tooltip on text that fits entirely in container

### Comparison with Other Tooltips

| Element | Mechanism | Behavior |
|---------|-----------|----------|
| Sidebar text | Native `title` (conditional) | Appears only when truncated |
| Right sidebar text | Native `title` (conditional) | Appears only when truncated |
| Refs badges | Custom overlay (hover) | Shows full badge with styling |
| Description column | Native `title` (conditional) | Appears only when truncated |
| Fetch button | Native `title` (static) | Always shows |

---

## Testing Strategy

### Manual Testing (npm run dev)

1. **Sidebar Tooltips**:
   - Narrow left sidebar until text truncates
   - Hover over each element type
   - Verify tooltip appears with full text
   - Verify no tooltip on short text

2. **Refs Column Overlay**:
   - Narrow Refs column until badges truncate
   - Hover over truncated badges
   - Verify overlay appears with lane color and icon
   - Verify overlay extends into Description column
   - Verify no layout shifts

3. **Right Sidebar Tooltips**:
   - Narrow right sidebar until file paths truncate
   - Hover over file paths and author names
   - Verify tooltips appear with full text

4. **Grid Alignment**:
   - Resize window to various widths
   - Verify header and rows remain aligned
   - Verify no visual misalignment

### Acceptance Scenarios (from spec.md)

See `spec.md` for detailed acceptance scenarios covering:
- Truncated sidebar content shows tooltip on hover (6 scenarios)
- Refs column hover overlay is not clipped (5 scenarios)

---

## Notes

- All contracts are **user-facing** — they describe what users see and interact with
- No implementation details (React, CSS classes, etc.) are specified in contracts
- Contracts are **testable** — each can be validated via manual testing or automated UI tests
- Contracts are **independent** — each can be implemented and tested separately
- Contracts are **stable** — they define the expected behavior that must not regress
