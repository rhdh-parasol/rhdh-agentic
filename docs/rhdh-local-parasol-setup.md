# rhdh-local-parasol Setup

A dedicated RHDH local instance wired to the [rhdh-parasol](https://github.com/rhdh-parasol) GitHub org for the Parasol Insurance demo.

## What You Get

- RHDH running at `http://localhost:7007` (community `:next` image)
- GitHub login via the `rhdh-gh-app-parasol` GitHub App (no guest auth)
- `backstage-cli auth login` works (OAuth2 + PKCE flow via browser)
- Parasol Insurance catalog loaded (271 entities: 13 domains, 175 components, 3 templates)
- Scaffolder can create repos on the `rhdh-parasol` org

## Prerequisites

- Podman (or Docker) with compose
- Node.js 18+
- `gh` CLI authenticated
- Owner/admin access to the `rhdh-parasol` GitHub org
- **A fork of `rhdh-parasol/rhdh-agentic`** under your GitHub account

> [!IMPORTANT]
> RHDH loads the Parasol catalog from GitHub via a `GITHUB_TOKEN`. The GitHub
> App is scoped to the `rhdh-parasol` org, so it cannot read the catalog from
> `rhdh-parasol/rhdh-agentic`. Your `GITHUB_TOKEN` (a personal access
> token) must have read access to whichever repo hosts the catalog. The
> simplest path: fork `rhdh-parasol/rhdh-agentic` to your own account and
> use a token that can read your repos. The setup script will ask for your
> GitHub username and configure the catalog URL accordingly.

## Quick Start (GitHub App already exists)

If the GitHub App `rhdh-gh-app-parasol` already exists on the org:

```bash
# 1. Clone
git clone git@github.com:redhat-developer/rhdh-local.git rhdh-local-parasol
cd rhdh-local-parasol

# 2. Run the setup script (creates config files from templates)
../rhdh-agentic/scripts/setup-rhdh-local-parasol.sh

# 3. Get credentials from the GitHub App settings page:
#    https://github.com/organizations/rhdh-parasol/settings/apps/rhdh-gh-app-parasol
#    Fill in AUTH_GITHUB_CLIENT_ID and AUTH_GITHUB_CLIENT_SECRET in .env

# 4. Get the GitHub App credentials file (private key etc.)
#    Either copy from another developer or regenerate:
#    https://github.com/organizations/rhdh-parasol/settings/apps/rhdh-gh-app-parasol
#    Save as configs/github-app-credentials.yaml (see format below)

# 5. Start
podman compose up
```

## Full Setup (from scratch)

### 1. Create the GitHub Org

Create [github.com/rhdh-parasol](https://github.com/rhdh-parasol) (already done).

### 2. Clone rhdh-local

```bash
git clone git@github.com:redhat-developer/rhdh-local.git rhdh-local-parasol
cd rhdh-local-parasol
```

### 3. Create the GitHub App

```bash
NPM_CONFIG_LEGACY_PEER_DEPS=true npx @backstage/cli@0.36.2 create-github-app rhdh-parasol
```

When prompted, select **all three permission sets**:
- Read access to content (catalog ingestion)
- Read access to members (GitHub teams)
- Read and Write to content and actions (scaffolder repo creation)

Complete the browser flow. The command writes a credentials file (e.g., `github-app-rhdh-gh-app-parasol-credentials.yaml`).

```bash
mv github-app-*-credentials.yaml configs/github-app-credentials.yaml
```

**Important: Set the OAuth callback URL** (the `create-github-app` command does NOT set this):

1. Go to https://github.com/organizations/rhdh-parasol/settings/apps/rhdh-gh-app-parasol
2. Set **Callback URL** to: `http://localhost:7007/api/auth/github/handler/frame`
3. Save

> The `create-github-app` command creates an app for API integration (repo access via installation tokens). It doesn't configure the OAuth callback because it wasn't designed for `auth.providers.github` (user login). But every GitHub App doubles as an OAuth App, so we use the same clientId/clientSecret for both — we just need to manually add the callback URL.

### 4. Rename container names in compose.yaml

To avoid conflicts with other rhdh-local instances, change the container names:

```yaml
# In compose.yaml, change:
container_name: rhdh           → container_name: rhdh-parasol
container_name: rhdh-plugins-installer → container_name: rhdh-parasol-plugins-installer
```

### 5. Create `.env`

```bash
cat > .env << 'EOF'
BASE_URL=http://localhost:7007
RHDH_IMAGE=quay.io/rhdh-community/rhdh:next

# From the GitHub App settings page:
# https://github.com/organizations/rhdh-parasol/settings/apps/rhdh-gh-app-parasol
AUTH_GITHUB_CLIENT_ID=<your-client-id>
AUTH_GITHUB_CLIENT_SECRET=<your-client-secret>

# GitHub PAT for catalog URL ingestion (needed because catalog URL points to
# rhdh-parasol/rhdh-agentic, outside the rhdh-parasol GitHub App scope).
# Easiest: use `gh auth token` if you have the gh CLI authenticated.
GITHUB_TOKEN=<your-github-pat>
EOF
```

### 6. Create `configs/catalog-entities/users.override.yaml`

Add a User entity for each developer who needs to log in. The `metadata.name` must match their **GitHub username** exactly.

```yaml
apiVersion: backstage.io/v1alpha1
kind: User
metadata:
  name: durandom
spec:
  profile:
    displayName: Marcel Hild
  memberOf:
    - rhdh-team

---

apiVersion: backstage.io/v1alpha1
kind: Group
metadata:
  name: rhdh-team
  title: RHDH team
spec:
  type: team
  children: []
```

### 7. Create `configs/app-config/app-config.local.yaml`

```yaml
auth:
  environment: development
  providers:
    guest:
      dangerouslyAllowOutsideDevelopment: false
    github:
      development:
        clientId: ${AUTH_GITHUB_CLIENT_ID}
        clientSecret: ${AUTH_GITHUB_CLIENT_SECRET}
        signIn:
          resolvers:
            - resolver: usernameMatchingUserEntityName
  experimentalClientIdMetadataDocuments:
    enabled: true
    allowedClientIdPatterns:
      - "*"
  experimentalRefreshToken:
    enabled: true

integrations:
  github:
    - host: github.com
      token: ${GITHUB_TOKEN}
      apps:
        - $include: ../github-app-credentials.yaml
    - host: github.parasol.com
      token: placeholder
      apiBaseUrl: https://github.parasol.com/api/v3
      rawBaseUrl: https://github.parasol.com/raw

backend:
  auth:
    externalAccess:
      - type: static
        options:
          token: ${RHDH_STATIC_TOKEN}
          subject: external-caller
  reading:
    allow:
      - host: raw.githubusercontent.com

catalog:
  locations:
    - type: file
      target: /opt/app-root/src/configs/catalog-entities/users.override.yaml
      rules:
        - allow: [User, Group]
    - type: url
      target: https://github.com/rhdh-parasol/rhdh-agentic/blob/main/catalog/parasol-catalog-index.yaml
      rules:
        - allow: [Location, Component, API, Domain, Group, System, Template]
```

### 8. Create `configs/dynamic-plugins/dynamic-plugins.override.yaml`

```yaml
includes:
  - dynamic-plugins.default.yaml

plugins:
  # Note: GitHub auth backend module is built into the RHDH :next image
  # Do NOT add it as a dynamic plugin — causes "already registered" conflict

  - package: ./dynamic-plugins/dist/backstage-plugin-scaffolder-backend-module-github-dynamic
    disabled: false
  - package: "oci://ghcr.io/redhat-developer/rhdh-plugin-export-overlays/red-hat-developer-hub-backstage-plugin-techdocs-mcp-extras:next__0.2.3"
    disabled: false
  - package: "oci://ghcr.io/redhat-developer/rhdh-plugin-export-overlays/backstage-plugin-auth:bs_1.49.4__0.1.6"
    disabled: false
    pluginConfig:
      dynamicPlugins:
        frontend:
          backstage.plugin-auth:
            dynamicRoutes:
              - path: /oauth2/*
                importName: Router
```

### 9. Start

```bash
podman compose up
```

RHDH will be available at http://localhost:7007. Click "Sign in with GitHub" to authenticate.

## Using backstage-cli

Once RHDH is running and you've logged in via the browser:

```bash
# Authenticate (opens browser for GitHub OAuth + RHDH consent)
NPM_CONFIG_LEGACY_PEER_DEPS=true npx @backstage/cli@0.36.2 auth login \
  --backendUrl http://localhost:7007

# Register action sources
npx backstage-cli actions sources add catalog scaffolder

# Query the Parasol catalog
npx backstage-cli actions execute catalog:query-catalog-entities \
  --query '{"kind":"Domain"}'
```

## Pitfalls We Hit (and how to avoid them — 10 total)

### 1. GitHub App callback URL not set
**Symptom:** GitHub OAuth redirects fail silently or loop.
**Cause:** `backstage-cli create-github-app` creates the app for API integration only — it doesn't set the OAuth callback URL.
**Fix:** Manually set `http://localhost:7007/api/auth/github/handler/frame` in the GitHub App settings.

### 2. Guest auth leaks through
**Symptom:** Both "Guest" and "GitHub" login buttons appear.
**Cause:** Backstage deep-merges config objects. The base `app-config.yaml` enables guest auth. Our overlay adds GitHub auth but doesn't disable guest.
**Fix:** Explicitly set `guest: { dangerouslyAllowOutsideDevelopment: false }` in the local overlay.

### 3. Catalog locations replaced, not merged
**Symptom:** User entities, templates, or other entities from the base config are missing.
**Cause:** Backstage **replaces** arrays during config merge (deep-merge applies to objects only). When `app-config.local.yaml` defines `catalog.locations`, it completely overwrites the base config's locations.
**Fix:** Include ALL needed locations in `app-config.local.yaml`, including local file references like `users.override.yaml`.

### 4. GitHub auth backend module is built-in
**Symptom:** `Auth provider 'github' was already registered` error, backend shuts down.
**Cause:** The RHDH `:next` image has the GitHub auth backend module (`@backstage/plugin-auth-backend-module-github-provider`) compiled into the backend. Adding it again as a dynamic OCI plugin causes a duplicate registration.
**Fix:** Don't add `backstage-plugin-auth-backend-module-github-provider` to dynamic-plugins. Only the **frontend** auth plugin (`backstage-plugin-auth`) needs to be added as a dynamic plugin.

### 5. Sign-in resolver not configured
**Symptom:** `Login failed; caused by NotFoundError: User not found` — even when the user entity exists in the catalog.
**Cause:** RHDH may not have a default sign-in resolver for the GitHub auth provider. Without explicit configuration, the sign-in resolver silently fails.
**Fix:** Add `signIn.resolvers` to the GitHub auth provider config:
```yaml
github:
  development:
    signIn:
      resolvers:
        - resolver: usernameMatchingUserEntityName
```

### 6. User entity must match GitHub username
**Symptom:** `User not found` after GitHub OAuth succeeds.
**Cause:** The `usernameMatchingUserEntityName` resolver matches the GitHub username to `metadata.name` of a User entity in the catalog. No match = rejected.
**Fix:** Create a User entity where `metadata.name` is the exact GitHub username (e.g., `durandom`).

### 7. Container name conflicts
**Symptom:** `the container name "rhdh" is already in use`.
**Cause:** The upstream `compose.yaml` uses hardcoded container names (`rhdh`, `rhdh-plugins-installer`). Running a second checkout conflicts.
**Fix:** Rename container names in `compose.yaml` to `rhdh-parasol` and `rhdh-parasol-plugins-installer`.

### 8. NODE_ENV=development required
**Symptom:** `Invalid client_id` error during backstage-cli auth.
**Cause:** The auth backend's `CimdClient.validateCimdUrl()` only accepts `http://` client IDs when `NODE_ENV === "development"`. This is already set in `default.env` of recent rhdh-local versions.
**Fix:** Ensure `NODE_ENV=development` is in `.env` or `default.env`.

### 9. GITHUB_TOKEN needed for catalog URL outside GitHub App scope
**Symptom:** `Unable to read url, no matching files found` for the Parasol catalog URL. Only 3 entities load (User + Group + Location).
**Cause:** The catalog URL points to `rhdh-parasol/rhdh-agentic`, but the GitHub App is installed on the `rhdh-parasol` org only. The GitHub App integration can't read repos outside its installed orgs.
**Fix:** Add a `GITHUB_TOKEN` PAT to `.env` and add `token: ${GITHUB_TOKEN}` to the `github.com` integration in `app-config.local.yaml`. The PAT acts as a fallback when the GitHub App doesn't have access. Use `gh auth token` if you have the gh CLI authenticated. **Important:** `podman compose restart` does NOT re-read `.env` — use `podman compose up -d --force-recreate` instead.

### 10. Auth frontend plugin version matters
**Symptom:** The consent page at `/oauth2/authorize/:sessionId` shows "Not Found" (client-side 404). Server logs show a request to `/oauth2/authorize/undefined` immediately after the page loads.
**Cause:** Plugin version `next__0.1.5` has a React Router bug — the session ID path param resolves to `undefined` when mounted via scalprum's dynamic routing.
**Fix:** Use `bs_1.49.4__0.1.6` (or later). See [Tomas's PR](https://github.com/redhat-developer/rhdh/pull/4901) for the reference configuration.

## File Layout

```
rhdh-local-parasol/
├── .env                                          # Credentials (gitignored)
├── compose.yaml                                  # Container orchestration (modified container names)
├── configs/
│   ├── app-config/app-config.local.yaml          # Auth + catalog config (gitignored)
│   ├── catalog-entities/users.override.yaml      # Local users (gitignored)
│   ├── dynamic-plugins/dynamic-plugins.override.yaml  # Plugins (gitignored)
│   └── github-app-credentials.yaml               # GitHub App keys (gitignored)
└── default.env                                   # Defaults (checked in)
```

All sensitive/local files are gitignored. The setup is reproducible via the steps above or `scripts/setup-rhdh-local-parasol.sh`.
