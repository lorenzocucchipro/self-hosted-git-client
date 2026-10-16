# Feature Specification: Connection & Identity Manager

**Feature Branch**: `007-connection-identity-manager`

**Created**: 2026-10-16

**Status**: Draft (post-implementation bug fixes added)

**Input**: User description: "A centralized, guided, in-app Connection Manager that handles everything needed for git authentication and identity — for existing repositories and for new clones — so the user never has to open a terminal. Covers: remote URL switching between HTTPS and SSH, HTTPS credential management via the OS keychain, SSH connection testing, a guided setup wizard, an enhanced clone dialog, multiple git identity profiles with local/global scope, a connection status badge, and explicit scope flags with clear warnings about global-config impact on third-party tools like SourceTree."

## Clarifications

### Session 2026-10-16

- Q: Should the app allow users to edit and delete existing identity profiles, or only create and apply them? → A: Full CRUD (create, edit, and delete profiles).
- Q: When a repository has multiple remotes with different protocols, should the connection status badge reflect all remotes or only the primary? → A: Primary remote only (origin, or first remote if origin doesn't exist).
- Q: When the user fetches from an HTTPS remote and no credentials are stored, should the app auto-open the wizard or show an error toast? → A: Error toast with a "Set up connection" button — user clicks to open the wizard.
- Q: Should the connection status badge perform a live network test on repo open or only check locally? → A: Local-only check on repo open (credentials exist? key exists?) — fast, live test only on explicit user action.
- Q: Should the app offer to write the credential helper to git config as an explicit option, or is the automatic flag sufficient? → A: Automatic flag only, no config-file write in the UI. Include a disclaimer with a short overview of the terminal command for manual setup.
- Q: Should the Connection Manager become a single hub with tabs for all connection functions including identity, or should identity stay in its own separate quick-access modal? → A: Connection Manager hub for SSH/HTTPS/remote URLs; separate identity modal via its own TitleBar button.
- Q: When SshManager is merged into the Connection Manager, should the KeyRound button be removed or redirected? → A: Remove the KeyRound button entirely. The Connection Manager button (Plug icon) gets a dynamic status indicator — a small green tick or red cross in the corner of the button icon — showing connection health at a glance. This merges the connection status badge into the button itself.
- Q: Should the Connection Manager hub use a tabbed layout or a single scrollable page? → A: Tabbed layout with "Connection" (protocol-aware), "SSH Keys", and "Remotes" tabs.
- Q: Should the dedicated identity modal also show connection status, or be purely identity-focused? → A: Purely identity-focused — no connection status, no remotes, no credentials. Keeps it fast and minimal for SC-005.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - HTTPS Authentication Works Out of the Box (Priority: P1)

A user opens a repository whose remote uses HTTPS. Previously every fetch,
pull and push failed with "could not read Username for 'https://…': Device
not configured" because the app spawns git without a terminal to prompt for
credentials. After this feature, the app automatically uses the
operating system's native credential store (macOS Keychain, Windows
Credential Manager, Linux git-credential-store) so that HTTPS
authentication works without any manual setup — as long as credentials
for that host are already in the OS store. If credentials are not yet
stored, the user is guided through entering them in-app.

**Why this priority**: This is the root cause of the original bug report.
Without it, no HTTPS remote operation works at all. It is the foundation
every other story builds on.

**Independent Test**: Open a repository with an HTTPS remote whose
credentials are already in the OS keychain (e.g., previously used from
the terminal). Click Fetch — it succeeds without error.

**Acceptance Scenarios**:

1. **Given** a repository with an HTTPS remote and credentials already
   stored in the OS keychain, **When** the user clicks Fetch, **Then**
   the fetch completes successfully with no authentication error.
2. **Given** a repository with an HTTPS remote and no credentials stored,
   **When** the user clicks Fetch, **Then** the app shows an error toast
   with a "Set up connection" button that opens the Connection Manager,
   rather than the raw "Device not configured" git error.
3. **Given** the app is running on macOS, Windows or Linux, **When** any
   git operation requiring HTTPS authentication is executed, **Then** the
   platform-appropriate credential helper is used automatically (no
   config file is written unless the user explicitly chooses to).
4. **Given** the user opens the Connection Manager or Settings, **When**
   they view the HTTPS credential section, **Then** a short disclaimer is
   displayed explaining that the credential helper is active inside the
   app automatically, and providing the terminal command for manual
   global setup if the user wants it active in the terminal too.

---

### User Story 2 - Guided Connection Setup Wizard (Priority: P1)

A user wants to clone a new repository or switch an existing repository's
remote between HTTPS and SSH. Instead of failing with a cryptic error when
authentication is not configured, the app presents a guided wizard that
detects the protocol, checks whether the connection is ready, and walks
the user through setup step by step. For SSH, the wizard lists available
keys, tests them against the host, and guides the user to add the public
key to their hosting provider if none work. For HTTPS, the wizard checks
the OS keychain for existing credentials and, if none are found, provides
a form to enter a username and password/token, stores them via the OS
credential store, and tests the connection. The wizard blocks the
action (clone or switch) until the connection is verified.

**Why this priority**: Without guided setup, users hit authentication
errors with no path to resolution inside the app. This story makes the
app self-sufficient for connection management.

**Independent Test**: Start a clone with an SSH URL for a host where no
SSH key is registered. The wizard appears, shows that no key works,
displays the public key with a copy button and a link to the provider's
SSH settings page, and blocks the clone until the user resolves it.

**Acceptance Scenarios**:

1. **Given** the user enters an SSH URL to clone, **When** no SSH key
   works for the target host, **Then** the wizard displays the available
   keys, offers to test each one, shows the public key with a copy button,
   links to the hosting provider's SSH settings page, and keeps the Clone
   button disabled until a key is verified.
2. **Given** the user enters an HTTPS URL to clone, **When** no
   credentials are stored for that host, **Then** the wizard shows a form
   for username and password/token, stores them in the OS credential
   store, tests the connection, and enables the Clone button on success.
3. **Given** the user enters an HTTPS URL to clone, **When** credentials
   are already stored for that host, **Then** the wizard shows the stored
   username, offers a "Test" button, and the Clone button is enabled
   immediately.
4. **Given** the user is in the wizard's SSH path, **When** they click
   "Generate new key", **Then** the existing SSH key generation form is
   presented inside the wizard, and after generation the new key is
   automatically tested against the host.

---

### User Story 3 - Remote URL Switcher with Pre-Check (Priority: P2)

A user has an open repository and wants to switch its remote URL between
HTTPS and SSH (or vice versa). The app shows the current remote(s) with
their detected protocol and offers a one-click switch. Before applying
the change, the app runs the Connection Manager wizard for the target
protocol to verify the connection will work. If the wizard succeeds, the
URL is changed. If the user cancels or the connection cannot be verified,
the URL is left unchanged — the remote is never left in a broken state.

**Why this priority**: This is the primary mechanism for fixing an
existing broken HTTPS remote by switching to SSH. It depends on the
wizard (Story 2) but is a distinct user action.

**Independent Test**: Open a repo with an HTTPS remote. Click "Switch to
SSH". The wizard runs, tests SSH keys, and on success the remote URL is
updated. Verify with `git remote -v` in a terminal that the URL changed.

**Acceptance Scenarios**:

1. **Given** a repository with an HTTPS remote, **When** the user clicks
   "Switch to SSH" and the wizard verifies an SSH key works, **Then** the
   remote URL is changed to the SSH form and the next Fetch succeeds.
2. **Given** a repository with an SSH remote, **When** the user clicks
   "Switch to HTTPS" and the wizard verifies HTTPS credentials work,
   **Then** the remote URL is changed to the HTTPS form and the next
   Fetch succeeds.
3. **Given** a repository with an HTTPS remote, **When** the user clicks
   "Switch to SSH" but cancels the wizard, **Then** the remote URL is
   unchanged and the repository continues to work over HTTPS.

---

### User Story 4 - Identity Profiles with Scope Control (Priority: P2)

A user has multiple git identities (e.g., a work account and a personal
account) and needs to use the right one per repository. The app lets the
user save named identity profiles (a label, a name, and an email) in
app-local storage. When applying a profile to a repository, the user
chooses between "This repository only" (local, writes to the repo's
config) and "All repositories" (global, writes to the user's global git
config). Each option includes a short, plain-language explanation of what
it means and what the consequences are — specifically warning that the
global option affects other tools like SourceTree and the terminal. The
default scope is always local.

**Why this priority**: Multi-account users need per-repo identity control.
This is a common pain point and directly requested by the user.

**Independent Test**: Create two identity profiles in Settings. Apply
one to a repository with local scope. Verify via `git config user.name`
in a terminal that only that repo's config changed. Apply another with
global scope and verify the warning is shown before applying.

**Acceptance Scenarios**:

1. **Given** the user is in Settings with a repository open, **When**
   they click "Save as new profile" and an in-app dialog opens, **Then**
   the user enters a label, name and email, and the profile is saved
   and appears in the profile dropdown for future use.
2. **Given** the user has selected a profile and chosen "This repository
   only", **When** they click Save, **Then** only the current repository's
   git config is updated and no other repository or tool is affected.
3. **Given** the user has selected a profile and chosen "All
   repositories", **When** they click Save, **Then** a warning is
   displayed explaining that this affects all repositories on the
   computer including third-party tools, and the user must confirm before
   the global config is written.
4. **Given** a repository has a local identity override, **When** the
   user opens Settings, **Then** the current identity is displayed along
   with its source (local or global) so the user knows where the active
   value comes from.
5. **Given** the user has an existing identity profile, **When** they
   edit its label, name or email and save, **Then** the profile is updated
   and the new values appear in the profile dropdown.
6. **Given** the user has an existing identity profile, **When** they
   delete it, **Then** the profile is removed from app-local storage and
   no longer appears in the dropdown. Deleting a profile does not change
   the git config of any repository it was previously applied to.

---

### User Story 5 - Enhanced Clone Dialog (Priority: P2)

A user wants to clone a new repository. The clone dialog detects whether
the entered URL uses HTTPS or SSH, shows a live connection status panel
that checks whether authentication is ready, and blocks the Clone button
if the connection is not set up. If the connection is not ready, a "Set
up connection" button opens the Connection Manager wizard. The user can
optionally pre-select an identity profile to apply to the cloned
repository after the clone succeeds. The identity is always applied as
local — cloning never writes to global config.

**Why this priority**: Cloning is the entry point for new repositories.
Without connection setup, SSH/HTTPS clones fail with confusing errors.

**Independent Test**: Enter an HTTPS URL for a host with stored
credentials. The connection status shows green and Clone is enabled.
Enter an SSH URL for a host with no working key. The connection status
shows red, Clone is disabled, and "Set up connection" is offered.

**Acceptance Scenarios**:

1. **Given** the user enters an HTTPS URL and credentials are stored for
   that host, **When** the URL is entered, **Then** the connection status
   panel shows a green indicator and the Clone button is enabled.
2. **Given** the user enters an SSH URL and no SSH key works for that
   host, **When** the URL is entered, **Then** the connection status
   panel shows a red indicator, the Clone button is disabled, and a "Set
   up connection" button is shown.
3. **Given** the user has selected an identity profile before cloning,
   **When** the clone completes, **Then** the selected name and email
   are written to the new repository's local git config.
4. **Given** the user has not selected an identity profile, **When** the
   clone completes, **Then** no identity is written and the repository
   inherits whatever global git config exists.

---

### User Story 6 - Connection Status Badge (Priority: P3)

A user has a repository open and wants to see at a glance whether the
remote connection is healthy. The Connection Manager button (Plug icon)
in the TitleBar shows a small green tick or red cross in the corner of
the icon, reflecting the connection health of the primary remote. The
indicator reflects a local-only check on repo open — whether credentials
or an SSH key exist for the primary remote's host — without making a
network call, so it is fast and non-blocking. A live network test is
performed only when the user explicitly clicks "Test" in the Connection
Manager. Clicking the button opens the Connection Manager for the
current repository's remote host. The status is checked when the
repository is opened and refreshed after any connection-related action.

**Why this priority**: Provides ongoing visibility and quick access to
connection management. Lower priority because it is a monitoring
enhancement, not a blocking capability.

**Independent Test**: Open a repository with a working SSH remote. The
badge shows a key icon, the key name, and a green check. Click the badge
— the Connection Manager opens.

**Acceptance Scenarios**:

1. **Given** a repository with a working SSH remote, **When** the
   repository is opened, **Then** the Connection Manager button shows a
   small green tick in the corner of the Plug icon (based on a local
   check that an SSH key exists for the host, not a live network test).
2. **Given** a repository with an HTTPS remote and stored credentials,
   **When** the repository is opened, **Then** the Connection Manager
   button shows a small green tick in the corner of the Plug icon (based
   on a local check that credentials exist in the OS store, not a live
   network test).
3. **Given** a repository with no SSH key configured for its remote host,
   **When** the repository is opened, **Then** the Connection Manager
   button shows a small red cross in the corner of the Plug icon and
   clicking it opens the Connection Manager.
4. **Given** the user fixes a broken connection via the Connection
   Manager (by storing credentials or closing the wizard after
   saving), **When** the wizard closes (via "Done" or the X button),
   **Then** the button's status indicator updates to show a green tick
   without requiring a page reload or app restart.

---

### User Story 7 - HTTPS Credential Management (Priority: P3)

A user wants to manage HTTPS credentials for a host directly in the app —
not just during clone or switch, but proactively. The Connection Manager
lets the user check whether credentials are stored, view the stored
username (never the password), test the connection, update credentials,
and remove them. All operations go through the OS-native credential
store so they are shared with other tools that use the same store (e.g.,
SourceTree, the terminal).

**Why this priority**: Provides full lifecycle management of HTTPS
credentials. Lower priority because the automatic credential helper
(Story 1) and the wizard (Story 2) already cover the most common paths.

**Independent Test**: Open the Connection Manager for a host with stored
credentials. The stored username is shown. Click "Remove". Verify via
`git credential reject` or the OS keychain that the credentials are gone.

**Acceptance Scenarios**:

1. **Given** the user opens the Connection Manager for a host with stored
   credentials, **When** the manager loads, **Then** the stored username
   is displayed (the password is never shown).
2. **Given** stored credentials exist, **When** the user clicks "Test",
   **Then** the app verifies the credentials work and shows success or
   failure.
3. **Given** stored credentials exist, **When** the user clicks
   "Remove", **Then** the credentials are removed from the OS credential
   store and the status updates to "No credentials stored".
4. **Given** the user enters new credentials and clicks "Save", **Then**
   the credentials are stored in the OS credential store (not in any
   app-specific file) and the password is never sent back to the
   renderer after storage.

---

### Edge Cases

- What happens when the user has multiple SSH keys and none are
  registered with the target host? The wizard shows all keys, marks none
  as working, and guides the user to add one to the provider.
- What happens when the user switches from SSH to HTTPS but has no
  credentials stored? The wizard runs the HTTPS path first; the URL is
  not changed until credentials are verified.
- What happens when the OS credential store is unavailable (e.g.,
  Keychain locked on macOS)? The credential operations fail gracefully
  with a clear error message explaining the situation.
- What happens when the user enters a URL with an unsupported protocol
  (e.g., `git://`, `file://`)? The clone dialog detects it is neither
  HTTPS nor SSH and shows an appropriate message.
- What happens when the user has a local identity override and then
  applies a global identity? The local override takes precedence (per
  git's config resolution order); the global value becomes the fallback
  for repos without a local override.
- What happens when the hosting provider is unknown (self-hosted GitLab,
  Gitea, etc.)? The SSH settings link is not shown; the user is told to
  add the public key to their provider manually.
- What happens when the user cancels the wizard mid-way? No changes are
  applied — no URL is changed, no credentials are stored, no identity is
  written.
- What happens when the same host is used by multiple remotes in one
  repository? Each remote is listed independently; switching one does not
  affect the others.

## Post-Implementation Bugs (2026-10-16)

After the initial implementation, five issues were identified during
testing. These are captured here as new/updated functional requirements
and user stories.

### Bug 1: HTTPS credential badge does not refresh after saving credentials

**Root cause**: The `saveCreds` and `removeCreds` functions in the
Connection Manager update the component's local state but never call
`refreshConnectionStatus()` on the store. The "Done" button (which
triggers the refresh via `onConnected`) only appears when the access
test passes. Closing the wizard via the X button also skips the
refresh.

**Impact**: FR-017 is violated. The badge only updates on app restart
or when the user clicks "Done" after a successful test.

**Fix**: Call `refreshConnectionStatus()` after every credential
store/remove operation inside the Connection Manager, and in the
`onClose` handler in App.tsx.

### Bug 2: SSH access testing — key not in ssh-agent

**Root cause**: `BatchMode=yes` (FR-021) prevents SSH from prompting
for passphrases. If the user's key has a passphrase and is not loaded
into `ssh-agent`, every attempt fails silently with "Permission
denied". The app cannot prompt for passphrases by design (non-goals).

**Impact**: The SSH test reports failure even when the key is valid.
The user has no in-app guidance on how to resolve it.

**Fix**: When the SSH test fails, show a diagnostic message explaining
the common causes: (a) the key is not added to the hosting provider,
(b) the key has a passphrase not loaded in ssh-agent, (c) the host is
unreachable. Include the exact terminal commands the user can run to
isolate the issue (`ssh -T git@host` without BatchMode, `ssh-add -l`,
`ssh-add ~/.ssh/<key>`).

### Bug 3: "Save as new profile" does nothing

**Root cause**: `saveAsNewProfile` and `editProfile` in
SettingsModal.tsx use `window.prompt()`, which is not implemented in
Electron — it returns `null` immediately without showing a dialog.
The function exits early and nothing happens.

**Impact**: FR-012 (create and edit profiles) is broken. Profile
deletion works because it uses `window.confirm()`, which Electron does
implement.

**Fix**: Replace `window.prompt()` with an in-app modal dialog (using
the existing PromptModal pattern). Both "Save as new profile" and
"Edit profile" need a proper form modal with label, name, and email
fields.

### Bug 4: Connection-related menus are scattered and confusing

**Root cause**: Connection management is split across 4+ entry points
with overlapping responsibilities:
1. Connection chip in TitleBar (opens Connection Manager)
2. Plug icon in TitleBar (opens Connection Manager — duplicate of #1)
3. KeyRound icon in TitleBar (opens separate SshManager)
4. Settings → Remotes section (SSH↔HTTPS switching)
5. Settings → Git identity (name/email profiles)

The SshManager and Connection Manager's SSH path duplicate key
listing and testing. The remote URL switcher is buried in Settings
instead of being part of the Connection Manager.

**Impact**: Users are confused about where to find each function.

**Fix**: Consolidate into a unified Connection Hub (SSH keys, HTTPS
credentials, remote URL switching). Identity management stays in its
own separate quick-access modal (see Bug 5). Specifically:
- Merge SshManager into the Connection Manager (the SSH path already
  lists/generates/tests keys)
- Move the Remotes section out of Settings into the Connection Manager
- Keep Settings for app preferences only (appearance, auto-fetch,
  diff view)
- Identity management (profiles, name/email, scope) is NOT part of the
  Connection Manager — it gets its own dedicated modal (see Bug 5)

### Bug 5: Git identity needs a dedicated quick-access menu

**Root cause**: The Git identity section (name/email/profiles/scope)
is buried inside the Settings modal, mixed with appearance, auto-fetch,
and diff view preferences. Changing identity requires: Settings →
scroll past 3 sections → Git identity.

**Impact**: SC-005 ("switch between multiple git identities in under
10 seconds") is not met in practice.

**Fix**: Extract the Git identity section into its own quick-access
modal, accessible via a dedicated button in the TitleBar (e.g. a user
icon). One click to open, select a profile, save — no scrolling past
unrelated settings.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST use the platform-native credential helper
  (macOS Keychain, Windows Credential Manager, Linux
  git-credential-store) for all git operations, configured automatically
  via a per-command flag without writing to any git config file. The app
  MUST NOT offer to write the credential helper to git config through the
  UI. The Connection Manager or Settings MUST display a short disclaimer
  explaining that the credential helper is active automatically inside
  the app, and providing the terminal command a user can run manually if
  they want the same helper active in the terminal and other tools (e.g.,
  `git config --global credential.helper osxkeychain`).
- **FR-002**: The app MUST provide a guided Connection Manager wizard
  with a tabbed layout. The default tab is "Connection" which detects
  HTTPS vs SSH from the primary remote's URL and walks the user
  through setup for the detected protocol. Additional tabs: "SSH Keys"
  (list, generate, delete, copy public key — replaces the standalone
  SshManager) and "Remotes" (list remotes, switch HTTPS ↔ SSH with
  pre-check — replaces the Settings Remotes section). The tabbed
  layout keeps each concern focused and avoids showing irrelevant
  sections.
- **FR-003**: For SSH connections, the wizard MUST list available SSH
  keys, test each against the target host, display the public key with a
  copy button, and link to the hosting provider's SSH settings page when
  the provider is known.
- **FR-004**: For SSH connections, the wizard MUST offer to generate a
  new SSH key using the existing key generation capability.
- **FR-005**: For HTTPS connections, the wizard MUST check whether
  credentials are already stored in the OS credential store, display the
  stored username (never the password), and provide a form to enter or
  update credentials.
- **FR-006**: HTTPS credentials MUST be stored and removed through the
  OS-native credential store via git credential subcommands, never in
  app-specific files or memory beyond the moment of entry.
- **FR-007**: The app MUST NOT send the password back to the renderer
  after it has been stored. Only the username and a boolean "stored"
  status may be returned.
- **FR-008**: The app MUST provide a remote URL switcher that shows the
  current remote(s), detects the protocol, and offers conversion between
  HTTPS and SSH.
- **FR-009**: The remote URL switcher MUST run the Connection Manager
  wizard for the target protocol before changing the URL. The URL MUST
  NOT be changed if the wizard is cancelled or the connection cannot be
  verified.
- **FR-010**: The enhanced clone dialog MUST detect the protocol from
  the entered URL, show a live connection status, and disable the Clone
  button until the connection is verified.
- **FR-011**: The clone dialog MUST offer an optional identity profile
  selector. If a profile is selected, it MUST be applied to the cloned
  repository as a local config after the clone succeeds.
- **FR-012**: The app MUST allow users to save, edit, and delete multiple
  named identity profiles (label, name, email) in app-local storage.
- **FR-013**: When applying an identity, the user MUST be able to choose
  between local scope (this repository only) and global scope (all
  repositories), with the default being local.
- **FR-014**: When global scope is selected, the app MUST display a
  warning explaining that the change affects all repositories on the
  computer including third-party tools, and require explicit confirmation
  before writing to the global git config.
- **FR-015**: The Settings identity section MUST display the current
  identity's source (local, global, or none) so the user knows where the
  active value comes from.
- **FR-016**: The TitleBar MUST display a connection status indicator
  integrated into the Connection Manager button (the Plug icon). The
  button MUST show a small green tick or red cross in the corner of the
  icon, reflecting the connection health of the primary remote (origin,
  or the first remote if origin does not exist). The indicator MUST
  reflect a local-only check (whether credentials or an SSH key exist
  for the host) on repo open, without making a network call. A live
  network test MUST only be performed when the user explicitly requests
  it in the Connection Manager. Clicking the button MUST open the
  Connection Manager. The separate connection status badge (previously
  a standalone element next to the branch name) is replaced by this
  integrated indicator.
- **FR-017**: The connection status badge MUST refresh after any
  connection-related action (wizard completion, remote URL switch,
  credential store, credential remove, wizard close via X button)
  without requiring a full app restart. The refresh MUST happen
  immediately inside the credential store/remove flow, not only when
  the user clicks "Done".
- **FR-018**: The Connection Manager MUST provide the ability to test,
  update, and remove stored HTTPS credentials for a given host at any
  time, not only during clone or switch.
- **FR-019**: All new IPC calls MUST follow the existing typed envelope
  pattern (`{ ok: true, data } | { ok: false, error }`) and touch the four
  layers in order: shared channels, main handler, preload bridge,
  renderer call helper.
- **FR-020**: All credential and SSH operations MUST use
  `child_process.spawn` or `child_process.execFile` with stdin piping for
  `git credential` subcommands, never shell execution, so passwords never
  appear in process argument listings.
- **FR-021**: SSH key testing MUST use `BatchMode=yes` to prevent the
  process from hanging on a passphrase prompt.
- **FR-022**: When SSH access testing fails, the app MUST show a
  diagnostic message explaining the common causes (key not added to
  provider, key passphrase not loaded in ssh-agent, host unreachable)
  and the terminal commands to isolate the issue (`ssh -T git@host`,
  `ssh-add -l`, `ssh-add ~/.ssh/<key>`). This guidance MUST appear
  inline in the Connection Manager, not require opening DevTools.
- **FR-023**: Profile creation and editing MUST use an in-app modal
  dialog (not `window.prompt()`, which is not supported in Electron).
  The dialog MUST include fields for label, name, and email. The
  existing `PromptModal` component pattern should be followed.
- **FR-024**: The connection status badge MUST refresh when the
  Connection Manager is closed via the X button (not only via the
  "Done" button). The `onClose` handler in App.tsx MUST call
  `refreshConnectionStatus()`.
- **FR-025**: SSH key management (list, generate, delete, copy public
  key) MUST be accessible from within the Connection Manager, not
  from a separate SshManager modal. The standalone SshManager button
  (KeyRound icon) in the TitleBar MUST be removed entirely. The
  Connection Manager button (Plug icon) replaces it and includes a
  dynamic status indicator (green tick / red cross) in the corner of
  the icon (per FR-016). Identity management (profiles, name/email,
  scope) is NOT part of the Connection Manager — it has its own
  dedicated modal (FR-027).
- **FR-026**: Remote URL switching (HTTPS ↔ SSH) MUST be accessible
  from within the Connection Manager, not only from the Settings
  modal. The Remotes section should be removed from Settings (Settings
  keeps only app preferences: appearance, auto-fetch, diff view). The
  primary and only path for remote URL switching is through the
  Connection Manager.
- **FR-027**: Git identity management (view current identity, select
  profile, edit name/email, choose scope, save) MUST be accessible
  via a dedicated quick-access button in the TitleBar that opens a
  focused identity modal — not buried inside the general Settings
  modal behind unrelated preferences. The identity modal MUST be
  purely identity-focused: it shows the current identity with its
  source (local/global/none), a profile dropdown, name/email fields,
  a scope radio (local/global with warning), and save/edit/delete
  actions. It MUST NOT show connection status, remotes, or
  credentials — those belong in the Connection Manager.

### Key Entities

- **GitProfile**: A named git identity stored in app-local preferences.
  Attributes: a stable unique identifier, a human-readable label (e.g.,
  "Work account"), a name (for `user.name`), and an email (for
  `user.email`).
- **ConnectionStatus**: The current authentication state of a
  repository's remote. Attributes: protocol (HTTPS or SSH), host, SSH
  key name and success flag (for SSH), HTTPS username and success flag
  (for HTTPS).
- **HttpsCredentialStatus**: The state of stored HTTPS credentials for a
  host. Attributes: host, whether credentials are stored, and the stored
  username (never the password).
- **SshAccessResult**: The result of testing SSH access to a host.
  Attributes: host, whether any key works, the name of the working key,
  and the list of available keys.
- **UserConfigResult**: The current git identity for a repository with
  the source of each value. Attributes: name, email, the scope each came
  from (local, global, or none).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can fetch from an HTTPS remote without encountering
  the "Device not configured" error, provided credentials for that host
  are already in the OS credential store.
- **SC-002**: A user can clone a repository over HTTPS or SSH without
  encountering an unhandled authentication error — the app either
  completes the clone or guides the user through setup before cloning.
- **SC-003**: A user can switch a repository's remote between HTTPS and
  SSH in under 30 seconds when the target connection is already
  configured.
- **SC-004**: A user can set up a new SSH connection (generate a key,
  copy the public key, add it to the provider, and verify) entirely
  within the app, without opening a terminal.
- **SC-005**: A user can switch between multiple git identities for a
  repository in under 10 seconds by selecting a saved profile, via a
  dedicated quick-access button in the TitleBar — not buried inside
  general Settings.
- **SC-006**: A user can see at a glance whether the current repository's
  remote connection is healthy via the TitleBar badge, without navigating
  to any settings panel.
- **SC-007**: No action performed with the default (local) scope affects
  any other repository, the global git config, or third-party tools like
  SourceTree.
- **SC-008**: Every action that can affect the global git config or
  third-party tools displays a warning and requires explicit user
  confirmation before proceeding.
- **SC-009**: The password component of HTTPS credentials is never
  displayed, logged, or returned to the user interface after being
  stored.
- **SC-010**: After storing or removing HTTPS credentials in the
  Connection Manager, the TitleBar badge updates to reflect the new
  state immediately — without clicking "Done" and without restarting
  the app.
- **SC-011**: Clicking "Save as new profile" opens an in-app dialog
  (not a browser prompt) where the user enters a label, name, and
  email. The profile is saved and appears in the dropdown.
- **SC-012**: When an SSH access test fails, the user sees inline
  guidance explaining what to check (key added to provider, key in
  ssh-agent, host reachable) and the terminal commands to run.
- **SC-013**: All connection-related functions (SSH keys, credential
  management, remote URL switching) are accessible from a single
  Connection Manager hub — not scattered across multiple separate
  modals and Settings sections.

## Assumptions

- Users have `git` installed and available on the system PATH (already a
  prerequisite of the existing app).
- Users have `ssh` installed and available on the system PATH (already a
  prerequisite for the existing SSH key manager).
- The OS-native credential helper (`osxkeychain`, `manager`, or `store`)
  is bundled with or available alongside the system git installation.
- Users with multiple SSH keys for different accounts have an
  `~/.ssh/config` file or are willing to create one to map keys to
  hosts. The app does not manage `~/.ssh/config` in this feature, but
  relies on the system SSH stack to select the right key.
- Hosting providers' SSH settings URLs follow known patterns for
  well-known providers (GitHub, GitLab, Bitbucket). For self-hosted or
  unknown providers, the link is omitted and the user is guided
  generically.
- HTTPS credentials entered by the user are a username and either a
  password or a personal access token (PAT). The app does not
  differentiate between the two — both are stored as the "password"
  field in the OS credential store.
- The existing SSH key manager's generation form is reused inside the
  wizard without modification to its core logic.
- Identity profiles are stored in the renderer's local storage (same
  mechanism as existing app preferences) and are not synced across
  machines.
- The app does not implement OAuth device flows or browser-based
  authentication for hosting providers; credentials are entered manually.
- The app does not manage SSH key passphrases or the ssh-agent; it relies
  on the system SSH stack for passphrase resolution.
