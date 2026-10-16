# Connection & Identity Manager

## Problem

The app shells out to system `git` via `simple-git` without a TTY. When a
repository's remote uses HTTPS, git tries to prompt for a username/password,
fails with `fatal: could not read Username for 'https://…': Device not
configured`, and every remote operation (fetch, pull, push, clone) breaks.
Third-party tools like SourceTree work because they manage credentials
internally; this app currently has no credential management at all.

The app already has an SSH key manager (lists/generates/deletes keys in
`~/.ssh`), but it provides no way to:

- switch a repository's remote URL between HTTPS and SSH
- store or retrieve HTTPS credentials
- verify that a given SSH key actually works for a given host before relying
  on it
- manage multiple git identities (name/email) and apply the right one per
  repository
- guide the user through setting up a connection for a **new** clone before
  the clone fails

## Goals

Provide a centralized, guided, in-app **Connection Manager** that handles
everything needed for git authentication and identity — for existing
repositories and for new clones — so the user never has to open a terminal.

### Concrete capabilities

1. **Remote URL switcher (HTTPS ↔ SSH)** for an already-open repository, with
   a pre-check that verifies the target connection works *before* the URL is
   changed, so the remote is never left in a broken state.

2. **HTTPS credential management** — store, read, test and remove credentials
   for a given host in the OS-native credential store (macOS Keychain, Windows
   Credential Manager, Linux `~/.git-credentials`), all through `git credential`
   subcommands so the app never handles raw secrets beyond the moment of entry.

3. **SSH connection testing** — verify which SSH key (if any) works for a
   given host before switching to SSH or cloning over SSH.

4. **Guided setup wizard** — a multi-step flow that:
   - detects HTTPS vs SSH from a URL
   - for HTTPS: checks if credentials exist; if not, guides the user to enter
     them, stores them in the OS keychain, and tests the connection
   - for SSH: lists available keys, tests each against the host, guides the
     user to add the public key to their hosting provider if none work, and
     tests the connection
   - blocks the action (clone / switch) until the connection is verified

5. **Enhanced clone dialog** — when cloning a new repository, detect the URL
   protocol, run the connection wizard if needed, allow pre-selecting an
   identity profile, and apply it locally after the clone succeeds.

6. **Identity profiles** — save multiple named git identities (label + name +
   email) in app-local storage; apply one to a repository as either a local
   (`.git/config`) or global (`~/.gitconfig`) setting, with clear warnings
   about what global means.

7. **Connection status badge** — a small, always-visible indicator in the
   TitleBar showing whether the current repo's remote is SSH (key name + ✅/❌)
   or HTTPS (username + ✅/❌); clicking it opens the Connection Manager.

8. **Scope flag everywhere** — every setting that *can* be global (credential
   helper, identity) offers an explicit local-vs-global choice with a short,
   plain-language explanation of the consequences, and defaults to local.

## Non-goals

- The app does not implement its own credential store; it delegates entirely to
  `git credential` and the OS-native helper.
- The app does not manage SSH key passphrases or ssh-agent; it relies on the
  system SSH stack (ssh-agent, `~/.ssh/config`).
- The app does not support OAuth device flows or browser-based auth for
  hosting providers; credentials are entered manually (username + password
  or personal access token for HTTPS; existing keys for SSH).
- The app does not modify SourceTree's configuration; any overlap is
  incidental (shared OS keychain, shared `~/.gitconfig` when the user
  explicitly chooses global).

## SourceTree / global config impact matrix

| Action | This repo | Other repos | SourceTree | Terminal git |
|---|---|---|---|---|
| Switch remote URL (SSH↔HTTPS) | Changed | No | Same repo connects differently | Same |
| Credential helper (automatic, passed via `-c`) | Works | No | No | No |
| Credential helper (local config write) | Config saved | No | No | No |
| Credential helper (global config write) | Config saved | All use it | Yes | Yes |
| HTTPS credentials stored via `git credential approve` | Works | All repos on same host | Yes (same keychain) | Yes |
| Identity (local save) | Changed | No | No | No |
| Identity (global save) | Changed | Default changes | Yes | Yes |
| Clone (any type) | New repo, local identity only | No | No | No |

Every global option is opt-in only — the UI defaults to local, shows a
warning, and requires an explicit selection before the global path is taken.

## Technical design

### Architecture overview

The feature touches all layers of the existing IPC stack:

```
src/shared/types.ts         — new types (GitProfile, SshAccessResult,
                              HttpsCredentialStatus, ConnectionStatus, …)
src/shared/ipc.ts           — new channel names
src/main/services/gitService.ts  — new backend methods (SSH test,
                              credential ops, setRemoteUrl, enhanced
                              getUserConfig/setUserConfig with scope)
src/main/services/credService.ts — new service: git credential subcommands
                                   (fill / approve / reject) via child_process
src/main/ipc.ts             — register new handlers
src/preload/index.ts        — typed API methods
src/renderer/src/lib/prefs.ts — profiles field added to Prefs
src/renderer/src/components/ConnectionManager.tsx — the guided wizard
src/renderer/src/components/SettingsModal.tsx    — enhanced identity section,
                                                    remote URL switcher,
                                                    credential helper UI
src/renderer/src/components/WelcomeScreen.tsx     — enhanced clone dialog
src/renderer/src/components/TitleBar.tsx          — connection status badge
```

### Platform credential helper

Add the platform-native credential helper to `HARDENED_GIT` (gitService.ts)
so every git invocation the app makes can read/write OS keychain credentials:

```typescript
const CRED_HELPER =
  process.platform === 'darwin'  ? 'osxkeychain' :
  process.platform === 'win32'   ? 'manager'    :
                                  'store'

const HARDENED_GIT = {
  config: ['protocol.ext.allow=never', `credential.helper=${CRED_HELPER}`],
  unsafe: { allowUnsafeProtocolOverride: true }
}
```

This passes `-c credential.helper=…` on every git command. It does **not**
write to any git config file, so SourceTree and the terminal are unaffected
unless the user explicitly chooses a global config write in the UI.

### New backend methods

#### gitService.ts

```typescript
// Remote URL
setRemoteUrl(repoPath, name, url): Promise<void>
  // git remote set-url <name> <url>

// SSH access test
testSshAccess(host): Promise<SshAccessResult>
  // ssh -T -o BatchMode=yes -o ConnectTimeout=5 <host>
  // Returns whether any key works and which one.

// Enhanced identity (with scope)
getUserConfig(repoPath): Promise<UserConfigResult>
  // Returns name, email + the scope each came from (local/global/none)

setUserConfig(repoPath, name, email, scope: 'local' | 'global'): Promise<void>
  // git config --local user.name <name>   OR
  // git config --global user.name <name>

// Global identity read (for "use global default" display)
getGlobalUserConfig(): Promise<{ name: string; email: string }>
```

#### credService.ts (new file)

Uses `child_process.spawn` (same pattern as sshService.ts uses execFile) to
run `git credential` subcommands, which read/write from stdin:

```typescript
checkHttpsCredentials(host): Promise<HttpsCredentialStatus>
  // echo "protocol=https\nhost=<host>\n\n" | git credential fill
  // Returns { stored: boolean, username?: string }
  // Never returns the password to the renderer.

storeHttpsCredentials(host, username, password): Promise<void>
  // echo "protocol=https\nhost=<host>\nusername=<user>\npassword=<pass>\n\n"
  //   | git credential approve
  // Stores in OS keychain via the configured helper.

removeHttpsCredentials(host): Promise<void>
  // echo "protocol=https\nhost=<host>\n\n" | git credential reject
  // Removes from OS keychain.

testHttpsAccess(url): Promise<HttpsAccessResult>
  // git ls-remote <url>  (with credential helper active)
  // Returns { success: boolean, username?: string }
```

#### Provider detection (renderer-side utility)

```typescript
getProviderInfo(host): { name: string, sshSettingsUrl?: string }
  // github.com       → https://github.com/settings/ssh
  // gitlab.com       → https://gitlab.com/-/user_settings/ssh_keys
  // bitbucket.org    → https://bitbucket.org/account/settings/ssh-keys/
  // <unknown>        → { name: host, sshSettingsUrl: null }
```

### New shared types

```typescript
// types.ts

export interface GitProfile {
  id: string          // stable unique id
  label: string       // e.g. "Work account", "Personal"
  name: string        // git user.name
  email: string       // git user.email
}

export interface SshAccessResult {
  host: string
  hasWorkingKey: boolean
  workingKey?: string         // key name that worked
  availableKeys: SshKey[]
}

export interface HttpsCredentialStatus {
  host: string
  stored: boolean
  username?: string
}

export interface HttpsAccessResult {
  success: boolean
  username?: string
  error?: string
}

export type RemoteProtocol = 'https' | 'ssh'

export interface ConnectionStatus {
  protocol: RemoteProtocol
  host: string
  // SSH
  sshKey?: string
  sshOk: boolean
  // HTTPS
  httpsUsername?: string
  httpsOk: boolean
}

export type ConfigScope = 'local' | 'global'

export interface UserConfigResult {
  name: string
  email: string
  nameScope: 'local' | 'global' | 'none'
  emailScope: 'local' | 'global' | 'none'
}
```

### New IPC channels

```
// ssh
testSshAccess: 'git:testSshAccess'

// https credentials
checkHttpsCredentials: 'cred:check'
storeHttpsCredentials: 'cred:store'
removeHttpsCredentials: 'cred:remove'
testHttpsAccess: 'cred:test'

// remote url
setRemoteUrl: 'git:setRemoteUrl'

// identity (enhanced)
getGlobalUserConfig: 'git:getGlobalUserConfig'
// setUserConfig is extended to accept a scope parameter

// credential helper config (optional explicit write)
getCredentialHelper: 'git:getCredentialHelper'
setCredentialHelper: 'git:setCredentialHelper'
```

### Renderer changes

#### Prefs (src/renderer/src/lib/prefs.ts)

Add `profiles: GitProfile[]` to the `Prefs` interface and `DEFAULTS`. These
are stored in `localStorage` — app-local, never touch git config until applied.

#### Connection Manager (new component)

A full-screen modal (like the existing `SshManager` component) that provides
the guided wizard. Two main paths:

**SSH path:**
1. List available SSH keys (reuse `api.listSshKeys()`)
2. Test each against the target host (`api.testSshAccess(host)`)
3. If none work: show the public key with a copy button, a link to the
   provider's SSH settings page, and offer to generate a new key (reuse the
   existing `GenerateForm` from `SshManager.tsx`)
4. After the user adds the key to the provider, re-test
5. On success: enable the "Done" / "Continue" button

**HTTPS path:**
1. Check if credentials exist (`api.checkHttpsCredentials(host)`)
2. If yes: show the stored username, offer "Test" / "Update" / "Remove"
3. If no: show a form (username + password/token), with a scope note
   explaining that credentials are stored in the OS keychain and are shared
   with SourceTree and the terminal for the same host
4. On save: `api.storeHttpsCredentials(host, user, pass)`, then test
5. On success: enable "Done" / "Continue"

#### Enhanced clone dialog (WelcomeScreen.tsx)

The existing clone input is expanded to:
1. Detect HTTPS vs SSH from the entered URL (renderer-side regex, no IPC)
2. Show a connection status panel (calls `testSshAccess` or
   `checkHttpsCredentials` + `testHttpsAccess`)
3. If the connection is not set up: show a "Set up connection" button that
   opens the Connection Manager wizard; the "Clone" button stays disabled
   until the connection check passes
4. Optional identity profile selector dropdown (populated from `Prefs.profiles`)
5. On clone success: if a profile was selected, call `api.setUserConfig(target,
   name, email, 'local')` before opening the repo

#### Remote URL switcher (SettingsModal.tsx)

A new "Remotes" section in SettingsModal (shown only when a repo is open):
1. List the repo's remotes with their current URL and detected protocol
2. Each remote has a "Switch to SSH" or "Switch to HTTPS" button
3. Clicking it opens the Connection Manager for the *target* protocol
4. Only after the Connection Manager verifies the target connection does it
   call `api.setRemoteUrl(repoPath, name, newUrl)`
5. If the user cancels the wizard, the URL is not changed

#### Identity profiles (SettingsModal.tsx)

The existing "Git identity" section is enhanced:
1. A profile dropdown populated from `Prefs.profiles` (plus "Use global
   default" and "+ Create new profile")
2. Selecting a profile fills the name/email fields
3. A scope radio: "This repository only (local)" vs "All repositories (global)"
   with the plain-language warnings described in the impact matrix
4. "Save identity" writes via `api.setUserConfig(path, name, email, scope)`
5. "Save as new profile" stores the current name/email as a new GitProfile in
   Prefs
6. The current config's source (local/global/none) is displayed so the user
   knows where the active value comes from

#### Connection status badge (TitleBar.tsx)

A small badge next to the branch chip in the TitleBar:
- SSH: shows the key icon + key name + ✅/❌
- HTTPS: shows a globe icon + username + ✅/❌
- Clicking the badge opens the Connection Manager for the current repo's
  remote host
- The status is fetched on repo open and after any connection-related action

### URL detection & conversion (renderer-side utility)

A small utility module (`src/renderer/src/lib/remoteUrl.ts`) with:

```typescript
// Detect protocol from a remote URL string
detectProtocol(url: string): RemoteProtocol

// Convert HTTPS → SSH
// https://github.com/owner/repo.git → git@github.com:owner/repo.git
httpsToSsh(url: string): string

// Convert SSH → HTTPS
// git@github.com:owner/repo.git → https://github.com/owner/repo.git
sshToHttps(url: string): string

// Extract host from any remote URL
extractHost(url: string): string
```

The SSH → HTTPS conversion mirrors the existing `toWebUrl()` function in
gitService.ts (lines 88-103) but lives in the renderer so the UI can preview
the converted URL before applying it.

### Security considerations

- HTTPS passwords/tokens are passed from the renderer to the main process
  via IPC, used once to call `git credential approve`, and never persisted in
  app memory or storage. The renderer only ever receives `{ stored, username }`
  — never the password back.
- `git credential fill` is called in the main process; the password is
  consumed internally for `git ls-remote` testing and never sent to the
  renderer.
- All `git credential` calls use `child_process.spawn` with stdin piping, not
  shell execution, so the password never appears in a command-line argument
  (which could be visible in process listings).
- SSH key testing uses `BatchMode=yes` so ssh never hangs waiting for a
  passphrase prompt in the background process.
- The existing `assertSafeGitUrl` and `assertSafeGitArg` security checks in
  `src/main/security.ts` are applied to all new git operations.

## Implementation order

1. **Credential helper in `HARDENED_GIT`** — one-line change to
   gitService.ts. Fixes HTTPS auth for all git operations immediately. No UI.

2. **New shared types** — add all types to `src/shared/types.ts`.

3. **New IPC channels** — add all channel names to `src/shared/ipc.ts`.

4. **Backend methods** — implement in gitService.ts and the new
   credService.ts. Register handlers in main/ipc.ts. Add typed methods to
   preload/index.ts.

5. **URL utility module** — `src/renderer/src/lib/remoteUrl.ts` with
   detect/convert/extract helpers.

6. **Connection Manager component** — the guided wizard with SSH and HTTPS
   paths. The largest single piece of UI work.

7. **Remote URL switcher** — new "Remotes" section in SettingsModal, using
   the Connection Manager for pre-checks.

8. **Enhanced clone dialog** — expand the clone section in WelcomeScreen,
   using the Connection Manager.

9. **Identity profiles** — add `profiles` to Prefs, enhance the identity
   section in SettingsModal with profile selection and scope flag.

10. **Connection status badge** — add to TitleBar, wire up status fetching.

11. **Credential helper UI** (optional explicit config write) — add a section
    to SettingsModal for writing `credential.helper` to local or global git
    config, with the scope warning.

## Verification

- `npm run typecheck` must pass (all new types wired through the IPC stack).
- `npm run build` must pass before any commit.
- Manual testing: clone over HTTPS (with and without stored credentials),
  clone over SSH (with and without a working key), switch an existing repo
  from HTTPS to SSH and back, create and apply identity profiles locally and
  globally, verify the connection status badge updates correctly.
- Verify SourceTree is unaffected by local-only operations and only affected
  by explicit global writes.
