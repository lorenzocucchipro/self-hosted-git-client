# Implementation Plan: Connection & Identity Manager

**Branch**: `007-connection-identity-manager` | **Date**: 2026-10-16 | **Spec**: [spec.md](./spec.md)

**Status**: Draft (post-implementation bug fixes added)

**Input**: Feature specification from `specs/007-connection-identity-manager/spec.md`

## Summary

The app shells out to system `git` via `simple-git` without a TTY, so HTTPS
remotes fail with "could not read Username for 'https://…': Device not
configured". This feature adds a platform-native credential helper to every
git invocation (fixing the root cause), a guided Connection Manager wizard
for SSH/HTTPS setup, a remote URL switcher with pre-checks, an enhanced
clone dialog, multiple git identity profiles with local/global scope, and a
connection status indicator integrated into the Connection Manager button
in the TitleBar.

The implementation is divided into **6 autonomous chunks** (Chunks 1–6,
the initial feature) plus **5 bug-fix sub-chunks** (Chunk 7a–7e,
post-implementation fixes). Each chunk is self-contained: it compiles,
type-checks, and delivers value on its own. Chunks have explicit
dependencies so the order is clear, but each can be committed independently.

Key design decisions from clarification (Session 2026-10-16):
- The Connection Manager is a **tabbed hub** (Connection, SSH Keys, Remotes
  tabs) for all connection-related functions. Identity management is NOT
  part of it — it gets its own dedicated modal.
- The standalone SshManager button (KeyRound icon) is **removed entirely**.
- The connection status badge is **integrated into the Connection Manager
  button** (Plug icon) as a small green tick / red cross in the corner —
  not a separate badge element.
- The identity modal is **purely identity-focused** — no connection status,
  remotes, or credentials.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), React 18

**Primary Dependencies**: Electron 33, simple-git, Zustand, Tailwind CSS 3,
electron-vite (Vite 5)

**Storage**: OS-native credential store (macOS Keychain / Windows Credential
Manager / Linux git-credential-store) via `git credential` subcommands;
renderer `localStorage` for identity profiles and app preferences

**Testing**: `npm run typecheck` for types; `npm run build` for full build
(typecheck + electron-vite). No automated test runner currently in the
project — validation is manual via `npm run dev`.

**Target Platform**: macOS, Windows, Linux (Electron desktop app)

**Project Type**: Desktop app (Electron + React)

**Performance Goals**: Connection status badge check on repo open must be
non-blocking and complete in <100ms (local-only check, no network call).
SSH access test must timeout in 5 seconds. Clone dialog connection check
must not block the UI thread.

**Constraints**: No new npm dependencies (use existing `simple-git`,
`child_process`). No native compilation. English-only UI. All colors via
Tailwind semantic tokens. No secrets in code or logs. Passwords never
returned to renderer after storage.

**Scale/Scope**: 7 user stories, 27 functional requirements, ~10 new/modified
source files, 1 new service file, 2 new components (ConnectionManager with
tabs, IdentityModal), 1 removed component (SshManager merged into
ConnectionManager).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Local-First and Private by Design | ✅ Pass | All credential operations use the OS-native store via `git credential`. No network calls except the user's own git remotes. No telemetry. Passwords never leave the main process after storage. |
| II. Type Safety and Contract-Driven IPC | ✅ Pass | All new IPC calls follow the 4-layer pattern (shared channels → main handler → preload bridge → renderer call). All new types in `src/shared/types.ts`. Business logic in services, not inline in `ipc.ts`. |
| III. Build Must Be Green | ✅ Pass | Each chunk must pass `npm run build` before committing. TypeScript strict mode maintained. |
| IV. Single Source of Truth for Identity and Styling | ✅ Pass | All UI uses Tailwind semantic tokens. No hardcoded colors. Branding untouched. |
| V. Simplicity and Minimal Dependencies | ✅ Pass | No new npm packages. Uses existing `simple-git`, `child_process`, `zustand`, `lucide-react`. New `credService.ts` uses `child_process.spawn` (already used by `sshService.ts`). |

No violations. No complexity tracking entries needed.

## Project Structure

### Documentation (this feature)

```text
specs/007-connection-identity-manager/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── ipc-channels.md  # IPC contract for all new channels
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── shared/
│   ├── types.ts              # + GitProfile, SshAccessResult, HttpsCredentialStatus,
│   │                         #   HttpsAccessResult, RemoteProtocol, ConnectionStatus,
│   │                         #   ConfigScope, UserConfigResult
│   └── ipc.ts               # + testSshAccess, checkHttpsCredentials, storeHttpsCredentials,
│                             #   removeHttpsCredentials, testHttpsAccess, setRemoteUrl,
│                             #   getGlobalUserConfig (setUserConfig extended with scope)
├── main/
│   ├── ipc.ts                # + register all new handlers
│   ├── security.ts           # (unchanged — existing assertSafeGitUrl/Arg reused)
│   └── services/
│       ├── gitService.ts     # + setRemoteUrl, testSshAccess, enhanced getUserConfig/setUserConfig,
│       │                     #   getGlobalUserConfig; HARDENED_GIT gets credential.helper
│       └── credService.ts    # NEW: checkHttpsCredentials, storeHttpsCredentials,
│                             #   removeHttpsCredentials, testHttpsAccess
├── preload/
│   └── index.ts              # + typed API methods for all new channels
└── renderer/
    └── src/
        ├── lib/
        │   ├── prefs.ts      # + profiles: GitProfile[] in Prefs
        │   └── remoteUrl.ts  # NEW: detectProtocol, httpsToSsh, sshToHttps, extractHost
        ├── store/
        │   └── useStore.ts    # + connectionStatus state, refreshConnectionStatus action
        └── components/
            ├── ConnectionManager.tsx  # NEW: tabbed hub (Connection, SSH Keys, Remotes tabs)
            ├── IdentityModal.tsx      # NEW (Chunk 7e): quick-access identity modal
            ├── SettingsModal.tsx      # Slimmed: appearance, auto-fetch, diff view only
            ├── WelcomeScreen.tsx       # + enhanced clone dialog with connection check
            ├── TitleBar.tsx            # + integrated status indicator on Plug button,
            │                         #   identity button, removed KeyRound button
            └── SshManager.tsx          # REMOVED (Chunk 7d): merged into ConnectionManager
```

**Structure Decision**: Single-project Electron app structure (existing).
No new top-level directories. One new service file (`credService.ts`), two
new renderer components (`ConnectionManager.tsx` with tabs, `IdentityModal.tsx`),
one new renderer utility (`remoteUrl.ts`). `SshManager.tsx` is removed and
its functionality absorbed into the Connection Manager's "SSH Keys" tab. All
other changes are additions to or removals from existing files.

## Autonomous Implementation Chunks

Each chunk is designed to be a complete, committable unit. Build and
typecheck must pass after each chunk. Chunks are ordered by dependency —
later chunks depend on earlier ones — but each can be done in a separate
session.

### Chunk 1: Credential Helper + Shared Types + IPC Channels
**Scope**: Fix the root cause (HTTPS auth) and lay the type/channel
foundation for all subsequent chunks.
**Files**: `gitService.ts`, `types.ts`, `ipc.ts`, `ipc.ts (main)`,
`preload/index.ts`
**Depends on**: Nothing
**Deliverable**: HTTPS fetch/pull/push works if credentials are in the OS
keychain. All new types and channels exist (handlers may be stubs that
throw "not implemented" — they'll be filled in later chunks).
**Commit**: `feat(creds): add platform credential helper and shared types`

### Chunk 2: Backend Services (credService + gitService methods)
**Scope**: Implement all backend logic — credential operations, SSH
testing, remote URL switching, enhanced identity config.
**Files**: `credService.ts` (new), `gitService.ts`, `ipc.ts` (main — fill
in handlers), `preload/index.ts` (fill in typed methods)
**Depends on**: Chunk 1
**Deliverable**: All IPC calls work end-to-end. Can be tested via the
browser console or a temporary dev hook. No UI yet.
**Commit**: `feat(creds): implement credential, SSH test, and remote URL backend`

### Chunk 3: URL Utility + Connection Manager Wizard
**Scope**: The renderer-side URL detection/conversion utility and the full
Connection Manager wizard component with SSH and HTTPS paths.
**Files**: `remoteUrl.ts` (new), `ConnectionManager.tsx` (new),
`App.tsx` (wire up), `TitleBar.tsx` (add connection button)
**Depends on**: Chunk 2
**Deliverable**: The wizard opens, detects protocol, tests SSH/HTTPS,
guides the user through setup. Can be opened manually via a button.
**Commit**: `feat(creds): add Connection Manager wizard with SSH and HTTPS paths`

### Chunk 4: Remote URL Switcher + Enhanced Clone Dialog
**Scope**: The Remotes section in Settings (with pre-check switch) and the
enhanced clone dialog in WelcomeScreen (with connection check and identity
pre-selection).
**Files**: `SettingsModal.tsx`, `WelcomeScreen.tsx`, `useStore.ts` (clone
flow changes)
**Depends on**: Chunk 3
**Deliverable**: User can switch a repo's remote between HTTPS and SSH with
pre-check. User can clone with connection status and optional identity.
**Commit**: `feat(creds): add remote URL switcher and enhanced clone dialog`

### Chunk 5: Identity Profiles with Scope Control
**Scope**: Profile storage in Prefs, enhanced identity section in Settings
with CRUD, profile dropdown, scope radio, and global warning.
**Files**: `prefs.ts`, `SettingsModal.tsx`, `useStore.ts` (profile state)
**Depends on**: Chunk 2 (for `getUserConfig`/`setUserConfig` with scope)
**Deliverable**: User can create, edit, delete profiles; apply them locally
or globally with warnings.
**Commit**: `feat(creds): add identity profiles with local/global scope`

### Chunk 6: Connection Status Indicator (Integrated into Plug Button)
**Scope**: The Connection Manager button (Plug icon) in the TitleBar shows
a small green tick or red cross in the corner of the icon, reflecting the
connection health of the primary remote. Local-only check on repo open.
Refresh after connection-related actions. The standalone badge element
next to the branch name is replaced by this integrated indicator.
**Files**: `TitleBar.tsx` (integrate indicator into Plug button, remove
standalone badge), `useStore.ts` (connectionStatus state,
refreshConnectionStatus)
**Depends on**: Chunk 2 (for backend check methods), Chunk 3 (for
Connection Manager to open on click)
**Deliverable**: The Plug button shows a green/red indicator on repo open,
updates after wizard/switch, clicking opens Connection Manager.
**Commit**: `feat(creds): integrate connection status indicator into Plug button`

### Dependency Graph

```
Chunk 1 (types + credential helper)
  │
  ▼
Chunk 2 (backend services)
  │
  ├──► Chunk 3 (URL util + wizard)
  │      │
  │      ├──► Chunk 4 (switcher + clone dialog)
  │      │
  │      └──► Chunk 6 (status badge)
  │
  └──► Chunk 5 (identity profiles)
```

Chunks 3 and 5 can be done in parallel after Chunk 2. Chunk 4 depends on
3. Chunk 6 depends on 2 and 3. If working sequentially: 1 → 2 → 3 → 4 → 5
→ 6.

---

## Post-Implementation Bug Fixes (Chunk 7)

After the initial implementation of Chunks 1–6, five bugs were found
during testing. These are organized into Chunk 7, divided into 5
sub-chunks that can be worked on independently.

### Chunk 7a: Badge Refresh After Credential Changes (Bug #1)

**Scope**: Ensure the connection status badge updates immediately
when credentials are stored or removed in the Connection Manager —
not only when the user clicks "Done".
**Files**: `ConnectionManager.tsx` (call `refreshConnectionStatus`
after save/remove), `App.tsx` (call `refreshConnectionStatus` in
`onClose` handler)
**Depends on**: Chunk 6 (badge infrastructure)
**Deliverable**: Badge updates the moment credentials are saved or
removed, regardless of how the wizard is closed.
**Commit**: `fix(creds): refresh badge after credential changes`

### Chunk 7b: SSH Diagnostic Messages (Bug #2)

**Scope**: When SSH access testing fails, show inline guidance
explaining the common causes and the terminal commands to isolate
the issue.
**Files**: `ConnectionManager.tsx` (add diagnostic panel to SSH path
failure state)
**Depends on**: Chunk 3 (Connection Manager)
**Deliverable**: When SSH test fails, the user sees actionable
guidance instead of a bare "no key works" message.
**Commit**: `fix(ssh): add diagnostic guidance when SSH test fails`

### Chunk 7c: In-App Profile Dialog (Bug #3)

**Scope**: Replace `window.prompt()` with an in-app modal for
creating and editing identity profiles.
**Files**: `SettingsModal.tsx` (replace `window.prompt` calls), new
`ProfileModal` component or extend existing `PromptModal`
**Depends on**: Chunk 5 (identity profiles)
**Deliverable**: "Save as new profile" and "Edit profile" open a
proper dialog with label/name/email fields. No `window.prompt`.
**Commit**: `fix(identity): replace window.prompt with in-app modal`

### Chunk 7d: Menu Consolidation (Bug #4)

**Scope**: Merge SshManager into Connection Manager (tabbed layout), move
Remotes section from Settings into Connection Manager, remove the
standalone SshManager button (KeyRound icon) entirely.
**Files**: `ConnectionManager.tsx` (add "SSH Keys" and "Remotes" tabs,
absorb SshManager key management including delete), `SettingsModal.tsx`
(remove Remotes section and Git identity section), `TitleBar.tsx` (remove
KeyRound button entirely), `App.tsx` (remove SshManager state), delete
`SshManager.tsx`
**Depends on**: Chunks 3, 4 (Connection Manager + Remotes)
**Deliverable**: One unified Connection Manager hub with tabs (Connection,
SSH Keys, Remotes) for all connection-related functions. Settings only
for app preferences. KeyRound button removed from TitleBar.
**Commit**: `refactor(ui): consolidate connection menus into tabbed hub`

### Chunk 7e: Git Identity Quick-Access (Bug #5)

**Scope**: Extract the Git identity section into its own quick-access
modal, accessible via a dedicated TitleBar button. The modal is purely
identity-focused — no connection status, remotes, or credentials.
**Files**: New `IdentityModal.tsx` (extracted from SettingsModal —
current identity display, profile dropdown, name/email fields, scope
radio, save/edit/delete actions), `SettingsModal.tsx` (remove identity
section entirely), `TitleBar.tsx` (add identity button — e.g. User icon),
`App.tsx` (wire up new modal)
**Depends on**: Chunk 5 (identity profiles), Chunk 7c (in-app dialog)
**Deliverable**: One click from TitleBar to open a focused identity modal.
Selecting a profile and saving takes under 10 seconds. No connection
or remote content in the modal.
**Commit**: `feat(identity): add quick-access identity modal`

### Updated Dependency Graph (with bug fixes)

```
Chunk 1 (types + credential helper)
  │
  ▼
Chunk 2 (backend services)
  │
  ├──► Chunk 3 (URL util + wizard)
  │      │
  │      ├──► Chunk 4 (switcher + clone dialog)
  │      │
  │      └──► Chunk 6 (status badge)
  │             │
  │             └──► Chunk 7a (badge refresh fix)
  │
  └──► Chunk 5 (identity profiles)
         │
         ├──► Chunk 7c (in-app profile dialog)
         │
         └──► Chunk 7e (identity quick-access)

Chunk 3 + Chunk 4 ──► Chunk 7d (menu consolidation)

Chunk 3 ──► Chunk 7b (SSH diagnostics)
```

Chunk 7a–7e can be done in any order (they touch different files),
except 7e depends on 7c, and 7d depends on 3+4 being complete. Note:
7d and 7e both modify `SettingsModal.tsx` and `TitleBar.tsx` — if done
in the same session, coordinate the changes. 7d removes the Remotes
section and KeyRound button; 7e removes the identity section and adds
the identity button.
