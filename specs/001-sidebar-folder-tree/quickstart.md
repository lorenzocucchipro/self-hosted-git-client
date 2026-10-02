# Quickstart Validation Guide

End-to-end validation scenarios for the sidebar folder tree. Run these after
implementation to confirm the feature works against a real repository.

## Prerequisites

- Node.js and npm; the project's dependencies installed (`npm install`).
- A git repository with a mix of flat and slash-separated branch and tag names.
  If you don't have one, create a scratch repo:

  ```bash
  mkdir /tmp/tree-demo && cd /tmp/tree-demo && git init
  git commit --allow-empty -m init
  git branch feature/epic-1/taskA
  git branch feature/epic-1/taskB
  git branch feature/epic-2/taskC
  git branch bugfix/login
  git branch feature            # leaf that collides with the feature/ folder
  git tag v1.0.0
  git tag release/v1.0.0
  git tag release/v1.1.0-rc1
  # add a remote and push to get remote tracking branches, e.g.:
  # git remote add origin <url> && git push -u --all
  ```

## Build check

```bash
npm run build
```

Expected: typecheck + electron-vite build completes with no errors.

## Live validation

```bash
npm run dev
```

Open the scratch repo above (or any repo with nested names) in the app, then
verify each scenario. For each, the sidebar's "Local branches", "Remote
branches" and "Tags" sections should render as collapsible folder trees.

### Scenario 1 — Local branches tree (FR-001, FR-004..006, FR-009, FR-016, FR-018)

1. Open the "Local branches" section.
2. Expected: `feature` is a folder (chevron `>`); `bugfix` is a folder; `main`
   and `feature` (the colliding leaf) are top-level leaves.
3. Click the `feature` chevron → it expands (chevron becomes `v`) and reveals
   an `epic-1` folder and `epic-2` folder, indented.
4. Expand `epic-1` → reveals `taskA` and `taskB` leaves.
5. Collapse `feature` → all descendants disappear.
6. Sibling order matches git's `for-each-ref` order (no alphabetical re-sort).

### Scenario 2 — Leaf + folder collision (FR-010)

1. With both `feature` (branch) and `feature/epic-1/taskA` present.
2. Expected: a `feature` leaf AND a `feature` folder both appear at the top
   level; neither hides the other.

### Scenario 3 — Current-branch indicator (FR-011)

1. Check out `feature/epic-1/taskA` (`git checkout feature/epic-1/taskA`).
2. Refresh the sidebar (or restart the app with the folder collapsed).
3. Expected: with `feature` collapsed, its chevron/label shows a small accent
   indicator showing the current branch is inside. Expand `feature` → `epic-1`
   also shows the indicator while collapsed; expand `epic-1` → `taskA` leaf is
   highlighted (check icon) and the ancestor indicators disappear.

### Scenario 4 — Remote branches tree (FR-002)

1. Open "Remote branches".
2. Expected: `origin` is a top-level folder; expanding it reveals the same
   nested folder structure for the remote tracking branches. Multiple
   remotes each appear as separate top-level folders.

### Scenario 5 — Tags tree (FR-003)

1. Open "Tags".
2. Expected: `v1.0.0` is a top-level leaf; `release` is a folder containing
   `v1.0.0` and `v1.1.0-rc1` leaves. Expand/collapse works identically to
   branches.

### Scenario 6 — Persistence across restart (FR-015)

1. Expand `feature` and `feature/epic-1` in the local branches tree.
2. Quit the app and relaunch it, opening the same repo.
3. Expected: `feature` and `feature/epic-1` are still expanded.
4. Open a different repo, then switch back.
5. Expected: the first repo's expand/collapse state is preserved; the second
   repo has its own independent state.

### Scenario 7 — Empty folders auto-removed (FR-019)

1. Delete the last branch under a prefix, e.g. `git branch -D feature/epic-1/taskB`
   then `git branch -D feature/epic-1/taskA`.
2. Refresh the sidebar.
3. Expected: the `epic-1` folder disappears (it has no remaining leaves); if
   `feature` now has no other children it disappears too. No empty folder
   nodes remain.

### Scenario 8 — Leaf actions unchanged (FR-007, FR-008)

1. Double-click a branch leaf → it checks out (same as before).
2. Right-click a branch leaf → the same context menu (Checkout, Merge,
   Delete) appears.
3. Click a folder → nothing checks out (folders are not checkout targets).

### Scenario 9 — Performance (SC-002, FR-013)

1. In a repo with 200+ slash-separated branch names, toggle folders open and
   closed.
2. Expected: each toggle is instantaneous with no perceptible lag; the initial
   tree render is under 1 second.

## References

- Spec: [spec.md](../spec.md)
- Data model: [data-model.md](../data-model.md)
- Component contract: [contracts/ref-tree.md](../contracts/ref-tree.md)
