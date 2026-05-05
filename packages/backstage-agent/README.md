# backstage-agent

Intent-based CLI for AI coding agents to interact with Backstage. Designed for machine consumption first (structured JSON output, predictable errors), human-readable second.

## Prerequisites

Requires **Backstage v1.48.0+** (`@backstage/plugin-auth-backend` v0.27.0+) with experimental CLI auth enabled in `app-config.yaml`:

```yaml
auth:
  experimentalClientIdMetadataDocuments:
    enabled: true
  experimentalRefreshToken:
    enabled: true
```

### RHDH Limitation

The `auth login` command currently works with **vanilla Backstage** instances only. **Red Hat Developer Hub (RHDH)** does not yet include the `/oauth2/authorize/:id` consent page route in its frontend. The Backstage auth backend redirects the browser to this route during the OAuth flow, but RHDH's Scalprum-based dynamic plugin frontend has no handler for it, resulting in a "page not found" error.

Until RHDH ships the consent page frontend route, use `backstage-agent` against a standard Backstage deployment.

## Quick Start

```bash
# Install dependencies and build
npm install
npm run build

# Authenticate with a Backstage instance
node bin/backstage-agent auth login --backend-url http://localhost:7007

# Verify authentication
node bin/backstage-agent auth whoami
```

## Development

```bash
# Build TypeScript
npm run build

# Run directly (requires build first)
node bin/backstage-agent

# Run tests
npm test

# Watch mode
npm run test:watch

# Type check without emitting
npx tsc --noEmit
```

After making changes, remember to rebuild with `npm run build` — the bin entry point loads from `dist/`.

## Commands

### Auth

| Command | Description | Trust Level |
|---------|-------------|-------------|
| `auth login --backend-url <url>` | Authenticate via OAuth 2.0 + PKCE | reversible |
| `auth whoami` | Show authenticated user identity | read-only |
| `auth status` | List all stored instances | read-only |
| `auth select <name>` | Switch selected instance | reversible |
| `auth logout` | Remove stored credentials | reversible |

### Config

| Command | Description | Trust Level |
|---------|-------------|-------------|
| `config set-trust-policy <level>` | Set trust policy (read-only, reversible, all) | reversible |

### Global Options

| Option | Description | Default |
|--------|-------------|---------|
| `--output <format>` | Output format: `json` or `text` | `json` |
| `--instance <name>` | Target a specific auth instance | selected instance |

## Output Format

All commands produce structured envelopes. Success writes to stdout with exit code `0`:

```json
{
  "data": { ... },
  "hints": ["Try: backstage-agent auth status"],
  "trustLevel": "read-only"
}
```

Errors write to stderr with exit code `1` (runtime) or `2` (usage):

```json
{
  "error": {
    "code": "AUTH_ERROR",
    "message": "Not authenticated",
    "recovery": "Run backstage-agent auth login to authenticate"
  },
  "hints": ["Try: backstage-agent auth login --backend-url <url>"]
}
```

## Credential Storage

Credentials are shared with `backstage-cli` — logging in with either CLI works for both:

| What | Path |
|------|------|
| Instance metadata | `~/.config/backstage-cli/auth-instances.yaml` |
| Access/refresh tokens | `~/.local/share/backstage-cli/auth-secrets/` |
| CLI config (trust policy) | `~/.config/backstage-agent/config.yaml` |

Paths respect `XDG_CONFIG_HOME` and `XDG_DATA_HOME` when set.

## Trust Policy

Commands declare a trust level (`read-only`, `reversible`, `destructive`). The configured trust policy blocks commands that exceed it:

- **read-only** — only allow commands that read data
- **reversible** — allow read-only and reversible commands
- **all** (default) — allow everything

Auth and config commands are exempt from enforcement.

## Architecture

```
src/
  index.ts              # Root Commander program, command registration
  commands/
    auth/
      login.ts          # OAuth 2.0 + PKCE login flow
      whoami.ts          # User identity via /api/auth/v1/userinfo
      status.ts          # List stored instances
      select.ts          # Switch selected instance
      logout.ts          # Remove credentials
    config/
      set-trust-policy.ts
  lib/
    auth.ts             # Authenticated fetch via CliAuth (@backstage/cli-node)
    config.ts           # CLI config (~/.config/backstage-agent/config.yaml)
    instance.ts         # Instance storage (~/.config/backstage-cli/auth-instances.yaml)
    secretStore.ts      # Token storage (~/.local/share/backstage-cli/auth-secrets/)
    pkce.ts             # PKCE verifier/challenge generation
    localServer.ts      # OAuth callback server on port 8055
    trust.ts            # Trust level comparison logic
    enforce.ts          # Trust policy enforcement
    dryrun.ts           # Dry-run framework
    globals.ts          # Global option extraction
  output/
    formatter.ts        # JSON/text envelope formatting
    hints.ts            # Next-step hint helpers
```
