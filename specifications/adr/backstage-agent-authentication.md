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

The Backstage CLI ecosystem provides two relevant packages:

- **`@backstage/cli-node`** (published, `access: "public"`) exports a `CliAuth` class marked `@public`. It handles reading stored credentials from `~/.config/backstage-cli/auth-instances.yaml`, automatic token refresh via `grant_type=refresh_token`, and secret storage (OS keychain via keytar, with file-based fallback at `~/.local/share/backstage-cli/auth-secrets/`). The auth module in `cli-node` is self-contained — it has no dependency on `@internal/cli` or any Backstage project context.

- **`@backstage/cli-module-auth`** implements the OAuth 2.0 login flow (browser-based PKCE) and the `backstage-cli auth login` command. This package depends on `@internal/cli` (private, unpublished), so it cannot be used as a direct npm dependency.

The login ceremony in `cli-module-auth` breaks down as follows:

| Part | Lines | Backstage-specific? | Reuse path |
|------|-------|---------------------|------------|
| PKCE (verifier + S256 challenge) | ~15 | No — standard RFC 7636 crypto | Use `oauth4webapi` or copy from upstream `pkce.ts` |
| Local HTTP callback server | ~70 | No — standard `http.createServer` | Use OAuth library or copy from upstream `localServer.ts` |
| OAuth token exchange | ~20 | No — standard POST to `/v1/token` | Use OAuth library |
| Authorize URL construction | ~15 | Slightly — knows `/api/auth/v1/authorize` path | Trivial to write |
| Interactive instance/URL picker | ~100 | Yes — uses `inquirer` for prompts | Not needed — backstage-agent uses `--backend-url` flag |
| Storage write (`persistInstance`) | ~30 | Yes — writes to backstage-cli YAML + secret store | See below |

The storage write path needs `getSecretStore` and `getAuthInstanceService` from `@internal/cli`. These functions are identical copies in `@backstage/cli-node/src/auth/` (same code, only JSDoc annotations differ) but are not publicly exported — they're marked `@internal`. The `cli-module-auth` package also has its own copy of `storage.ts` with `upsertInstance` and `withMetadataLock`, which duplicates code from `cli-node/src/auth/storage.ts`.

The OAuth PKCE flow itself is standard and does not need to be reimplemented from scratch. An OAuth library like `oauth4webapi` handles the PKCE + token exchange. The only custom code backstage-agent needs is the storage write (~30 lines) and the `--non-interactive` paste-back flow.

**Key constraint from PRD:** The CLI is designed for agent consumption — non-interactive, no stdin prompts. The OAuth browser flow requires human interaction for the `login` step. This is acceptable: login is a one-time setup step. All subsequent commands use stored tokens with automatic refresh.

ADR dependency: `specifications/adr/backstage-agent-technology-stack-and-packaging.md` (D-1: TypeScript, D-3: standalone CLI)

## Decision

### D-1: Use `CliAuth` from `@backstage/cli-node` + Thin Login Command

Use the public `CliAuth` API from `@backstage/cli-node` for token retrieval and refresh. Implement a thin `backstage-agent auth login` command for the OAuth login flow.

**Token retrieval and refresh** — delegated to `CliAuth`:

```typescript
import { CliAuth } from '@backstage/cli-node';

const auth = await CliAuth.create();
const token = await auth.getAccessToken();  // auto-refreshes if expired
const baseUrl = auth.getBaseUrl();
```

`CliAuth` handles all storage reads, token expiry checks, and refresh token exchange internally. backstage-agent writes zero auth logic for this path.

**Login** (`backstage-agent auth login --backend-url <url>`) — OAuth 2.0 Authorization Code + PKCE:

The PKCE flow and token exchange use a standard OAuth library (e.g., `oauth4webapi`). backstage-agent does not reimplement the OAuth protocol. The custom code is limited to storage writes (~30 lines) and the `--non-interactive` paste-back mode.

1. Fetch client metadata from `{backendUrl}/api/auth/.well-known/oauth-client/cli.json`
2. Run OAuth Authorization Code + PKCE flow via library (verifier, challenge, authorize URL, token exchange)
3. Start local HTTP callback server, open browser (or print URL with `--no-browser`)
4. Write tokens to `~/.config/backstage-cli/auth-instances.yaml` and secrets to `~/.local/share/backstage-cli/auth-secrets/` — same paths and format as backstage-cli (reference: upstream [`storage.ts`](https://github.com/backstage/backstage/blob/master/packages/cli-module-auth/src/lib/storage.ts))

**`--non-interactive` mode:** For SSH sessions, remote machines, or environments where a local callback server cannot run:

1. Steps 1–2 same as above (fetch client metadata, generate PKCE challenge)
2. Print the full authorization URL to stdout — no browser opened, no local server started
3. User opens the URL in any browser (same machine or different)
4. After authenticating, the browser redirects to `http://localhost:.../callback?code=...` — the page won't load (no server), but the URL contains the auth code
5. User copies the callback URL from the browser address bar and pastes it into the CLI prompt
6. CLI extracts the authorization code from the pasted URL and exchanges it for tokens
7. Step 6 same as above (write tokens to backstage-cli storage)

This is the same pattern used by `gcloud auth login --no-launch-browser`. It allows login from any environment that has a terminal, even without a local display or network access to localhost.

**Login caveat:** Both login modes are interactive — they require a human to authenticate in a browser. This is a one-time setup step. Once authenticated, all subsequent CLI operations are fully non-interactive, using stored tokens with automatic refresh. Unlike `backstage-cli auth login`, the backstage-agent version skips the interactive instance-picker prompts and uses a `--backend-url` flag instead.

### D-2: Share Credential Storage with Backstage CLI

Write credentials to `~/.config/backstage-cli/` and `~/.local/share/backstage-cli/auth-secrets/` — the same paths used by `backstage-cli`. Read credentials via the `CliAuth` API (versioned npm dependency), not by parsing files directly.

| Scenario | Behavior |
|----------|----------|
| Only backstage-agent installed | `backstage-agent auth login` → works standalone |
| Only backstage-cli installed | `backstage-cli auth login` → backstage-agent reads via `CliAuth` |
| Both installed | Login once with either → both share tokens |
| backstage-cli installed later | Already authenticated — no re-login needed |

**Rationale:** `CliAuth` is a versioned npm API, not a fragile file-format dependency. If upstream changes the storage schema, they update `CliAuth` and backstage-agent gets the fix via `npm update`. This is the same level of coupling as using `@backstage/catalog-client` for catalog operations. `CliAuth` uses `proper-lockfile` internally, so concurrent access is safe.

## Consequences

### Positive

- Token retrieval and refresh require zero custom code — `CliAuth` handles it
- Same OAuth protocol means server-side Backstage auth configuration works for both CLIs without changes
- Users who have backstage-cli installed authenticate once and both tools work
- Standalone users who only have backstage-agent can still authenticate via `auth login`
- Once logged in, all commands are non-interactive — agents operate autonomously
- Upstream-aligned: uses the public API that Backstage provides for this purpose

### Negative

- `auth login` is interactive (browser-based) — agents cannot self-authenticate; a human must run login first
- The login command must write to backstage-cli's storage format (~30 lines of custom code). The storage format is a simple Zod-validated YAML schema, but the write functions (`getSecretStore`, `upsertInstance`) are not publicly exported from `@backstage/cli-node` — they must be copied from upstream
- Depends on `@backstage/cli-node` — adds its transitive dependencies (`@backstage/errors`, `proper-lockfile`, `yaml`, `zod`, etc.)

### Known Gaps

- **G-1:** Static token / service account support for CI/CD and fully headless environments is not included in this decision. When needed, it can be added as an additional auth method (e.g., `BACKSTAGE_TOKEN` env var) without changing the OAuth implementation. This should be addressed before CI/CD use cases.
- **G-2:** Multi-instance management UX (list, select, show, logout) is implied but not specified in detail. `CliAuth` already supports instance selection via `instanceName` option. Command details are FSD scope.

## Alternatives Considered

### Alternative A: Own Credential Storage, Independent from Backstage CLI

Store credentials in `~/.config/backstage-agent/` instead of `~/.config/backstage-cli/`. Implement own token refresh logic.

**Pros:**
- No coupling to backstage-cli storage paths
- Full control over storage format

**Why rejected:** `CliAuth` from `@backstage/cli-node` is a versioned public API that abstracts the storage format. Using it is no more coupling than using `@backstage/catalog-client` for catalog operations. Separate storage means users must authenticate twice for the same Backstage instance — UX friction with no benefit. Would also require reimplementing ~50 lines of token refresh logic that `CliAuth` provides for free.

### Alternative B: Depend on @backstage/cli-module-auth as npm Dependency

Import auth logic directly from `@backstage/cli-module-auth`.

**Pros:**
- No code duplication — use upstream auth implementation directly
- Automatic upstream bug fixes and protocol updates

**Why rejected:** `@backstage/cli-module-auth` imports from `@internal/cli`, which is a private, unpublished package. Cannot be resolved as an npm dependency outside the Backstage monorepo.

### Alternative C: Static Token Only (No OAuth)

Support only pre-provisioned tokens via `BACKSTAGE_TOKEN` environment variable or `--token` flag. No OAuth flow, no browser, fully non-interactive.

**Pros:**
- Fully non-interactive — no human login step required
- Simplest implementation — no OAuth flow, no token refresh, no credential storage

**Why rejected:** Most Backstage instances use identity-aware auth (OIDC, OAuth). Static tokens are either: (a) service account tokens that require admin provisioning, creating a setup barrier, or (b) short-lived tokens that expire and require manual rotation. Not viable as the primary auth mechanism for a general-purpose CLI. May be added later as a supplementary auth method for CI/CD (see G-1).

### Alternative D: Require backstage-cli for Login (No Own Login Command)

Depend entirely on `backstage-cli auth login` for authentication. backstage-agent only reads credentials via `CliAuth` — no login command at all.

**Pros:**
- Zero auth implementation — backstage-agent is purely a credential consumer
- No duplicated login code

**Why rejected:** Creates a hard dependency on backstage-cli for initial setup. The PRD positions backstage-agent as a standalone tool. Users should be able to install and use backstage-agent without installing backstage-cli first.

## Upstream Contribution Opportunity

`@backstage/cli-node` already has the storage write functions (`getSecretStore`, `upsertInstance`, `withMetadataLock`, `getAuthInstanceService`) in `packages/cli-node/src/auth/` — they're just not publicly exported. The same code is duplicated in `@internal/cli` and `@backstage/cli-module-auth`.

Two proposals that would reduce backstage-agent's custom auth code to near-zero:

1. **Export storage write functions as public API** from `@backstage/cli-node` — eliminates the need to copy ~30 lines of storage write code. This also removes the duplication between `cli-node`, `@internal/cli`, and `cli-module-auth`.
2. **Export a `CliAuth.login()` method or standalone login helper** — wraps the OAuth PKCE flow + storage write into a single public API call. Would eliminate all custom auth code in backstage-agent.

## Change Log

| Date | Author | Summary |
|------|--------|---------|
| 2026-04-14 | Architect Agent | Initial decision |
| 2026-04-17 | Architect Agent | Revised D-1/D-2: use `CliAuth` from `@backstage/cli-node` instead of reimplementing auth. Addresses review feedback from @durandom. |
