# Tasks: Connection & Identity Manager

**Input**: Design documents from `/specs/007-connection-identity-manager/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: No automated test runner in the project. Validation is manual via `npm run dev` and `npm run build`. Test tasks are not generated.

**Organization**: Tasks are grouped by implementation chunk (from plan.md) mapped to user stories (from spec.md). Each chunk is an autonomous, committable unit that can be executed in a separate working session.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Electron app: `src/shared/`, `src/main/`, `src/preload/`, `src/renderer/src/`
- Shared types: `src/shared/types.ts`
- IPC channels: `src/shared/ipc.ts`
- Main handlers: `src/main/ipc.ts`
- Preload bridge: `src/preload/index.ts`
- Renderer: `src/renderer/src/`

---

## Phase 1: Chunk 1 — Credential Helper + Shared Types + IPC Channels

**Goal**: Fix the root cause (HTTPS auth) and lay the type/channel foundation for all subsequent chunks.

**Independent Test**: Open a repository with an HTTPS remote whose credentials are already in the OS keychain. Click Fetch — it succeeds without error.

**Maps to**: US1 (HTTPS Authentication Works Out of the Box)

- [X] T001 [P] [US1] Add platform credential helper to HARDENED_GIT in `src/main/services/gitService.ts` — add `const CRED_HELPER = process.platform === 'darwin' ? 'osxkeychain' : process.platform === 'win32' ? 'manager' : 'store'` and append `credential.helper=${CRED_HELPER}` to the `config` array in `HARDENED_GIT` (lines 41-44). This passes `-c credential.helper=...` on every git command without writing to any config file.
- [X] T002 [P] Add new shared types to `src/shared/types.ts` — add `GitProfile` (fields: `id: string`, `label: string`, `name: string`, `email: string`), `RemoteProtocol` (`'https' | 'ssh'`), `ConfigScope` (`'local' | 'global'`), `SshAccessResult` (fields: `host: string`, `hasWorkingKey: boolean`, `workingKey?: string`, `availableKeys: SshKey[]`), `HttpsCredentialStatus` (fields: `host: string`, `stored: boolean`, `username?: string`), `HttpsAccessResult` (fields: `success: boolean`, `username?: string`, `error?: string`), `ConnectionStatus` (fields: `protocol: RemoteProtocol`, `host: string`, `sshKey?: string`, `sshOk: boolean`, `httpsUsername?: string`, `httpsOk: boolean`), `UserConfigResult` (fields: `name: string`, `email: string`, `nameScope: 'local' | 'global' | 'none'`, `emailScope: 'local' | 'global' | 'none'`). All types must be exported and framework-free.
- [X] T003 [P] Add new IPC channel names to `src/shared/ipc.ts` — add to the `Channels` const object: `testSshAccess: 'git:testSshAccess'`, `checkHttpsCredentials: 'cred:check'`, `storeHttpsCredentials: 'cred:store'`, `removeHttpsCredentials: 'cred:remove'`, `testHttpsAccess: 'cred:test'`, `setRemoteUrl: 'git:setRemoteUrl'`, `getGlobalUserConfig: 'git:getGlobalUserConfig'`. The existing `getUserConfig` and `setUserConfig` channels are reused with extended signatures.
- [X] T004 [P] Add stub handlers for all new channels in `src/main/ipc.ts` — register each new channel with a handler that throws `new Error('Not implemented yet')` so the IPC layer compiles. Use the existing `handle(Channels.x, ...)` pattern. For `setUserConfig`, update the handler signature to accept `(path: string, name: string, email: string, scope: ConfigScope)`. For `getUserConfig`, the handler still calls `gitService.getUserConfig(path)` but the return type will change in Chunk 2.
- [X] T005 [P] Add typed API methods for all new channels in `src/preload/index.ts` — add to the `api` object: `testSshAccess: (host: string) => invoke<SshAccessResult>(Channels.testSshAccess, host)`, `checkHttpsCredentials: (host: string) => invoke<HttpsCredentialStatus>(Channels.checkHttpsCredentials, host)`, `storeHttpsCredentials: (host: string, username: string, password: string) => invoke<void>(Channels.storeHttpsCredentials, host, username, password)`, `removeHttpsCredentials: (host: string) => invoke<void>(Channels.removeHttpsCredentials, host)`, `testHttpsAccess: (url: string) => invoke<HttpsAccessResult>(Channels.testHttpsAccess, url)`, `setRemoteUrl: (repoPath: string, name: string, url: string) => invoke<void>(Channels.setRemoteUrl, repoPath, name, url)`, `getGlobalUserConfig: () => invoke<{ name: string; email: string }>(Channels.getGlobalUserConfig)`. Update `setUserConfig` to `(path: string, name: string, email: string, scope: ConfigScope) => invoke<void>(Channels.setUserConfig, path, name, email, scope)`. Update `getUserConfig` return type to `invoke<UserConfigResult>`. Import the new types from `@shared/types`.
- [X] T006 Run `npm run build` and fix any type errors. All new types, channels, handlers, and preload methods must compile. The stub handlers will throw at runtime but the build must be green.

**Checkpoint**: HTTPS fetch works if credentials are in the OS keychain. All types and channels exist. Build is green. Commit as `feat(creds): add platform credential helper and shared types`.

---

## Phase 2: Chunk 2 — Backend Services

**Goal**: Implement all backend logic — credential operations, SSH testing, remote URL switching, enhanced identity config.

**Independent Test**: Via the browser DevTools console, call `window.api.testSshAccess('github.com')` and verify it returns a result with `hasWorkingKey` and `availableKeys`.

**Maps to**: US1 (credential helper), US2 (wizard backend), US3 (remote URL backend), US4 (identity backend), US7 (credential management backend)

**Depends on**: Phase 1 (Chunk 1) complete.

- [X] T007 [P] [US1] [US7] Create `src/main/services/credService.ts` — new service module. Implement `checkHttpsCredentials(host: string): Promise<HttpsCredentialStatus>` using `child_process.spawn('git', ['credential', 'fill'])` with stdin `protocol=https\nhost=${host}\n\n`. Parse stdout for `username=` line. Return `{ host, stored: true, username }` if found, `{ host, stored: false }` if not. Never return the password. Implement `storeHttpsCredentials(host: string, username: string, password: string): Promise<void>` using `git credential approve` with stdin `protocol=https\nhost=${host}\nusername=${username}\npassword=${password}\n\n`. Implement `removeHttpsCredentials(host: string): Promise<void>` using `git credential reject` with stdin `protocol=https\nhost=${host}\n\n`. Implement `testHttpsAccess(url: string): Promise<HttpsAccessResult>` using `child_process.execFile('git', ['ls-remote', url])` with the credential helper active (pass `-c credential.helper=${CRED_HELPER}`). Return `{ success: true }` on exit code 0, `{ success: false, error: msg }` otherwise. Validate `host` with `assertSafeGitArg` and `url` with `assertSafeGitUrl`. Use the same `promisify(execFile)` pattern as `sshService.ts`. Export as `credService` object matching the existing service pattern.
- [X] T008 [P] [US2] Implement `testSshAccess(host: string): Promise<SshAccessResult>` in `src/main/services/gitService.ts` — run `ssh -T -o BatchMode=yes -o ConnectTimeout=5 <host>` via `execFile`. Interpret: exit code 0 or exit code 1 with "Hi " on stderr → success; exit code 255 with "Permission denied" → no key works. Call `sshService.listKeys()` to populate `availableKeys`. If a key works, parse stderr for the key file path to identify `workingKey`. Validate `host` with `assertSafeGitArg`. Add to the `gitService` object.
- [X] T009 [P] [US3] Implement `setRemoteUrl(repoPath: string, name: string, url: string): Promise<void>` in `src/main/services/gitService.ts` — run `git(repoPath).raw(['remote', 'set-url', name, url])`. Validate `name` with `assertSafeGitArg` and `url` with `assertSafeGitUrl`. Add to the `gitService` object.
- [X] T010 [P] [US4] Enhance `getUserConfig(repoPath: string): Promise<UserConfigResult>` in `src/main/services/gitService.ts` — change the return type from `{ name: string; email: string }` to `UserConfigResult`. Run `git config --local user.name` (catch → empty), `git config --global user.name` (catch → empty), and `git config user.name` (effective, catch → empty) to determine the effective value and its source (`local`, `global`, or `none`). Same for `user.email`. Return `{ name, email, nameScope, emailScope }`.
- [X] T011 [P] [US4] Enhance `setUserConfig(repoPath: string, name: string, email: string, scope: ConfigScope): Promise<void>` in `src/main/services/gitService.ts` — add a `scope` parameter. Run `git config --local user.name <name>` or `git config --global user.name <name>` based on scope. Same for `user.email`. If `name` is empty, skip writing `user.name`. If `email` is empty, skip writing `user.email`.
- [X] T012 [P] [US4] Implement `getGlobalUserConfig(): Promise<{ name: string; email: string }>` in `src/main/services/gitService.ts` — run `git config --global user.name` and `git config --global user.email` (catch → empty for each). Return `{ name, email }`. Use a standalone `simpleGit` instance (no repo path needed) with `HARDENED_GIT`.
- [X] T013 Replace stub handlers in `src/main/ipc.ts` with real implementations — wire `Channels.testSshAccess` → `gitService.testSshAccess(host)`, `Channels.checkHttpsCredentials` → `credService.checkHttpsCredentials(host)`, `Channels.storeHttpsCredentials` → `credService.storeHttpsCredentials(host, username, password)`, `Channels.removeHttpsCredentials` → `credService.removeHttpsCredentials(host)`, `Channels.testHttpsAccess` → `credService.testHttpsAccess(url)`, `Channels.setRemoteUrl` → `gitService.setRemoteUrl(repoPath, name, url)`, `Channels.getGlobalUserConfig` → `gitService.getGlobalUserConfig()`. Update `Channels.setUserConfig` handler to pass `scope` through. Update `Channels.getUserConfig` handler — the return type change is automatic since `gitService.getUserConfig` now returns `UserConfigResult`.
- [X] T014 Run `npm run build` and fix any type errors. All backend methods must compile and the build must be green. Test via DevTools console: `window.api.testSshAccess('github.com')`, `window.api.checkHttpsCredentials('github.com')`, etc.

**Checkpoint**: All IPC calls work end-to-end. No UI yet. Build is green. Commit as `feat(creds): implement credential, SSH test, and remote URL backend`.

---

## Phase 3: Chunk 3 — URL Utility + Connection Manager Wizard

**Goal**: The renderer-side URL detection/conversion utility and the full Connection Manager wizard component with SSH and HTTPS paths.

**Independent Test**: Click the Connection button in the TitleBar. The wizard opens, detects the protocol, lists SSH keys or checks HTTPS credentials, and guides setup.

**Maps to**: US2 (Guided Connection Setup Wizard)

**Depends on**: Phase 2 (Chunk 2) complete.

- [X] T015 [P] [US2] Create `src/renderer/src/lib/remoteUrl.ts` — implement `detectProtocol(url: string): RemoteProtocol` (returns `'https'` if url starts with `https://` or `http://`, `'ssh'` if starts with `git@` or `ssh://`, throws for unsupported). Implement `httpsToSsh(url: string): string` (convert `https://host/path` → `git@host:path`, strip `.git` and trailing slashes). Implement `sshToHttps(url: string): string` (convert `git@host:path` or `ssh://host/path` → `https://host/path`, strip `.git` and trailing slashes — mirrors existing `toWebUrl()` in gitService.ts lines 88-103). Implement `extractHost(url: string): string` (parse host from any HTTPS or SSH URL). Import `RemoteProtocol` from `@shared/types`.
- [X] T016 [P] [US2] Create `src/renderer/src/lib/providers.ts` — implement `getProviderInfo(host: string): { name: string; sshSettingsUrl?: string }` with a map of known providers: `github.com` → `{ name: 'GitHub', sshSettingsUrl: 'https://github.com/settings/ssh' }`, `gitlab.com` → `{ name: 'GitLab', sshSettingsUrl: 'https://gitlab.com/-/user_settings/ssh_keys' }`, `bitbucket.org` → `{ name: 'Bitbucket', sshSettingsUrl: 'https://bitbucket.org/account/settings/ssh-keys/' }`. For unknown hosts, return `{ name: host, sshSettingsUrl: undefined }`.
- [X] T017 [US2] Create `src/renderer/src/components/ConnectionManager.tsx` — full-screen modal (same pattern as `SshManager.tsx`). Props: `{ host: string; protocol: RemoteProtocol; onConnected: () => void; onClose: () => void }`. The wizard has two paths:
  - **SSH path**: Call `api.listSshKeys()` to list available keys. Call `api.testSshAccess(host)` to test. If `hasWorkingKey` is true, show success with the key name and enable "Done". If false, show each key with a copy button for its public key, a link to the provider's SSH settings page (from `getProviderInfo`), and a "Generate new key" button that reuses the `GenerateForm` from `SshManager.tsx` (extract it to a shared component or import it). After the user adds the key to the provider, offer a "Re-test" button that calls `api.testSshAccess(host)` again.
  - **HTTPS path**: Call `api.checkHttpsCredentials(host)`. If `stored` is true, show the username and offer "Test" (calls `api.testHttpsAccess`), "Update" (shows the credential form), and "Remove" (calls `api.removeHttpsCredentials`). If `stored` is false, show a form with username and password/token fields. On "Save", call `api.storeHttpsCredentials(host, username, password)`, then `api.testHttpsAccess` to verify. On success, enable "Done".
  - Include the credential helper disclaimer text per FR-001: "The credential helper is active automatically inside this app. To enable it in the terminal too, run: `git config --global credential.helper osxkeychain`" (adjust helper name per platform — use `process.platform` check or a constant).
  - Use Tailwind semantic tokens (`bg-app-panel`, `text-app-muted`, `border-app-border`, etc.) for all styling. Use `lucide-react` icons (KeyRound, Globe, Check, X, Copy, etc.). Use the existing `Button`, `Input`, `IconButton`, `Spinner` components from `ui.tsx`.
- [X] T018 [US2] Wire up ConnectionManager in `src/renderer/src/App.tsx` — add state `const [connManagerOpen, setConnManagerOpen] = useState(false)` and state for the current host/protocol. Pass `onOpenConnection` callback to `TitleBar`. Render `<ConnectionManager>` when `connManagerOpen` is true. The `onConnected` callback closes the wizard and triggers a connection status refresh (if the badge is implemented in Chunk 6, otherwise a no-op).
- [X] T019 [US2] Add a Connection button to `src/renderer/src/components/TitleBar.tsx` — add an `IconButton` with a `Plug` or `Link` icon (from `lucide-react`) next to the existing SSH keys button. Accept an `onOpenConnection: () => void` prop. When a repo is open, clicking it opens the Connection Manager for the primary remote's host and protocol (detect from the repo's remotes — call `api.getRemotes(repo.path)` and find `origin` or the first remote, then use `detectProtocol` and `extractHost` from `remoteUrl.ts`).
- [X] T020 Run `npm run build` and fix any type errors. Manually test: open a repo, click the Connection button, verify the wizard opens with the correct protocol and host. Test both SSH and HTTPS paths.

**Checkpoint**: The wizard opens, detects protocol, tests SSH/HTTPS, guides setup. Build is green. Commit as `feat(creds): add Connection Manager wizard with SSH and HTTPS paths`.

---

## Phase 4: Chunk 4 — Remote URL Switcher + Enhanced Clone Dialog

**Goal**: The Remotes section in Settings (with pre-check switch) and the enhanced clone dialog in WelcomeScreen (with connection check and identity pre-selection).

**Independent Test**: Open Settings → Remotes section. Click "Switch to SSH" — the wizard runs, and on success the remote URL changes. On the Welcome screen, enter an SSH URL with no key — Clone is disabled and "Set up connection" is shown.

**Maps to**: US3 (Remote URL Switcher), US5 (Enhanced Clone Dialog)

**Depends on**: Phase 3 (Chunk 3) complete.

- [X] T021 [US3] Add a "Remotes" section to `src/renderer/src/components/SettingsModal.tsx` — shown only when a repo is open. Call `api.getRemotes(repo.path)` to list remotes. For each remote, display its name, URL, and detected protocol (using `detectProtocol` from `remoteUrl.ts`). Add a "Switch to SSH" button (if currently HTTPS) or "Switch to HTTPS" button (if currently SSH). Clicking the button: compute the target URL using `httpsToSsh` or `sshToHttps`, open the Connection Manager for the target protocol and host, and only on `onConnected` call `api.setRemoteUrl(repo.path, remoteName, newUrl)`. If the user closes the wizard without connecting, do not change the URL. Show a toast on success: "Remote URL updated".
- [X] T022 [US5] Enhance the clone dialog in `src/renderer/src/components/WelcomeScreen.tsx` — expand the existing clone input section (lines 60-83). After the URL input, add a connection status panel: detect the protocol from the entered URL using `detectProtocol` (debounced, on URL change). For HTTPS: call `api.checkHttpsCredentials(host)` and show green if `stored` is true, red if false. For SSH: call `api.testSshAccess(host)` and show green if `hasWorkingKey` is true, red if false. If the connection is not ready: show a "Set up connection" button that opens the Connection Manager wizard (pass the detected host and protocol). Keep the "Clone" button disabled until the connection check passes. Add an optional identity profile dropdown below the connection status (populated from the store's `profiles` state — if no profiles exist, show nothing). After a successful clone: if a profile was selected, call `api.setUserConfig(targetPath, profile.name, profile.email, 'local')` before opening the repo.
- [X] T023 [US5] Update `pickAndCloneRepo` in `src/renderer/src/store/useStore.ts` — add an optional `profile?: GitProfile` parameter. After `api.cloneRepo` succeeds and before `openRepoByPath`, if `profile` is provided, call `api.setUserConfig(target, profile.name, profile.email, 'local')`. Update the `pickAndCloneRepo` type signature in the store interface (line ~183).
- [X] T024 Run `npm run build` and fix any type errors. Manually test: switch a remote from HTTPS to SSH and back; clone with a connection check; clone with an identity profile selected.

**Checkpoint**: User can switch remotes with pre-check. User can clone with connection status and optional identity. Build is green. Commit as `feat(creds): add remote URL switcher and enhanced clone dialog`.

---

## Phase 5: Chunk 5 — Identity Profiles with Scope Control

**Goal**: Profile storage in Prefs, enhanced identity section in Settings with CRUD, profile dropdown, scope radio, and global warning.

**Independent Test**: Create two identity profiles in Settings. Apply one locally — verify only the repo's config changed. Apply another globally — verify the warning appears and the global config changes.

**Maps to**: US4 (Identity Profiles with Scope Control)

**Depends on**: Phase 2 (Chunk 2) complete. Can run in parallel with Phase 3 and Phase 4.

- [X] T025 [P] [US4] Add `profiles: GitProfile[]` to the `Prefs` interface in `src/renderer/src/lib/prefs.ts` — add the field with default `[]`. Update `loadPrefs()` to parse `profiles` with a safe fallback: if `profiles` is not an array, default to `[]`. Update `DEFAULTS` to include `profiles: []`. Import `GitProfile` from `@shared/types`.
- [X] T026 [P] [US4] Add profile state and actions to `src/renderer/src/store/useStore.ts` — add `profiles: GitProfile[]` to the store state (loaded from Prefs on init). Add `loadProfiles: () => void` (reads from Prefs, sets state). Add `saveProfile: (profile: GitProfile) => void` (if `profile.id` exists in the list, update it; otherwise append. Write to Prefs via `savePrefs`. Refresh state). Add `deleteProfile: (id: string) => void` (filter out the profile with the given id. Write to Prefs. Refresh state). Use `crypto.randomUUID()` for new profile IDs.
- [X] T027 [US4] Enhance the "Git identity" section in `src/renderer/src/components/SettingsModal.tsx` — replace the existing simple name/email fields (lines 123-149) with:
  - A profile dropdown (`<select>`) populated from `useStore(s => s.profiles)`, with options: "(use global default)", each saved profile by label, and "+ Create new profile…". Selecting a profile fills the name/email fields.
  - Name and email input fields (existing).
  - A scope radio group: "This repository only (local)" (default, checked) and "All repositories (global)". Below the global option, show a warning text: "This affects ALL repositories on this computer, including SourceTree and the terminal. Repositories with a local override are unaffected." The warning is always visible when global is selected (not a separate confirmation dialog — the text is inline).
  - Display the current identity's source: call `api.getUserConfig(repo.path)` on mount and show "Current: {name} <{email}> (source: {nameScope})" so the user knows where the active value comes from.
  - "Save identity" button: calls `api.setUserConfig(repo.path, name, email, scope)`. Show a success toast.
  - "Save as new profile" button: calls `saveProfile({ id: crypto.randomUUID(), label: prompt('Profile label?'), name, email })`. Show a success toast.
  - Edit/delete buttons next to each profile in the dropdown (or a small profile list below the dropdown with edit/delete icons).
- [X] T028 Run `npm run build` and fix any type errors. Manually test: create a profile, apply it locally, verify with `git config --local user.name` in terminal. Apply globally, verify the warning is shown, verify `git config --global user.name` changes. Edit and delete profiles.

**Checkpoint**: User can create, edit, delete profiles. Apply locally or globally with warnings. Build is green. Commit as `feat(creds): add identity profiles with local/global scope`.

---

## Phase 6: Chunk 6 — Connection Status Badge

**Goal**: The TitleBar badge showing protocol, key name/username, and success/failure. Local-only check on repo open. Refresh after connection-related actions.

**Independent Test**: Open a repo with a working SSH remote — badge shows key icon + key name + green check. Open a repo with no key — badge shows red cross. Click the badge — Connection Manager opens.

**Maps to**: US6 (Connection Status Badge)

**Depends on**: Phase 2 (Chunk 2) and Phase 3 (Chunk 3) complete.

- [X] T029 [P] [US6] Add `connectionStatus` state and `refreshConnectionStatus` action to `src/renderer/src/store/useStore.ts` — add `connectionStatus: ConnectionStatus | null` to the store state (default `null`). Add `refreshConnectionStatus: () => Promise<void>` action: if no repo is open, set `connectionStatus` to `null` and return. Call `api.getRemotes(repo.path)` to get remotes. Find the primary remote (`origin` or first). Detect protocol and host using `detectProtocol` and `extractHost` from `remoteUrl.ts`. For HTTPS: call `api.checkHttpsCredentials(host)` → set `connectionStatus` to `{ protocol: 'https', host, httpsOk: result.stored, httpsUsername: result.username }`. For SSH: call `api.listSshKeys()` → set `connectionStatus` to `{ protocol: 'ssh', host, sshOk: keys.length > 0, sshKey: keys[0]?.name }`. This is a local-only check — no network call. Call `refreshConnectionStatus()` in `openRepoByPath` after the repo opens.
- [X] T030 [US6] Add the connection status badge to `src/renderer/src/components/TitleBar.tsx` — next to the branch chip (line ~38), add a small badge. Read `connectionStatus` from the store. If `protocol` is `'ssh'`: show a `KeyRound` icon, the `sshKey` name (or "no key"), and a green `Check` icon if `sshOk` is true or a red `X` icon if false. If `protocol` is `'https'`: show a `Globe` icon, the `httpsUsername` (or "no creds"), and a green/red check. If `connectionStatus` is null (no repo), show nothing. Clicking the badge calls `onOpenConnection` (already wired in Chunk 3). Use Tailwind semantic tokens. Keep the badge compact (text-[11px], inline).
- [X] T031 [US6] Trigger `refreshConnectionStatus()` after connection-related actions — in `App.tsx`, when the Connection Manager's `onConnected` callback fires, call `refreshConnectionStatus()`. In the remote URL switcher (SettingsModal), after a successful `setRemoteUrl`, call `refreshConnectionStatus()`. In the credential management flow (store/remove), after the action completes, call `refreshConnectionStatus()`. This ensures the badge updates without a page reload.
- [X] T032 Run `npm run build` and fix any type errors. Manually test: open a repo with SSH — badge shows green. Open a repo with no key — badge shows red. Click badge — wizard opens. Fix connection — badge turns green.

**Checkpoint**: Badge appears on repo open, updates after wizard/switch, clicking opens Connection Manager. Build is green. Commit as `feat(creds): add connection status badge to TitleBar`.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup across all chunks.

- [X] T033 [P] Add the credential helper disclaimer to the SettingsModal — per FR-001, add a small text block in the HTTPS credential section of Settings (or the Connection Manager HTTPS path) explaining: "The credential helper is active automatically inside this app. To enable it in the terminal and other tools, run: `git config --global credential.helper osxkeychain`" (adjust the helper name per platform: `manager` on Windows, `store` on Linux). Use `process.platform` to detect the platform, or hardcode the text with all three options shown.
- [X] T034 [P] Ensure error toast with "Set up connection" button on auth failure — per US1 acceptance scenario 2, when a fetch/pull/push fails with an auth error, show an error toast (using the existing toast system in `useStore.ts`) that includes a "Set up connection" button. The button opens the Connection Manager. Detect auth errors by checking if the error message contains "could not read Username", "Permission denied", "Authentication failed", or similar patterns. This may require wrapping the existing `fetch`, `pull`, and `push` store actions to catch auth errors and show the toast instead of the generic error toast.
- [X] T035 Run `npm run build` for final validation. All chunks must compile together. Fix any remaining type errors.
- [X] T036 Run the full quickstart.md validation guide — manually test all 9 success criteria (SC-001 through SC-009) as described in `specs/007-connection-identity-manager/quickstart.md`. Verify SourceTree is unaffected by local-only operations.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Chunk 1)**: No dependencies — start immediately. Small session.
- **Phase 2 (Chunk 2)**: Depends on Phase 1. Medium session.
- **Phase 3 (Chunk 3)**: Depends on Phase 2. Large session (the wizard).
- **Phase 4 (Chunk 4)**: Depends on Phase 3. Medium session.
- **Phase 5 (Chunk 5)**: Depends on Phase 2. Can run in parallel with Phases 3 and 4. Medium session.
- **Phase 6 (Chunk 6)**: Depends on Phases 2 and 3. Small session.
- **Phase 7 (Polish)**: Depends on all phases. Small session.

### Chunk Dependency Graph

```
Chunk 1 (Phase 1) — types + credential helper
  │
  ▼
Chunk 2 (Phase 2) — backend services
  │
  ├──► Chunk 3 (Phase 3) — URL util + wizard
  │      │
  │      ├──► Chunk 4 (Phase 4) — switcher + clone dialog
  │      │
  │      └──► Chunk 6 (Phase 6) — status badge
  │
  └──► Chunk 5 (Phase 5) — identity profiles
         (parallel with 3, 4, 6)

Phase 7 (Polish) — after all chunks
```

### Parallel Opportunities

- T001, T002, T003, T004, T005 can all run in parallel (different files, no dependencies) within Phase 1
- T007, T008, T009, T010, T011, T012 can all run in parallel (different methods, different files) within Phase 2
- T015, T016 can run in parallel (different new files) within Phase 3
- T025, T026 can run in parallel (different files) within Phase 5
- T029 can run in parallel with T025/T026 (different file sections)
- Phase 5 (Chunk 5) can run entirely in parallel with Phases 3 and 4

---

## Implementation Strategy

### MVP First (Chunks 1 + 2)

1. Complete Phase 1 (Chunk 1) — credential helper fix + types + channels
2. Complete Phase 2 (Chunk 2) — all backend services
3. **STOP and VALIDATE**: Test via DevTools console that all IPC calls work
4. At this point, HTTPS fetch works (SC-001) — the original bug is fixed

### Incremental Delivery

1. Chunks 1 + 2 → HTTPS auth works, backend ready (MVP — fixes the bug)
2. Chunk 3 → Connection Manager wizard (SC-002, SC-004)
3. Chunk 4 → Remote switcher + enhanced clone (SC-003)
4. Chunk 5 → Identity profiles (SC-005) — can be done anytime after Chunk 2
5. Chunk 6 → Status badge (SC-006) — can be done anytime after Chunk 3
6. Phase 7 → Polish, disclaimers, error toasts (SC-007, SC-008, SC-009)

### Session Planning

- **Short session**: Chunk 1 or Chunk 5 or Chunk 6
- **Medium session**: Chunk 2 or Chunk 4
- **Large session**: Chunk 3 (the wizard — most UI work)
- Each chunk ends with `npm run build` green and a commit

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each chunk is independently committable and delivers value
- `npm run build` must pass after every chunk
- Commit after each chunk using Conventional Commits (e.g., `feat(creds): ...`)
- The credential helper fix (T001) is the single highest-impact change — it fixes the original bug
- No automated tests — validation is manual via `npm run dev` and the quickstart guide

---

## Phase 8: Convergence

- [X] T037 Wire the remote URL change after wizard success per FR-009, US3/AC1 (partial) — `switchRemote` in `src/renderer/src/components/SettingsModal.tsx` (line 85-97) opens the Connection Manager wizard but never calls `setRemoteUrl` after the wizard verifies the connection. The `onConnected` callback in `src/renderer/src/App.tsx` (line 304-307) only closes the wizard and refreshes status. Fix: extend the `connManager` state in `App.tsx` to carry an optional pending remote change (`{ repoPath, remoteName, newUrl }`), pass it from `switchRemote` through `onOpenConnection`, and in the `onConnected` callback call `useStore.getState().setRemoteUrl(repoPath, remoteName, newUrl)` before closing the wizard. If the user cancels the wizard (`onClose`), do not apply the URL change. The `setRemoteUrl` store action already exists at `src/renderer/src/store/useStore.ts` line 1322.
- [X] T038 Show "unsupported protocol" message in the clone dialog per Edge Cases (partial) — in `src/renderer/src/components/WelcomeScreen.tsx`, when `detectProtocol` throws for an unsupported protocol (e.g., `git://`, `file://`), `connProtocol` stays `null` and the connection status panel is hidden (line 146: `cloneUrl.trim() && connProtocol && ...`). The Clone button is disabled but no message explains why. Fix: add a state flag for unsupported protocol (e.g., `connUnsupported: boolean`), set it in the catch block of the debounced connection check (line 68), and render a message like "Unsupported protocol — use HTTPS or SSH" in the connection status panel when `connUnsupported` is true.
