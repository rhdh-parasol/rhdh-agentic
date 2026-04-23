# FSD: CLI Foundation

**Status:** Draft
**Date:** 2026-04-22
**Author:** Architect Agent
**Parent PRD:** [backstage-agent](../../prd/backstage-agent.md)
**ADR Dependencies:** backstage-agent-technology-stack-and-packaging, backstage-agent-authentication, backstage-agent-cli-backend-transport

---

## Goal

Establish the backstage-agent CLI foundation — command framework, authentication subsystem, backend transport layer, and output infrastructure — so that pillar commands (catalog, TechDocs, templates) can be implemented against stable interfaces (PRD Section 4: Core Capabilities).

## User Story

**As a** platform engineer,
**I want** to install, authenticate, and configure the backstage-agent CLI,
**so that** coding agents can autonomously access organizational context from any Backstage instance using standard auth.

**As a** coding agent,
**I want** authenticated, non-interactive access to Backstage via structured commands,
**so that** I can discover services, read standards, and scaffold applications without human intervention after initial setup.

## What Exists

The CLI foundation produces five categories of capability:

### Authentication Subsystem

The CLI provides three auth commands and one automatic behavior:

| Capability | Command | Interactive? |
|------------|---------|-------------|
| Login | `auth login --backend-url <url>` | Yes (one-time, browser-based OAuth) |
| Status | `auth status` | No |
| Logout | `auth logout` | No |
| Auto-refresh | (implicit on every command) | No |

Credentials are stored in the backstage-cli shared credential store. A user who has authenticated with either `backstage-cli auth login` or `backstage-agent auth login` is authenticated for both tools. The CLI must never store credentials in a separate location.

Login supports two modes:

- **Browser mode** (default): starts a local HTTP callback server, opens the browser to the authorization URL, receives the callback with the authorization code
- **Non-interactive mode** (`--no-browser`): prints the authorization URL to stdout, user authenticates in any browser (same or different machine), pastes the resulting callback URL back into the CLI. Note: the auth ADR uses `--non-interactive` in some places — this FSD canonicalizes the flag as `--no-browser`.

The OAuth flow uses Authorization Code + PKCE. Client metadata is fetched from `{backendUrl}/api/auth/.well-known/oauth-client/cli.json`. The authorization URL targets `{backendUrl}/api/auth/v1/authorize`. Token exchange uses a standard OAuth library — no custom protocol implementation.

### Backend URL Resolution

The CLI needs a Backstage backend URL to operate. Resolution follows strict precedence:

| Priority | Source | Use Case |
|----------|--------|----------|
| 1 | `--backend-url` flag | Per-command override |
| 2 | `BACKSTAGE_BACKEND_URL` environment variable | CI/CD, container injection |
| 3 | Active instance from CliAuth credential store | Default after `auth login` |

If no backend URL can be resolved, the CLI exits with a structured error hinting at `auth login`.

### Transport Layer

The CLI accesses Backstage through typed service interfaces. Each pillar has a service interface that commands depend on. The initial release provides REST transport for all services.

| Pillar | Client Strategy |
|--------|----------------|
| Catalog | `@backstage/catalog-client` via catalog service interface |
| Scaffolder | Direct HTTP via scaffolder service interface |
| TechDocs | Direct HTTP via TechDocs service interface |

Commands depend on the service interface, not on the transport implementation. The `discoveryApi` provided to catalog-client resolves base URLs from the configured backend URL using the pattern `{backendUrl}/api/{pluginId}`.

### Output System

| Format | Flag | Default? | Purpose |
|--------|------|----------|---------|
| JSON | `--output json` | Yes | Agent consumption |
| Human-readable | `--output human` | No | Developer consumption |

Every successful JSON response includes a top-level `hints` array with contextually relevant next commands. Agents navigate the CLI by following hints rather than reading external documentation.

### Error System

All errors exit with code 1 and produce a JSON object with three fields, regardless of the `--output` setting. No additional exit codes — agents use the JSON `error` field to discriminate error categories, not exit codes:

| Field | Purpose |
|-------|---------|
| `error` | Machine-readable error code (e.g., `not_authenticated`, `no_backend_url`) |
| `message` | Human-readable explanation |
| `hint` | Concrete recovery command (e.g., `backstage-agent auth login --backend-url <URL>`) |

### Help Contract

Every command's `--help` output includes: command signature, all flags with types and defaults, output schema description, safety classification (`read-only`, `config-write`, `reversible`, `destructive`), and example invocations. Agents discover the CLI cold from `--help` alone.

## Requirements

### Authentication

- The CLI must use `CliAuth` from `@backstage/cli-node` for all token retrieval and refresh. No custom token refresh logic.
- The `auth login` command must implement OAuth 2.0 Authorization Code + PKCE using a standard OAuth library (e.g., `oauth4webapi`). No custom OAuth protocol reimplementation.
- Client metadata must be fetched from `{backendUrl}/api/auth/.well-known/oauth-client/cli.json` before initiating the flow.
- Credentials must be written to the backstage-cli shared credential store as managed by CliAuth. The stored format must be compatible with `CliAuth` reads and with backstage-cli.
- The `--backend-url` flag is required for `auth login`. No interactive instance-picker prompts.
- The instance name in the credential store is derived automatically from the backend URL hostname (e.g., `backstage.example.com` → `backstage-example-com`). No `--instance-name` flag.
- After login, all subsequent commands are fully non-interactive — token refresh is automatic via CliAuth.

### Transport

- All pillar commands must depend on typed service interfaces, not on transport details.
- Catalog operations must use `@backstage/catalog-client` through the catalog service interface.
- Scaffolder and TechDocs operations must use direct HTTP calls through their respective service interfaces.
- Service interfaces must be structured so that alternative transport implementations can be added later without changing command code.
- All HTTP requests must include the authenticated token from CliAuth in the `Authorization` header.

### Output

- JSON is the default output format for all commands.
- Every successful JSON response includes a `hints` array with contextually relevant next commands.
- Human-readable format is available via `--output human` for all commands, including auth commands (`auth status`, `auth logout`). `auth login` output is always human-readable (it guides the user through the OAuth flow) and ignores `--output`.
- Error output is always JSON with `error`, `message`, and `hint` fields, regardless of `--output` setting.

### CLI Structure

- Installable globally via `npm install -g backstage-agent` or runnable via `npx backstage-agent`.
- Commands follow the pattern: `backstage-agent <group> <command> [arguments] [flags]`.
- All commands are non-interactive (except the browser step in `auth login`).
- All commands accept `--output` and `--backend-url` as global flags.

## Acceptance Criteria

### Login — Browser Mode

- **Given** no stored credentials, **when** the user runs `backstage-agent auth login --backend-url https://backstage.example.com`, **then** the CLI fetches client metadata from the backend, starts a local HTTP callback server, opens the browser to the authorization URL, completes the OAuth PKCE token exchange upon callback, and stores credentials in the backstage-cli shared credential store.

### Login — Non-Interactive Mode

- **Given** the `--no-browser` flag is passed, **when** the CLI starts the login flow, **then** it prints the full authorization URL to stdout without opening a browser or starting a local server, waits for the user to paste the callback URL, extracts the authorization code from the pasted URL, and completes the token exchange.

### Cross-Tool Credential Sharing

- **Given** valid stored credentials from a previous `backstage-cli auth login`, **when** the user runs any backstage-agent command, **then** the CLI authenticates using those existing credentials without requiring a separate login.
- **Given** the user logs in with `backstage-agent auth login`, **when** `backstage-cli` reads its credential store, **then** the credentials are available to backstage-cli as well.

### Token Auto-Refresh

- **Given** a stored token that has expired but has a valid refresh token, **when** any command runs, **then** CliAuth automatically refreshes the token without user intervention.

### Auth Status

- **Given** valid stored credentials, **when** the user runs `backstage-agent auth status`, **then** the CLI verifies the token against the Backstage backend and outputs the authentication state including the backend URL and user identity (if available).
- **Given** a locally valid token but an unreachable backend, **when** the user runs `backstage-agent auth status`, **then** the CLI reports `status: "unreachable"` with the error detail and a hint to check the backend URL.

### Re-Login

- **Given** stored credentials already exist for a backend URL, **when** the user runs `backstage-agent auth login --backend-url` with the same URL, **then** the existing credentials are overwritten with the new tokens from the fresh OAuth flow.

### Refresh Token Failure

- **Given** a stored token whose refresh token has been revoked or is invalid, **when** any command attempts auto-refresh via CliAuth, **then** the CLI exits with code 1 and a structured error with `error: "token_refresh_failed"` and a hint to run `auth login` again.
- **Given** an expired token and an unreachable backend (so refresh cannot be attempted), **when** any command runs, **then** the CLI exits with code 1 and `error: "token_refresh_failed"`. The refresh failure takes precedence over the connectivity issue — the actionable fix is the same: `auth login`.

### Auth Logout

- **Given** stored credentials, **when** the user runs `backstage-agent auth logout`, **then** credentials for the active instance (resolved via backend URL precedence: `--backend-url` flag > `BACKSTAGE_BACKEND_URL` env var > stored default) are removed from the backstage-cli credential store.
- **Given** no backend URL can be resolved, **when** the user runs `backstage-agent auth logout`, **then** the CLI exits with code 1 and a structured error with `error: "no_backend_url"` and a hint explaining which instance to target.

### Backend URL Precedence

- **Given** `--backend-url https://a.example.com` is passed and `BACKSTAGE_BACKEND_URL=https://b.example.com` is set, **when** any command runs, **then** the flag value (`a`) takes precedence.
- **Given** no flag and no environment variable but a stored instance from `auth login`, **when** any command runs, **then** the stored instance's backend URL is used.
- **Given** no backend URL from any source, **when** any command runs, **then** the CLI exits with code 1, error `no_backend_url`, and a hint to run `auth login`.

### Output

- **Given** any successful command with default output, **then** the output is valid JSON with a `hints` array.
- **Given** `--output human`, **then** the output is formatted as human-readable text.
- **Given** any error, **then** the output is a JSON object with `error`, `message`, and `hint` fields regardless of `--output` setting.

### Help

- **Given** any command with `--help`, **then** the output includes the complete command contract: signature, flags, output schema, safety classification, and examples.

## Invariants

- Credentials are never stored outside the backstage-cli shared credential store (`~/.config/backstage-cli/` and `~/.local/share/backstage-cli/auth-secrets/`).
- All commands exit with code 0 on success and code 1 on failure.
- JSON output is always valid, parseable JSON.
- No command reads from stdin or displays interactive prompts — except `auth login`, which requires human interaction: a browser-based OAuth flow in default mode, or pasting a callback URL in `--no-browser` mode.
- Token refresh is always automatic and transparent to the command layer.
- Backend URL precedence order (flag > env > stored instance) is enforced consistently across all commands.
- The command layer never depends on a specific transport implementation — only on service interfaces.

## Technical Constraints

- TypeScript targeting Node.js LTS (tech-stack ADR D-1)
- Commander.js for command parsing and help generation (tech-stack ADR D-2)
- Standalone npm package with binary entry point (tech-stack ADR D-3)
- `CliAuth` from `@backstage/cli-node` for token management (auth ADR D-1) — note: this introduces a runtime dependency on `@backstage/cli-node`, superseding tech-stack ADR D-3's original "no `@backstage/cli-node` at runtime" statement. The tech-stack ADR's Consequences section already acknowledges this.
- Shared credential storage with backstage-cli (auth ADR D-2)
- REST APIs as primary transport (transport ADR D-1)
- `@backstage/catalog-client` for catalog operations (transport ADR D-2)
- No MCP Actions in initial release (transport ADR D-3)
- Transport abstraction via typed service interfaces in lib/ layer (transport ADR D-4)

## Out of Scope

- **Static token / service account auth** — Deferred per auth ADR G-1. Needed for CI/CD but does not block initial release. Can be added as `BACKSTAGE_TOKEN` env var without changing OAuth implementation.
- **Multi-instance management UX** — Listing, selecting, and switching between instances deferred per auth ADR G-2. CliAuth supports instance selection via `instanceName` option; command UX is not specified here.
- **MCP Actions transport** — Deferred per transport ADR D-3. The transport abstraction (D-4) preserves this migration path.
- **Pillar command specifications** — Catalog, scaffolder, and TechDocs commands are separate FSDs. This FSD defines the infrastructure they depend on.
- **Backstage CLI module packaging** — Deferred per tech-stack ADR D-3. TypeScript + Commander.js alignment keeps the distance short if needed later.
- **Distribution-specific features** — RHDH-specific functionality deferred per PRD Section 7.

## Validation

A successful implementation demonstrates the full bootstrap lifecycle: a platform engineer installs the CLI globally, runs `auth login` with a `--backend-url` flag, completes the browser-based OAuth flow (or uses `--no-browser` for remote environments), and verifies with `auth status`. After this one-time setup, a coding agent runs pillar commands non-interactively — CliAuth handles token refresh transparently. Commands produce structured JSON with next-step hints. Errors include machine-readable codes and concrete recovery commands.

Cross-tool credential sharing is verified by authenticating with one tool and confirming the other works without re-login. Backend URL precedence is verified by setting values at multiple levels and confirming the highest-priority source wins.

## Open Questions

None.

---

## Revision History

| Version | Date | Author | Summary |
|---------|------|--------|---------|
| 0.1 | 2026-04-22 | Architect Agent | Initial draft |
