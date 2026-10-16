# Implementation Plan: Connection & Identity Manager

**Branch**: `007-connection-identity-manager` | **Date**: 2026-10-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/007-connection-identity-manager/spec.md`

## Summary

The app shells out to system `git` via `simple-git` without a TTY, so HTTPS
remotes fail with "could not read Username for 'https://…': Device not
configured". This feature adds a platform-native credential helper to every
git invocation (fixing the root cause), a guided Connection Manager wizard
for SSH/HTTPS setup, a remote URL switcher with pre-checks, an enhanced
clone dialog, multiple git identity profiles with local/global scope, and a
connection status badge in the TitleBar.

The implementation is divided into **6 autonomous chunks** that can be
executed in separate working sessions. Each chunk is self-contained: it
compiles, type-checks, and delivers value on its own. Chunks have explicit
dependencies so the order is clear, but each can be committed independently.

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

**Scale/Scope**: 7 user stories, 21 functional requirements, ~8 new/modified
source files, 1 new service file, 1 new component, ~6 modified components.

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
            ├── ConnectionManager.tsx  # NEW: guided wizard (SSH + HTTPS paths)
            ├── SettingsModal.tsx      # + Remotes section, enhanced identity with profiles/scope
            ├── WelcomeScreen.tsx       # + enhanced clone dialog with connection check
            └── TitleBar.tsx            # + connection status badge
```

**Structure Decision**: Single-project Electron app structure (existing).
No new top-level directories. One new service file (`credService.ts`), one
new renderer utility (`remoteUrl.ts`), one new component
(`ConnectionManager.tsx`). All other changes are additions to existing files.

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

### Chunk 6: Connection Status Badge
**Scope**: The TitleBar badge showing protocol, key name/username, and
success/failure. Local-only check on repo open. Refresh after
connection-related actions.
**Files**: `TitleBar.tsx`, `useStore.ts` (connectionStatus state,
refreshConnectionStatus)
**Depends on**: Chunk 2 (for backend check methods), Chunk 3 (for
Connection Manager to open on click)
**Deliverable**: Badge appears on repo open, updates after wizard/switch,
clicking opens Connection Manager.
**Commit**: `feat(creds): add connection status badge to TitleBar`

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
