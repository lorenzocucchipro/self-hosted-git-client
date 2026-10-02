# Data Model: Sidebar Reference Name Visibility

**Date**: 2026-10-01 | **Spec**: [spec.md](./spec.md)

## Overview

This feature introduces **no new data entities** and **no changes to the existing data model**. It is a purely presentational enhancement that reads from data already in the Zustand store and measures rendered DOM elements at hover time.

The entities below are the existing ones the feature interacts with, documented for clarity.

## Entities (existing — unchanged)

### RefTreeNode

Defined in `src/renderer/src/lib/refTree.ts`. The tree node rendered by `RefTree.tsx`. The feature reads two existing fields:

| Field | Type | Present on | Used for |
|-------|------|------------|----------|
| `path` | `string` | folders, leaves | Full folder path (folders) or full ref path (leaves) — used as the `title` text for folder rows |
| `ref.name` | `string` | leaves only | Full reference name (branch or tag) — used as the `title` text for leaf rows |
| `label` | `string` | folders, leaves | The visible single-segment label — the element whose overflow is measured |

No fields are added or modified. The `title` is set dynamically on the DOM element via a ref, not stored in the node.

### Branch

Defined in `src/shared/types.ts`. Unchanged. `branch.name` already contains the full name (including remote prefix for remote tracking branches).

### Tag

Defined in `src/shared/types.ts`. Unchanged. `tag.name` already contains the full tag name.

## New Code Entity (not a data entity)

### useTruncatedTitle hook

A reusable React hook (new file `src/renderer/src/lib/useTruncatedTitle.ts`) — not a data entity but documented here for completeness.

**Purpose**: Given a full text string, returns a ref callback and `onMouseEnter`/`onMouseLeave` handlers that measure whether the attached element's text overflows on hover and sets/clears the native `title` attribute accordingly.

**Interface** (conceptual):
- Input: `fullText: string` — the text to show in the tooltip if truncated.
- Output: `{ ref, onMouseEnter }` — attach `ref` to the text element, `onMouseEnter` to the same element.
- Behaviour: On `mouseenter`, if `element.scrollWidth > element.clientWidth`, set `element.title = fullText`; otherwise clear `element.title`. The native browser handles dismissal on `mouseleave`.

**No state stored**: The hook does not persist anything. The `title` is set directly on the DOM element; no React state update is needed (avoids re-renders).

## Validation Rules

- The `title` is set **only** when `scrollWidth > clientWidth` (genuine overflow). No character-count heuristic. (FR-009)
- The `title` text is the full name for leaves, full path for folders. (FR-001, FR-002, FR-005)
- The `title` is cleared when the text fits, so no tooltip appears for short names. (FR-003)

## State Transitions

None. The feature has no state machine — it is a stateless DOM measurement on hover.
