<!--
Sync Impact Report
- Version change: (none) → 1.0.0
- Modified principles: N/A (initial adoption)
- Added sections:
  - Core Principles (I–V)
  - Technology & Architecture Constraints
  - Development Workflow & Quality Gates
  - Governance
- Removed sections: N/A
- Follow-up TODOs: none
-->

# Self-hosted Git Client Constitution

## Core Principles

### I. Local-First and Private by Design

The application MUST run 100% on the user's machine. No telemetry, no
cloud calls, no account requirement, and no third-party avatar services are
permitted. Repositories, credentials and SSH keys MUST never leave the
host. Any new feature that introduces network communication MUST be opt-in
and documented as such.

Rationale: Privacy and local-first operation are the product's core
value proposition. Violating this principle breaks the trust contract with
users.

### II. Type Safety and Contract-Driven IPC

All cross-process communication MUST go through the typed IPC envelope
defined in `src/shared/ipc.ts` and `src/shared/types.ts`. Every call
returns `{ ok: true, data } | { ok: false, error }`. Adding a new IPC call
MUST touch the four layers in order: shared channels → main handler →
preload bridge → renderer `call()` helper. Business logic MUST live in a
`src/main/services/*` module, never inline in `ipc.ts`.

Rationale: A single typed contract prevents silent breakage between the
main and renderer processes and keeps the security boundary auditable.

### III. Build Must Be Green (NON-NEGOTIABLE)

`npm run build` (typecheck + electron-vite build) MUST pass before any
commit. TypeScript strictness MUST be maintained — no `any` escapes
without an inline justification comment. The build is the primary quality
gate; a red build blocks the branch from merging.

Rationale: A desktop client shipped to end users cannot regress on types
or bundling. The build is fast (<10 s) and catches the majority of
integration errors cheaply.

### IV. Single Source of Truth for Identity and Styling

Brand identity (name, tagline, theme colors, graph palette) MUST live only
in `src/renderer/src/branding.ts`. Executable name and appId MUST live only
in `package.json` and `electron-builder.yml`. Components MUST use the
Tailwind semantic tokens (`app-bg`, `app-panel`, `app-accent`, …) and MUST
NOT hardcode hex colors. Dynamic colors (e.g. graph lanes) MUST derive from
`branding.graphColors`.

Rationale: Centralizing identity enables rebranding in seconds and
guarantees light/dark themes keep working without per-component edits.

### V. Simplicity and Minimal Dependencies

Prefer the standard library and existing dependencies over adding new
packages. New dependencies MUST be vetted for maintenance status,
license compatibility and supply-chain risk; prefer versions published at
least 7 days ago. Git operations MUST use `simple-git` (or `git.raw` with
explicit args) — never bundle native git bindings. Start simple; YAGNI
applies. Complexity MUST be justified in the PR description.

Rationale: A self-hosted tool must remain easy to audit and build. Every
dependency is a long-term maintenance and security liability.

## Technology & Architecture Constraints

- **Runtime**: Node.js (modern LTS), system `git` on PATH. No native
  compilation required.
- **Shell**: Electron 33. Main process, preload and renderer are bundled
  separately by electron-vite (Vite 5).
- **UI**: React 18 + TypeScript 5. Styling via Tailwind CSS 3 with
  PostCSS/autoprefixer. Global state via Zustand (single store in
  `store/useStore.ts`); mutations wrapped in the store's `run()` helper.
- **Git backend**: `simple-git` instances cached per repository path.
  Non-trivial operations prefer `git.raw([...])` with explicit args.
- **Package manager**: npm (lockfile committed). Do not introduce yarn,
  pnpm or bun lockfiles.
- **Language**: English only — UI text, code, comments, commit messages
  and docs.
- **No secrets in code**: Never log or expose keys, tokens or credentials.
  SSH keys are accessed only through `sshService` at runtime.

## Development Workflow & Quality Gates

- **Branch discipline**: Never commit to `main` directly. Work on a
  `<slug>/<topic>` branch and merge via pull request. `main` moves only
  through merged PRs and release tags.
- **Conventional Commits**: Every commit follows the Conventional Commits
  spec (`feat:`, `fix:`, `refactor:`, `ci:`, `docs:`, `chore:`, …) with an
  optional scope, e.g. `feat(graph): …`.
- **Commit and push only when explicitly asked**: Never commit or push on
  your own initiative.
- **Understand before changing**: Read the relevant files and trace
  dependencies before editing. Match the surrounding code's style, comment
  density and idioms.
- **Focused changes**: One cohesive change per commit / PR. Do not mix
  unrelated refactors with feature work.
- **Code review**: All PRs MUST be reviewed before merge. Reviewers verify
  constitution compliance, type safety, IPC contract integrity and
  branding-token usage.
- **Visual changes**: For user-facing changes, offer to run `npm run dev`
  so the change can be validated live.
- **Releases**: Tags are cut from `main` only. The `package.json` version
  and `branding.ts` version MUST match the tag exactly. A tag MUST produce
  a published GitHub Release with OS installers attached.

## Governance

This constitution is the highest-authority document for engineering
decisions in this repository. It supersedes ad-hoc practices and any
conflicting guidance in issues or chats.

- **Amendments**: Any change to this constitution MUST be proposed via a
  pull request, reviewed and approved by a maintainer. The PR MUST
  describe the rationale, the version bump and any migration steps.
- **Versioning**: Semantic versioning applies to the constitution itself.
  MAJOR for principle removals/redefinitions, MINOR for new
  principles/sections, PATCH for clarifications and wording.
- **Compliance review**: Every PR MUST be checked against this
  constitution during review. Non-compliant PRs MUST be blocked until
  fixed or until the constitution is amended to accommodate the change.
- **Runtime guidance**: For day-to-day implementation rules, architecture
  and the release workflow, refer to `AGENTS.md` in the repository root.

**Version**: 1.0.0 | **Ratified**: 2026-10-01 | **Last Amended**: 2026-10-01
