# IPC Channel Contracts: Connection & Identity Manager

**Date**: 2026-10-16

All new IPC channels follow the existing typed envelope pattern:
`{ ok: true, data } | { ok: false, error }`. Each channel is registered in
`src/shared/ipc.ts`, handled in `src/main/ipc.ts`, exposed in
`src/preload/index.ts`, and called via `call(api.x())` in the renderer.

## New Channels

### testSshAccess

**Channel**: `git:testSshAccess`

**Direction**: Renderer → Main

**Request**: `host: string`

**Response**: `SshAccessResult`

```
{ host: string, hasWorkingKey: boolean, workingKey?: string, availableKeys: SshKey[] }
```

**Backend**: `gitService.testSshAccess(host)` — runs `ssh -T -o
BatchMode=yes -o ConnectTimeout=5 <host>` via `execFile`. Returns whether
any key works and which one.

**Security**: `host` is validated as a safe git arg (no leading dash,
no whitespace/control chars) before being passed to `ssh`.

---

### checkHttpsCredentials

**Channel**: `cred:check`

**Direction**: Renderer → Main

**Request**: `host: string`

**Response**: `HttpsCredentialStatus`

```
{ host: string, stored: boolean, username?: string }
```

**Backend**: `credService.checkHttpsCredentials(host)` — runs `git
credential fill` with `protocol=https\nhost=<host>\n\n` on stdin. If
credentials exist, parses `username=` from stdout. Password is consumed
internally and discarded — never returned.

**Security**: `host` is validated. The password is never sent to the
renderer.

---

### storeHttpsCredentials

**Channel**: `cred:store`

**Direction**: Renderer → Main

**Request**: `{ host: string, username: string, password: string }`

**Response**: `void`

**Backend**: `credService.storeHttpsCredentials(host, username, password)`
— runs `git credential approve` with
`protocol=https\nhost=<host>\nusername=<user>\npassword=<pass>\n\n` on
stdin. Stores in the OS credential store via the configured helper.

**Security**: `password` is received via IPC, piped to `git credential
approve` via stdin, and never stored in app memory or logs. The
`child_process.spawn` call uses stdin piping, not shell execution, so
the password never appears in process arguments.

---

### removeHttpsCredentials

**Channel**: `cred:remove`

**Direction**: Renderer → Main

**Request**: `host: string`

**Response**: `void`

**Backend**: `credService.removeHttpsCredentials(host)` — runs `git
credential reject` with `protocol=https\nhost=<host>\n\n` on stdin.
Removes credentials from the OS credential store.

**Security**: `host` is validated.

---

### testHttpsAccess

**Channel**: `cred:test`

**Direction**: Renderer → Main

**Request**: `url: string`

**Response**: `HttpsAccessResult`

```
{ success: boolean, username?: string, error?: string }
```

**Backend**: `credService.testHttpsAccess(url)` — runs `git ls-remote
<url>` with the credential helper active. If it succeeds, credentials
work. If it fails with an auth error, credentials are wrong/expired.

**Security**: `url` is validated via `assertSafeGitUrl()`.

---

### setRemoteUrl

**Channel**: `git:setRemoteUrl`

**Direction**: Renderer → Main

**Request**: `{ repoPath: string, name: string, url: string }`

**Response**: `void`

**Backend**: `gitService.setRemoteUrl(repoPath, name, url)` — runs `git
remote set-url <name> <url>`.

**Security**: `name` is validated via `assertSafeGitArg()`. `url` is
validated via `assertSafeGitUrl()`.

---

### getGlobalUserConfig

**Channel**: `git:getGlobalUserConfig`

**Direction**: Renderer → Main

**Request**: (none)

**Response**: `{ name: string, email: string }`

**Backend**: `gitService.getGlobalUserConfig()` — runs `git config
--global user.name` and `git config --global user.email`. Returns empty
strings if not set.

---

### setUserConfig (extended)

**Channel**: `git:setUserConfig` (existing channel, extended signature)

**Direction**: Renderer → Main

**Request**: `{ repoPath: string, name: string, email: string, scope:
ConfigScope }`

**Response**: `void`

**Backend**: `gitService.setUserConfig(repoPath, name, email, scope)` —
runs `git config --local user.name <name>` or `git config --global
user.name <name>` based on scope. Same for `user.email`.

**Note**: This is a **breaking change** to the existing `setUserConfig`
channel signature. The preload method and renderer calls must be updated
to pass the new `scope` parameter. Existing callers (SettingsModal) pass
`'local'` as the default scope.

---

### getUserConfig (extended)

**Channel**: `git:getUserConfig` (existing channel, extended response)

**Direction**: Renderer → Main

**Request**: `repoPath: string`

**Response**: `UserConfigResult`

```
{ name: string, email: string, nameScope: 'local' | 'global' | 'none', emailScope: 'local' | 'global' | 'none' }
```

**Backend**: `gitService.getUserConfig(repoPath)` — runs `git config
--local user.name` (local only), `git config --global user.name` (global
only), and `git config user.name` (effective merged value) to determine
both the value and its source. Same for `user.email`.

**Note**: The response type changes from `{ name, email }` to
`UserConfigResult`. Existing callers must be updated to read the new
fields.

## Existing Channels (unchanged)

These existing channels are reused without modification:

| Channel | Used for |
|---------|----------|
| `ssh:list` (`listSshKeys`) | Listing SSH keys in the wizard and badge |
| `ssh:generate` (`generateSshKey`) | Generating new keys in the wizard |
| `ssh:delete` (`deleteSshKey`) | Deleting keys (unchanged) |
| `git:getRemotes` (`getRemotes`) | Listing remotes for the switcher and badge |
| `git:cloneRepo` (`cloneRepo`) | Cloning (enhanced in the renderer, backend unchanged) |
| `git:fetch` (`fetch`) | Fetching (unchanged, but now works with HTTPS thanks to credential helper) |

## Post-Implementation Bug Fixes

**No new IPC channels are needed for the bug fixes.** All five bugs
are renderer-side or UX issues:

| Bug | Fix approach | New channels? |
|-----|-------------|---------------|
| #1 Badge refresh | Call existing `refreshConnectionStatus()` at new points | No |
| #2 SSH diagnostics | Renderer-side diagnostic text in ConnectionManager | No |
| #3 Profile dialog | Replace `window.prompt` with in-app modal (renderer only) | No |
| #4 Menu consolidation | Restructure renderer components only | No |
| #5 Identity quick-access | New renderer modal + TitleBar button | No |

All existing IPC channels remain valid and unchanged.
