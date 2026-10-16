# Research: Connection & Identity Manager

**Date**: 2026-10-16

## R1: Platform Credential Helper Selection

**Decision**: Use `osxkeychain` (macOS), `manager` (Windows), `store`
(Linux), passed via `-c credential.helper=...` on every git command.

**Rationale**: These are the helpers bundled with or commonly available
alongside the system git installation on each platform. Passing via `-c`
flag (not config file write) means the app is self-contained and does not
modify the user's git config. `simple-git` supports this via the `config`
option in its constructor, which is already used for
`protocol.ext.allow=never` in `HARDENED_GIT`.

**Alternatives considered**:
- Writing `credential.helper` to `~/.gitconfig` globally — rejected per
  clarification: the app must not write to git config automatically. Only
  a disclaimer with the terminal command is shown.
- Bundling a custom credential helper — rejected: violates constitution
  principle V (simplicity, minimal dependencies).
- Using `git credential` without a helper — rejected: without a helper,
  `git credential fill` cannot read from the OS store.

## R2: `git credential` Subcommand Protocol

**Decision**: Use `child_process.spawn('git', ['credential', ...])` with
stdin piping for all credential operations.

**Rationale**: `git credential fill`, `git credential approve`, and `git
credential reject` read a key-value block from stdin and write to the OS
credential store via the configured helper. Using `spawn` (not `exec` or
shell) ensures the password never appears in a command-line argument,
which could be visible in process listings. This matches the existing
pattern in `sshService.ts` which uses `execFile`.

**Protocol details**:
- `fill`: stdin = `protocol=https\nhost=<host>\n\n` → stdout includes
  `username=<user>\npassword=<pass>\n` if credentials exist. The password
  is consumed in the main process and never sent to the renderer.
- `approve`: stdin = `protocol=https\nhost=<host>\nusername=<user>\npassword=<pass>\n\n`
  → stores credentials in the OS store.
- `reject`: stdin = `protocol=https\nhost=<host>\n\n` → removes credentials
  from the OS store.

**Alternatives considered**:
- `execFile` with echo pipe — rejected: shell injection risk if host
  contains special characters (though hosts are validated). `spawn` with
  stdin is cleaner.
- simple-git's raw API — rejected: `git credential` is not a standard git
  command that simple-git wraps; it needs stdin piping which simple-git
  does not support cleanly.

## R3: SSH Access Testing

**Decision**: Run `ssh -T -o BatchMode=yes -o ConnectTimeout=5 <host>` via
`execFile` and interpret the result.

**Rationale**: `BatchMode=yes` prevents ssh from hanging on a passphrase
prompt (it fails immediately instead). `ConnectTimeout=5` prevents hanging
on an unreachable host. For GitHub, a successful auth returns exit code 1
with "Hi <username>!" on stderr — this is the expected "success" signal.
For other hosts, exit code 0 or a greeting on stderr indicates success.
"Permission denied (publickey)" indicates no key works.

**Interpretation logic**:
- Exit code 0 → success (some hosts return 0)
- Exit code 1 with "Hi " on stderr → success (GitHub pattern)
- Exit code 255 with "Permission denied" → no key works
- Any other exit code → ambiguous, treat as failure

**Identifying which key worked**: `ssh -v` outputs which key file was
offered and accepted. Parse stderr for `Offering public key:
<path>>` and `Server accepts key: <path>`. Alternatively, test with
`GIT_SSH_COMMAND="ssh -i <keyfile>"` to test individual keys. The simpler
approach: run `ssh -T` once to check if *any* key works, then if needed,
test individual keys with `-i <keyfile>`.

**Alternatives considered**:
- `ssh -v` and parse verbose output — more complex, fragile parsing.
- Testing each key individually with `-i` — slower but more precise. Use
  this as a fallback if the aggregate test fails and the user wants to
  know which specific key to add to the provider.

## R4: URL Protocol Detection and Conversion

**Decision**: Renderer-side regex-based detection and conversion. No IPC
needed.

**Rationale**: URL detection is a pure string operation. The existing
`toWebUrl()` function in `gitService.ts` (lines 88-103) already handles
SSH→HTTPS conversion for the main process. A renderer-side mirror avoids
an IPC round-trip for a trivial computation.

**Detection rules**:
- Starts with `https://` or `http://` → HTTPS
- Starts with `git@` or `ssh://` → SSH
- Matches `^[A-Za-z][A-Za-z0-9+.-]*://` with protocol `ssh` → SSH
- Anything else → unsupported

**Conversion rules**:
- HTTPS → SSH: `https://host/path` → `git@host:path`
- SSH → HTTPS: `git@host:path` → `https://host/path` (mirrors existing
  `toWebUrl()` logic)
- Strip `.git` suffix and trailing slashes in both directions

**Alternatives considered**:
- Using the `URL` API for parsing — works for HTTPS but not for scp-like
  SSH URLs (`git@host:path`), which are not valid URLs. Regex is necessary.

## R5: Identity Profile Storage

**Decision**: Store profiles in the renderer's `localStorage` via the
existing `Prefs` system (`src/renderer/src/lib/prefs.ts`).

**Rationale**: The Prefs system already persists app-level preferences
(theme, auto-fetch interval, sidebar widths) in `localStorage` with safe
defaults and corruption recovery. Adding a `profiles: GitProfile[]` field
follows the same pattern. Profiles are app-local metadata — they don't
touch git config until explicitly applied to a repository.

**Profile ID generation**: Use `crypto.randomUUID()` (available in the
Electron renderer context) for stable, collision-free IDs.

**Alternatives considered**:
- Storing in the main process's `state.json` (via `store.ts`) — rejected:
  profiles are renderer-side UI state, not main-process state. The Prefs
  system is the established pattern for this.
- Storing in git config — rejected: profiles are app metadata, not git
  data. They should survive a `git clean` and not pollute `.git/config`.

## R6: Connection Status Indicator — Local-Only Check (Integrated into Plug Button)

**Decision**: On repo open, check locally whether credentials or an SSH
key exist for the primary remote's host. No network call. The result is
shown as a small green tick or red cross in the corner of the Connection
Manager button (Plug icon) in the TitleBar — not as a separate badge
element.

**Rationale**: Per clarification, a live network test on every repo open
would add latency and could hang on a slow network. A local-only check is
instant (<100ms) and gives a reasonable "configured" vs "not configured"
status. The user can click "Test" in the Connection Manager for a live
verification. Per clarification (Session 2026-10-16), the status indicator
is integrated into the Connection Manager button itself — a small green
tick or red cross in the corner of the Plug icon — replacing the
standalone badge element. This reduces TitleBar clutter and ties the
status directly to the action button.

**Implementation**:
- For HTTPS: call `checkHttpsCredentials(host)` → returns
  `{ stored: boolean, username?: string }`. This runs `git credential
  fill` which checks the OS store without a network call.
- For SSH: check if any SSH key exists in `~/.ssh` (via
  `api.listSshKeys()`). This is a filesystem check, not a network call.
  The indicator shows green if keys exist, but this does not verify they
  work for the specific host — that's the live test.

**Alternatives considered**:
- Background live test after a delay — rejected per clarification: adds
  complexity and the indicator would flip from green to red, which is
  confusing.
- Separate badge element next to branch name — rejected per
  clarification: integrated indicator on the Plug button is cleaner and
  reduces TitleBar clutter.
- No indicator at all — rejected: the indicator provides ongoing
  visibility which is a stated goal.

## R7: `window.prompt()` Not Available in Electron (Bug #3)

**Date**: 2026-10-16 (post-implementation)

**Decision**: Replace all `window.prompt()` calls with in-app modal
dialogs using the existing `PromptModal` / `Modal` component pattern.

**Rationale**: Electron does not implement `window.prompt()` — it
returns `null` immediately without showing any dialog. This is a
well-known Electron limitation because blocking dialogs freeze the
renderer process, which conflicts with Electron's IPC architecture.
The app uses `sandbox: true` and `contextIsolation: true` (standard
secure setup), which does not change this behavior.

**Affected code**:
- `SettingsModal.tsx` `saveAsNewProfile()` — uses `window.prompt('Profile label?', '')`
- `SettingsModal.tsx` `editProfile()` — uses `window.prompt()` three times
  (label, name, email)

**Note**: `window.confirm()` IS implemented in Electron (shows a native
dialog), so `removeProfile()` which uses `window.confirm()` works
correctly. Only `window.prompt()` is broken.

**Alternatives considered**:
- Using Electron's `dialog.showMessageBox` from the main process —
  rejected: over-engineered for simple text input. An in-app modal is
  more consistent with the existing UI and supports multiple fields
  (label + name + email) in one dialog.
- Using `window.confirm` with a workaround — rejected: confirm only
  returns boolean, can't capture text input.

## R8: Badge Refresh Architecture (Bug #1)

**Date**: 2026-10-16 (post-implementation)

**Decision**: Call `refreshConnectionStatus()` directly inside the
Connection Manager's credential save/remove flow, and in the wizard's
`onClose` handler as a safety net.

**Rationale**: The initial implementation only refreshed the badge
when the user clicked "Done" in the Connection Manager (via the
`onConnected` callback). The "Done" button only appears when the
access test passes (`ok = access?.success === true`). If the test
fails (e.g. network error unrelated to credentials) or the user
closes via the X button, the badge stays stale.

**Fix points**:
1. Inside `saveCreds()` — after `check()` and `testAccess()` succeed,
   call `useStore.getState().refreshConnectionStatus()`.
2. Inside `removeCreds()` — after `check()`, call
   `useStore.getState().refreshConnectionStatus()`.
3. In `App.tsx` `onClose` handler — call
   `useStore.getState().refreshConnectionStatus?.()` as a safety net.

**Why not just refresh in `onClose`?** The `onClose` path works, but
it's a single point of failure. Calling it inside `saveCreds`/`removeCreds`
ensures the badge updates the moment data changes, even if the user
has the wizard open and is looking at the TitleBar simultaneously.

## R9: SSH Diagnostic Messages (Bug #2)

**Date**: 2026-10-16 (post-implementation)

**Decision**: When SSH access testing fails, display inline diagnostic
guidance explaining the common causes and terminal commands to isolate
the issue.

**Rationale**: `BatchMode=yes` (FR-021) is essential to prevent the
process from hanging on a passphrase prompt. However, it means a
passphrase-protected key that is not loaded in `ssh-agent` will silently
fail. The user sees "No SSH key works" with no explanation of what to
do. The app cannot prompt for passphrases (per non-goals: "The app does
not manage SSH key passphrases or ssh-agent").

**Common failure causes and guidance**:
1. **Key not added to provider**: The public key exists in `~/.ssh` but
   is not registered with GitHub/GitLab/etc. → "Add your public key to
   {provider}" with copy button and provider link.
2. **Key passphrase not in ssh-agent**: The key has a passphrase and
   is not loaded. → Show `ssh-add ~/.ssh/<keyname>` and explain that
   `BatchMode=yes` prevents the app from prompting.
3. **Host unreachable**: Network issue or wrong host. → Show
   `ssh -T git@<host>` to test interactively (without BatchMode).
4. **No keys in ssh-agent**: → Show `ssh-add -l` to list loaded keys.

**Implementation**: Add a diagnostic panel to the SSH path failure
state in `ConnectionManager.tsx`. The panel is always shown when
`access?.hasWorkingKey === false`, below the status banner.

## R10: Menu Consolidation Rationale (Bug #4)

**Date**: 2026-10-16 (post-implementation, updated per clarification)

**Decision**: Merge SshManager into Connection Manager using a **tabbed
layout** (Connection, SSH Keys, Remotes tabs), move Remotes section from
Settings into Connection Manager, **remove the standalone SshManager
button (KeyRound icon) entirely**.

**Rationale**: The initial implementation created 5 separate entry
points for connection-related functionality (see Bug #4 in spec.md).
The Connection Manager's SSH path already duplicates most of SshManager
(key listing, public key display with copy, key generation). The
Remotes section in Settings is conceptually part of connection
management, not app preferences. Per clarification (Session 2026-10-16):
- The KeyRound button is **removed entirely** (not redirected) to
  eliminate confusion about which button does what.
- The Connection Manager uses a **tabbed layout** with three tabs:
  "Connection" (protocol-aware, default), "SSH Keys" (list, generate,
  delete, copy), and "Remotes" (list, switch HTTPS ↔ SSH with pre-check).
- Identity management is NOT part of the Connection Manager — it gets
  its own dedicated modal (see R11).

**Consolidation plan**:
- SshManager's key delete functionality is added to Connection Manager
  "SSH Keys" tab (currently missing).
- Remotes section moves from SettingsModal to Connection Manager
  "Remotes" tab.
- Standalone SshManager button (KeyRound icon) in TitleBar is removed
  entirely. `SshManager.tsx` is deleted.
- Settings keeps only: appearance, auto-fetch, diff view (and Git
  identity until Chunk 7e moves it out too).
- The connection status indicator is integrated into the Connection
  Manager button (Plug icon) as a small green tick / red cross in the
  corner — not a separate badge element.

**Risk**: Existing users who know the SshManager button may be
temporarily confused. Mitigation: the Plug button with the status
indicator is more discoverable and the Connection Manager's "SSH Keys"
tab is the clear replacement.

## R11: Identity Modal — Quick-Access, Purely Identity-Focused (Bug #5)

**Date**: 2026-10-16 (post-implementation, added per clarification)

**Decision**: Extract the Git identity section into its own quick-access
modal, accessible via a dedicated TitleBar button (e.g. User icon). The
modal is **purely identity-focused** — no connection status, no remotes,
no credentials.

**Rationale**: Per clarification (Session 2026-10-16), the identity modal
must be fast and minimal to meet SC-005 ("switch between multiple git
identities in under 10 seconds"). Mixing connection concerns would slow
down the identity workflow and duplicate what the Connection Manager
already provides. The modal contains only: current identity display
(with source), profile dropdown, name/email fields, scope radio (local/
global with warning), and save/edit/delete actions.

**Alternatives considered**:
- Include connection status in the identity modal — rejected per
  clarification: keeps the modal minimal and fast.
- Keep identity in Settings — rejected: SC-005 is not met when identity
  is buried behind unrelated preferences.
