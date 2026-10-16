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

## R6: Connection Status Badge — Local-Only Check

**Decision**: On repo open, check locally whether credentials or an SSH
key exist for the primary remote's host. No network call.

**Rationale**: Per clarification, a live network test on every repo open
would add latency and could hang on a slow network. A local-only check is
instant (<100ms) and gives a reasonable "configured" vs "not configured"
status. The user can click "Test" in the Connection Manager for a live
verification.

**Implementation**:
- For HTTPS: call `checkHttpsCredentials(host)` → returns
  `{ stored: boolean, username?: string }`. This runs `git credential
  fill` which checks the OS store without a network call.
- For SSH: check if any SSH key exists in `~/.ssh` (via
  `api.listSshKeys()`). This is a filesystem check, not a network call.
  The badge shows green if keys exist, but this does not verify they work
  for the specific host — that's the live test.

**Alternatives considered**:
- Background live test after a delay — rejected per clarification: adds
  complexity and the badge would flip from green to red, which is
  confusing.
- No badge at all — rejected: the badge provides ongoing visibility
  which is a stated goal.
