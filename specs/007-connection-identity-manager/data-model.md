# Data Model: Connection & Identity Manager

**Date**: 2026-10-16

## Shared Types (src/shared/types.ts)

All types live in the shared module so both the main process and the
renderer can import them. They are framework-free (no Node.js or DOM
types).

### GitProfile

A named git identity stored in the renderer's localStorage. Never touches
git config until explicitly applied to a repository.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Stable unique identifier (UUID via `crypto.randomUUID()`) |
| `label` | `string` | Human-readable label, e.g. "Work account" |
| `name` | `string` | Value for `git config user.name` |
| `email` | `string` | Value for `git config user.email` |

**Validation**: `label` must be non-empty. `name` and `email` must be
non-empty when applying to a repository (empty values are allowed while
editing, but Save is disabled). `email` is not formally validated
(RFC 5322) — a basic non-empty check is sufficient for a desktop app.

**Lifecycle**: Created by the user in Settings. Edited in-place (same
`id`, new values). Deleted by the user — deletion does not affect any
repository's git config that was previously set from the profile.

### RemoteProtocol

```typescript
type RemoteProtocol = 'https' | 'ssh'
```

Detected from a remote URL string. Used by the clone dialog, the remote
URL switcher, and the connection status badge.

### ConfigScope

```typescript
type ConfigScope = 'local' | 'global'
```

The scope at which a git config value is written. `local` writes to
`.git/config` (this repository only). `global` writes to `~/.gitconfig`
(all repositories on the machine).

### SshAccessResult

Result of testing SSH access to a host.

| Field | Type | Description |
|-------|------|-------------|
| `host` | `string` | The host that was tested |
| `hasWorkingKey` | `boolean` | Whether any SSH key successfully authenticated |
| `workingKey?` | `string` | Name of the key that worked (undefined if none) |
| `availableKeys` | `SshKey[]` | All keys found in `~/.ssh` (existing type) |

### HttpsCredentialStatus

Result of checking whether HTTPS credentials are stored for a host.

| Field | Type | Description |
|-------|------|-------------|
| `host` | `string` | The host that was checked |
| `stored` | `boolean` | Whether credentials exist in the OS store |
| `username?` | `string` | The stored username (undefined if not stored). Password is never returned. |

### HttpsAccessResult

Result of a live HTTPS connection test.

| Field | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | Whether the connection test succeeded |
| `username?` | `string` | The username used (if available) |
| `error?` | `string` | Error message if the test failed |

### ConnectionStatus

The authentication state of a repository's primary remote. Used by the
integrated status indicator on the Connection Manager button (Plug icon)
in the TitleBar — a small green tick or red cross in the corner of the
icon. Not a separate badge element.

| Field | Type | Description |
|-------|------|-------------|
| `protocol` | `RemoteProtocol` | HTTPS or SSH |
| `host` | `string` | The remote host |
| `sshKey?` | `string` | SSH key name (SSH only) |
| `sshOk` | `boolean` | Whether an SSH key exists for the host (local check) |
| `httpsUsername?` | `string` | Stored username (HTTPS only) |
| `httpsOk` | `boolean` | Whether credentials are stored (local check) |

### UserConfigResult

The current git identity for a repository with the source of each value.

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Effective `user.name` |
| `email` | `string` | Effective `user.email` |
| `nameScope` | `'local' \| 'global' \| 'none'` | Where `name` came from |
| `emailScope` | `'local' \| 'global' \| 'none'` | Where `email` came from |

## Renderer State (Zustand store)

### New state fields

| Field | Type | Description |
|-------|------|-------------|
| `connectionStatus` | `ConnectionStatus \| null` | Current badge status; null when no repo is open |
| `profiles` | `GitProfile[]` | Loaded from Prefs; the profile list for the dropdown |

### New actions

| Action | Description |
|--------|-------------|
| `refreshConnectionStatus()` | Fetches `ConnectionStatus` for the current repo's primary remote. Called on repo open, after credential store/remove, after wizard close (Done or X), and after remote URL switch. |
| `loadProfiles()` | Loads `GitProfile[]` from Prefs into store state. |
| `saveProfile(profile)` | Creates or updates a profile in Prefs and refreshes store state. |
| `deleteProfile(id)` | Removes a profile from Prefs and refreshes store state. |
| `setRemoteUrl(repoPath, name, url)` | Changes a remote's URL. Calls `refreshConnectionStatus` after. |
| `setOnAuthError(cb)` | Sets a callback that opens the Connection Manager when auth fails during fetch/pull/push. |

## Prefs Extension (src/renderer/src/lib/prefs.ts)

The existing `Prefs` interface gains one new field:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `profiles` | `GitProfile[]` | `[]` | Saved identity profiles |

Loaded and saved via the existing `loadPrefs()` / `savePrefs()` functions.
Corruption recovery: if `profiles` is not an array, default to `[]`.

## App.tsx Component State (Bug Fixes)

The following component state fields in `App.tsx` are added or
modified by the post-implementation bug fixes:

| Field | Type | Description |
|-------|------|-------------|
| `sshOpen` | `boolean` | Removed (Chunk 7d) — SshManager merged into Connection Manager, KeyRound button removed |
| `settingsOpen` | `boolean` | Retained for appearance/auto-fetch/diff view only |
| `connManager` | `{ host, protocol, activeTab?, pendingRemoteChange? } \| null` | Extended with tab state (Connection, SSH Keys, Remotes) and Remotes support (Chunk 7d) |
| `identityOpen` | `boolean` | New (Chunk 7e) — controls the IdentityModal (purely identity-focused) |

## Entity Relationships

```
GitProfile (localStorage)
    │
    │ applied to (user action)
    ▼
Repository .git/config (user.name, user.email)
    │
    │ read by
    ▼
UserConfigResult (returned to renderer)

ConnectionStatus (Zustand state)
    │
    │ rendered as
    ▼
Plug button corner indicator (green tick / red cross)
    │
    │ derived from
    ▼
Remote URL → protocol + host
    │
    ├── HTTPS → HttpsCredentialStatus (OS keychain check)
    └── SSH   → SshKey[] (filesystem check)

SshAccessResult (live test, on demand)
    │
    │ derived from
    ▼
ssh -T <host> → hasWorkingKey + workingKey
```
