# ADR: Authentication for backstage-agent CLI

**Date:** 2026-04-14
**Author:** Architect Agent
**Parent PRD:** [backstage-agent](../prd/backstage-agent.md)
**Related ADRs:** [technology-stack-and-packaging](backstage-agent-technology-stack-and-packaging.md), [cli-backend-transport](backstage-agent-cli-backend-transport.md)

---

## Context

The backstage-agent CLI needs to authenticate with Backstage instances to access catalog, TechDocs, and template APIs. The PRD requires:

- Same RBAC as regular Backstage users — no special agent infrastructure
- Works with any Backstage instance using standard auth
- Non-interactive operation for agent consumers (no stdin prompts)

The Backstage CLI (`@backstage/cli`) ships `@backstage/cli-module-auth` which implements OAuth 2.0 Authorization Code + PKCE against Backstage's `/api/auth/v1/` endpoints. Source review (`packages/cli-module-auth/src/`) reveals:

- **Auth flow:** OAuth 2.0 Authorization Code + PKCE (RFC 7636) via browser redirect to a local callback server
- **Token storage:** Instance metadata in `~/.config/backstage-cli/auth-instances.yaml`; secrets (access/refresh tokens) in OS keychain (keytar) with file-based fallback at `~/.local/share/backstage-cli/auth-secrets/` (mode 0600)
- **Token refresh:** Automatic refresh when access token expires within 2 minutes, using `grant_type=refresh_token` against `/api/auth/v1/token`
- **Dependencies:** `@backstage/cli-node` (for `createCliModule`) and `@internal/cli` (private, unpublished package providing `getSecretStore()` and `getAuthInstanceService()`)

The `@internal/cli` dependency makes `@backstage/cli-module-auth` unusable as a direct npm dependency — `@internal/cli` is not published. However, the auth logic itself (OAuth flow, storage format, token refresh) is straightforward and self-contained.

**Key constraint from PRD:** The CLI is designed for agent consumption — non-interactive, no stdin prompts. The OAuth browser flow requires human interaction for the `login` step (user authenticates in browser). This is acceptable: login is a one-time setup step, not part of ongoing agent operation. All subsequent commands use stored tokens with automatic refresh.

ADR dependency: `specifications/adr/backstage-agent-technology-stack-and-packaging.md` (D-1: TypeScript, D-3: standalone CLI)

## Decision

### D-1: Implement Own Auth Using Same Protocol as Backstage CLI

Implement authentication independently in the backstage-agent CLI, using the same OAuth 2.0 Authorization Code + PKCE protocol as `@backstage/cli-module-auth`, but with own code and own credential storage.

The auth implementation covers:

1. **Login** (`backstage-agent auth login`) — OAuth 2.0 Authorization Code + PKCE flow:
   - Fetch client metadata from `{backendUrl}/api/auth/.well-known/oauth-client/cli.json`
   - Generate PKCE verifier + S256 challenge
   - Start local HTTP callback server
   - Open browser to `{backendUrl}/api/auth/v1/authorize` (or print URL with `--no-browser`)
   - Exchange authorization code for tokens at `{backendUrl}/api/auth/v1/token`
   - Store tokens and instance metadata

2. **Token refresh** — Automatic, transparent refresh when access token nears expiry (2-minute buffer), using `grant_type=refresh_token`

3. **Token retrieval** — Commands retrieve stored access token before API calls; refresh if needed

**Non-interactive caveat:** The `auth login` command is interactive — it opens a browser and waits for the user to complete authentication. This is a one-time setup step. Once authenticated, all subsequent CLI operations are fully non-interactive, using stored tokens with automatic refresh. This matches how `gh auth login`, `gcloud auth login`, and `backstage-cli auth login` work — the login ceremony is interactive, the usage is not.

### D-2: Own Credential Storage, Independent from Backstage CLI

Store credentials independently from `@backstage/cli`:

- **Instance metadata:** `~/.config/backstage-agent/config.yaml` (shared config file, not `backstage-cli/`)
- **Secrets:** File-based storage at `~/.local/share/backstage-agent/auth-secrets/` (mode 0600), with optional keytar (OS keychain) support if available

Using a separate storage path (`backstage-agent/` vs `backstage-cli/`) means:

- No implicit coupling to `@backstage/cli` storage format changes
- No risk of credential corruption from concurrent access by both CLIs
- Users must authenticate separately for each CLI

**Rationale:** The PRD positions backstage-agent as a standalone tool that doesn't depend on `@backstage/cli` (ADR backstage-agent-technology-stack-and-packaging, D-3). Sharing credential storage would create an implicit runtime dependency on `@backstage/cli`'s storage format and location, contradicting the standalone design.

## Consequences

### Positive

- Auth flow is fully controlled — can evolve independently (e.g., add static token support for CI/CD later without waiting for upstream)
- No dependency on unpublished `@internal/cli` package
- Same OAuth protocol means the server-side Backstage auth configuration works for both CLIs without changes
- Once logged in, all commands are non-interactive — agents operate autonomously

### Negative

- Users who use both `backstage-cli` and `backstage-agent` must authenticate separately for each
- Duplicates ~200 lines of auth logic that already exists in `@backstage/cli-module-auth` (OAuth flow, storage, token refresh)
- `auth login` is interactive (browser-based) — agents cannot self-authenticate; a human must run login first
- Must track upstream changes to Backstage's `/api/auth/v1/` endpoints independently

### Known Gaps

- **G-1:** Static token / service account support for CI/CD and fully headless environments is not included in this decision. When needed, it can be added as an additional auth method (e.g., `BACKSTAGE_TOKEN` env var) without changing the OAuth implementation. This should be addressed before CI/CD use cases.
- **G-2:** Multi-instance management UX (list, select, show, logout) is implied but not specified in detail. The storage schema supports multiple instances. Command details are FSD scope.

## Alternatives Considered

### Alternative A: Share Credentials with Backstage CLI

Read credentials from `~/.config/backstage-cli/auth-instances.yaml` and `~/.local/share/backstage-cli/auth-secrets/`. Users authenticate once via `backstage-cli auth login`, and backstage-agent reads the stored tokens.

**Pros:**
- Zero-friction for users who already have `backstage-cli` installed — single sign-on across both CLIs
- No duplicated auth code — backstage-agent is purely a credential consumer

**Why rejected:** Creates an implicit runtime dependency on `@backstage/cli`'s storage format, file paths, and secret store implementation. If upstream changes the storage schema, backstage-agent breaks silently. Also requires `@backstage/cli` to be installed for initial auth — contradicts the standalone design (ADR backstage-agent-technology-stack-and-packaging, D-3). Finally, concurrent access to shared credential files without coordination risks corruption.

### Alternative B: Depend on @backstage/cli-module-auth as npm Dependency

Import auth logic directly from `@backstage/cli-module-auth`.

**Pros:**
- No code duplication — use upstream auth implementation directly
- Automatic upstream bug fixes and protocol updates

**Why rejected:** `@backstage/cli-module-auth` imports from `@internal/cli`, which is a private, unpublished package. Cannot be resolved as an npm dependency outside the Backstage monorepo. Would require either: (a) forking and patching the module to remove `@internal/cli` imports, or (b) vendoring `@internal/cli` code. Both create maintenance burden worse than reimplementing the ~200 lines of auth logic.

### Alternative C: Static Token Only (No OAuth)

Support only pre-provisioned tokens via `BACKSTAGE_TOKEN` environment variable or `--token` flag. No OAuth flow, no browser, fully non-interactive.

**Pros:**
- Fully non-interactive — no human login step required
- Simplest implementation — no OAuth flow, no token refresh, no credential storage

**Why rejected:** Most Backstage instances use identity-aware auth (OIDC, OAuth). Static tokens are either: (a) service account tokens that require admin provisioning, creating a setup barrier, or (b) short-lived tokens that expire and require manual rotation. Not viable as the primary auth mechanism for a general-purpose CLI. May be added later as a supplementary auth method for CI/CD (see G-1).

## Change Log

| Date | Author | Summary |
|------|--------|---------|
| 2026-04-14 | Architect Agent | Initial decision |
