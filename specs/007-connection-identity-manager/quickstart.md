# Quickstart Validation Guide: Connection & Identity Manager

**Date**: 2026-10-16

This guide describes how to validate each chunk of the feature end-to-end.
Each chunk can be validated independently after its implementation.

## Prerequisites

- `npm run build` passes (typecheck + electron-vite build)
- A git repository with an HTTPS remote (for testing credential helper)
- A git repository with an SSH remote (for testing SSH path)
- An SSH key in `~/.ssh` (for testing SSH access)
- macOS Keychain or platform equivalent with git credentials stored (for
  testing HTTPS auth)

## Chunk 1: Credential Helper + Shared Types + IPC Channels

**Goal**: HTTPS fetch/push/pull works if credentials are in the OS store.

1. Run `npm run dev` to start the app
2. Open a repository with an HTTPS remote whose credentials are already
   in the OS keychain (e.g., previously used from the terminal)
3. Click the Refresh button (or wait for auto-fetch)
4. **Expected**: Fetch completes successfully — no "Device not configured"
   error
5. Open a repository with an HTTPS remote and no stored credentials
6. Click Refresh
7. **Expected**: Fetch fails, but the error is the standard git error
   (not "Device not configured" — it should be an auth error or a
   credential prompt failure)

## Chunk 2: Backend Services

**Goal**: All IPC calls work end-to-end (testable via browser console).

1. Run `npm run dev`
2. Open DevTools (View → Toggle Developer Tools)
3. In the console, test each API:

```javascript
// SSH access test
await window.api.testSshAccess('github.com')
// Expected: { host: 'github.com', hasWorkingKey: true/false, workingKey?: 'id_ed25519', availableKeys: [...] }

// HTTPS credential check
await window.api.checkHttpsCredentials('github.com')
// Expected: { host: 'github.com', stored: true/false, username?: 'youruser' }

// Store HTTPS credentials
await window.api.storeHttpsCredentials({ host: 'github.com', username: 'test', password: 'token' })
// Expected: void (check keychain to verify)

// Remove HTTPS credentials
await window.api.removeHttpsCredentials('github.com')
// Expected: void (check keychain to verify removal)

// Test HTTPS access
await window.api.testHttpsAccess('https://github.com/owner/repo.git')
// Expected: { success: true/false, username?: 'youruser', error?: '...' }

// Set remote URL
await window.api.setRemoteUrl({ repoPath: '/path/to/repo', name: 'origin', url: 'git@github.com:owner/repo.git' })
// Expected: void (verify with `git remote -v` in terminal)

// Get user config with scope
await window.api.getUserConfig('/path/to/repo')
// Expected: { name: '...', email: '...', nameScope: 'local'|'global'|'none', emailScope: '...' }

// Set user config with scope
await window.api.setUserConfig('/path/to/repo', 'John', 'john@example.com', 'local')
// Expected: void (verify with `git config --local user.name` in terminal)

// Get global user config
await window.api.getGlobalUserConfig()
// Expected: { name: '...', email: '...' }
```

## Chunk 3: URL Utility + Connection Manager Wizard

**Goal**: The wizard opens, detects protocol, and guides setup.

1. Run `npm run dev`
2. Open a repository
3. Click the new Connection button in the TitleBar (or a temporary dev
   button if the badge isn't implemented yet)
4. **Expected**: The Connection Manager wizard opens
5. **SSH path**:
   - The wizard shows the detected protocol (SSH) and host
   - It lists available SSH keys
   - Clicking "Test" runs `ssh -T` and shows success/failure
   - If no key works, the public key is shown with a copy button and a
     link to the provider's SSH settings page
   - "Generate new key" opens the key generation form
6. **HTTPS path** (switch to an HTTPS remote or enter an HTTPS URL):
   - The wizard shows the detected protocol (HTTPS) and host
   - It checks for stored credentials and shows the username if found
   - If no credentials: a form for username + password/token is shown
   - Entering credentials and clicking "Save" stores them in the OS
     keychain
   - "Test" verifies the connection works

## Chunk 4: Remote URL Switcher + Enhanced Clone Dialog

**Goal**: Switch remotes and clone with connection checks.

**Remote URL switcher**:
1. Open a repository with an HTTPS remote
2. Open Settings → Remotes section
3. **Expected**: The remote is listed with its URL and "SSH" badge
4. Click "Switch to SSH"
5. **Expected**: The Connection Manager wizard opens for SSH
6. If the wizard verifies an SSH key works, the URL is changed
7. Verify with `git remote -v` in a terminal
8. Click "Switch to HTTPS" to switch back — wizard runs for HTTPS

**Enhanced clone dialog**:
1. Go to the Welcome screen (close all repos)
2. Click "Clone"
3. Enter an HTTPS URL for a host with stored credentials
4. **Expected**: Connection status shows green, Clone button enabled
5. Enter an SSH URL for a host with no working key
6. **Expected**: Connection status shows red, Clone button disabled,
   "Set up connection" button shown
7. Click "Set up connection" — wizard opens
8. After setup, Clone button enables
9. Select an identity profile from the dropdown (if profiles exist)
10. Click Clone
11. **Expected**: Clone succeeds, identity is applied locally

## Chunk 5: Identity Profiles with Scope Control

**Goal**: Create, edit, delete profiles; apply with local/global scope.

1. Open Settings → Git identity section
2. **Expected**: Profile dropdown is shown (empty initially or with
   existing profiles)
3. Create a new profile: enter label "Work", name "Jane", email
   "jane@work.com"
4. **Expected**: Profile appears in the dropdown
5. Select the profile, choose "This repository only", click Save
6. Verify via terminal: `git config --local user.name` shows "Jane"
7. Verify `git config --global user.name` is unchanged
8. Edit the profile: change label to "Work (updated)"
9. **Expected**: Dropdown updates
10. Create a second profile "Personal"
11. Select it, choose "All repositories"
12. **Expected**: Warning dialog appears explaining global impact
13. Confirm the warning
14. Verify via terminal: `git config --global user.name` shows the
    personal name
15. Delete a profile
16. **Expected**: Profile removed from dropdown. Git config of any repo
    that used it is unchanged.

## Chunk 6: Connection Status Indicator (Integrated into Plug Button)

**Goal**: The Plug button shows a status indicator and updates dynamically.

1. Open a repository with a working SSH remote
2. **Expected**: The Plug button in the TitleBar shows a small green tick
   in the corner of the icon
3. Open a repository with an HTTPS remote and stored credentials
4. **Expected**: The Plug button shows a small green tick in the corner
5. Open a repository with a broken connection (no key, no credentials)
6. **Expected**: The Plug button shows a small red cross in the corner
7. Click the Plug button
8. **Expected**: Connection Manager opens for the current repo's host
9. Fix the connection via the wizard
10. **Expected**: The indicator updates to green tick without page reload

## Full End-to-End Validation

After all chunks are implemented:

1. **HTTPS fetch works**: Open an HTTPS repo with stored credentials →
   fetch succeeds (SC-001)
2. **Clone with guidance**: Clone an SSH repo with no key → wizard guides
   setup → clone succeeds (SC-002)
3. **Switch remote**: Switch HTTPS → SSH → fetch works (SC-003)
4. **SSH setup in-app**: Generate key, copy, add to provider, verify —
   all in the app (SC-004)
5. **Switch identity**: Select a saved profile → applied in <10s (SC-005)
6. **Indicator visibility**: See connection status at a glance via the
   Plug button indicator (SC-006)
7. **Local isolation**: Local-only operations don't affect other repos
   or SourceTree (SC-007)
8. **Global warning**: Global operations show warning and require
   confirmation (SC-008)
9. **Password never shown**: After storing credentials, password is
   never displayed or returned (SC-009)

## Bug Fix Validation (Chunk 7)

After the bug fixes are implemented, validate each fix:

### Chunk 7a: Badge Refresh (Bug #1, SC-010)

1. Open a repo with an HTTPS remote and no stored credentials
2. Note the Plug button shows a red cross indicator
3. Open the Connection Manager (click the Plug button)
4. Enter credentials and click "Save"
5. **Expected**: The Plug button indicator in the TitleBar immediately
   updates to show a green tick — without clicking "Done" and without
   restarting the app
6. Remove the credentials via the Connection Manager
7. **Expected**: The indicator immediately reverts to a red cross
8. Close the Connection Manager via the X button (without clicking Done)
9. **Expected**: The indicator state is correct (matches what was done
   before closing)

### Chunk 7b: SSH Diagnostics (Bug #2, SC-012)

1. Create an SSH key with a passphrase: `ssh-keygen -t ed25519 -f ~/.ssh/test_passphrase -N "secret"`
2. Ensure it is NOT loaded in ssh-agent: `ssh-add -D` (remove all keys)
3. Open the Connection Manager for an SSH host (e.g. github.com)
4. **Expected**: The SSH test fails and shows a diagnostic panel with:
   - An explanation that the key may have a passphrase not in ssh-agent
   - The command `ssh-add ~/.ssh/<keyname>` to load it
   - The command `ssh -T git@<host>` to test interactively
   - The command `ssh-add -l` to list loaded keys
5. Load the key: `ssh-add ~/.ssh/test_passphrase`
6. Click "Re-test" in the Connection Manager
7. **Expected**: The test now passes (if the key is registered with the
   provider) or shows a different diagnostic (key not added to provider)
8. Clean up: `ssh-add -D && rm ~/.ssh/test_passphrase ~/.ssh/test_passphrase.pub`

### Chunk 7c: In-App Profile Dialog (Bug #3, SC-011)

1. Open Settings (or the Identity modal after Chunk 7e)
2. Click "Save as new profile"
3. **Expected**: An in-app dialog opens (not a browser prompt) with
   fields for Label, Name, and Email
4. Enter "Test Profile", "Test User", "test@example.com"
5. Click "Save"
6. **Expected**: The profile appears in the dropdown, success toast shown
7. Click the edit button on the profile
8. **Expected**: The same dialog opens with pre-filled values
9. Change the label to "Test Profile (updated)", click Save
10. **Expected**: Dropdown updates with the new label

### Chunk 7d: Menu Consolidation (Bug #4, SC-013)

1. Open a repo with an HTTPS remote
2. Open the Connection Manager (click the Plug button)
3. **Expected**: The Connection Manager shows a **tabbed layout** with
   three tabs: "Connection" (default, shows HTTPS credentials), "SSH
   Keys" (lists keys, generate, delete, copy), and "Remotes" (lists
   remotes with switch buttons)
4. Click the "Remotes" tab
5. Click "Switch to SSH" on a remote
6. **Expected**: The wizard runs for SSH (switches to Connection tab),
   and on success the URL changes
7. Open Settings
8. **Expected**: Settings shows only appearance, auto-fetch, diff view —
   NO Remotes section, NO Git identity section (if Chunk 7e is done)
9. Verify the standalone SSH Keys button (KeyRound icon) is **removed
   entirely** from the TitleBar — it is not present

### Chunk 7e: Git Identity Quick-Access (Bug #5, SC-005)

1. Open a repo
2. Click the identity button (User icon) in the TitleBar
3. **Expected**: The identity modal opens immediately — no scrolling
   past appearance/auto-fetch/diff settings. The modal shows ONLY
   identity content: current identity with source, profile dropdown,
   name/email fields, scope radio, save/edit/delete actions. No
   connection status, no remotes, no credentials.
4. Select a saved profile from the dropdown
5. Choose "This repository only"
6. Click "Save identity"
7. **Expected**: Identity saved in under 10 seconds, success toast shown
8. Open Settings
9. **Expected**: No Git identity section — only app preferences
