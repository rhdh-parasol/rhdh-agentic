#!/usr/bin/env bash
# Setup script for rhdh-local-parasol
# Clones rhdh-local and configures it for the rhdh-parasol GitHub org.
#
# Usage:
#   ./scripts/setup-rhdh-local-parasol.sh [target-dir]
#
# Default target: ../rhdh-local-parasol (sibling of rhdh-agentic)
#
# Prerequisites:
#   - GitHub App "rhdh-gh-app-parasol" created on the rhdh-parasol org
#     (see docs/rhdh-local-parasol-setup.md for full instructions)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
AGENTIC_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TARGET="${1:-$(cd "$AGENTIC_DIR/.." && pwd)/rhdh-local-parasol}"

echo "==> Setting up rhdh-local-parasol at: $TARGET"

# Step 1: Clone if not already present
if [ -d "$TARGET/.git" ]; then
  echo "    Directory already exists, skipping clone."
else
  echo "    Cloning redhat-developer/rhdh-local..."
  git clone git@github.com:redhat-developer/rhdh-local.git "$TARGET"
fi

cd "$TARGET"

# Step 2: Rename container names in compose.yaml to avoid conflicts with rhdh-local
if grep -q 'container_name: rhdh$' compose.yaml 2>/dev/null; then
  echo "    Renaming container names in compose.yaml..."
  sed -i.bak 's/container_name: rhdh$/container_name: rhdh-parasol/' compose.yaml
  sed -i.bak 's/container_name: rhdh-plugins-installer/container_name: rhdh-parasol-plugins-installer/' compose.yaml
  rm -f compose.yaml.bak
else
  echo "    Container names already customized, skipping."
fi

# Step 3: Create .env (if not present)
if [ -f .env ]; then
  echo "    .env already exists, skipping."
else
  cat > .env << 'ENVEOF'
BASE_URL=http://localhost:7007
RHDH_IMAGE=quay.io/rhdh-community/rhdh:next

# GitHub App OAuth credentials for user login
# Get from: https://github.com/organizations/rhdh-parasol/settings/apps/rhdh-gh-app-parasol
AUTH_GITHUB_CLIENT_ID=
AUTH_GITHUB_CLIENT_SECRET=

# GitHub PAT for catalog URL ingestion (needed because catalog URL points to
# rhdh-parasol/rhdh-agentic, outside the rhdh-parasol GitHub App scope).
# Easiest: use 'gh auth token' if you have the gh CLI authenticated.
GITHUB_TOKEN=
ENVEOF
  # Auto-populate GITHUB_TOKEN from gh auth if available
  if command -v gh &>/dev/null && gh auth status &>/dev/null; then
    GH_TOKEN=$(gh auth token 2>/dev/null)
    if [ -n "$GH_TOKEN" ]; then
      sed -i.bak "s|^GITHUB_TOKEN=.*|GITHUB_TOKEN=${GH_TOKEN}|" .env
      rm -f .env.bak
      echo "    Created .env — GITHUB_TOKEN auto-populated from gh auth"
    fi
  fi
  echo "    Created .env — fill in AUTH_GITHUB_CLIENT_ID and AUTH_GITHUB_CLIENT_SECRET"
fi

# Step 4: Create users.override.yaml
if [ -f configs/catalog-entities/users.override.yaml ]; then
  echo "    users.override.yaml already exists, skipping."
else
  GITHUB_USER=$(gh api /user --jq '.login' 2>/dev/null || echo "your-github-username")
  DISPLAY_NAME=$(gh api /user --jq '.name // .login' 2>/dev/null || echo "Your Name")
  cat > configs/catalog-entities/users.override.yaml << YAMLEOF
apiVersion: backstage.io/v1alpha1
kind: User
metadata:
  name: ${GITHUB_USER}
spec:
  profile:
    displayName: ${DISPLAY_NAME}
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
YAMLEOF
  echo "    Created users.override.yaml for GitHub user: ${GITHUB_USER}"
fi

# Step 5: Create app-config.local.yaml
if [ -f configs/app-config/app-config.local.yaml ]; then
  echo "    app-config.local.yaml already exists, skipping."
else
  cat > configs/app-config/app-config.local.yaml << 'YAMLEOF'
# rhdh-local-parasol app config overlay
# Configures: GitHub auth, backstage-cli OAuth2, Parasol catalog, GitHub integration

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

  # OAuth2 endpoints for backstage-cli auth login
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
    # Parasol catalog entities reference this fictional host
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

# IMPORTANT: Backstage REPLACES arrays during config merge (not append).
# This catalog.locations replaces the base config's locations entirely.
# Include everything you need here.
catalog:
  locations:
    # Local users — metadata.name must match GitHub username for sign-in resolver
    - type: file
      target: /opt/app-root/src/configs/catalog-entities/users.override.yaml
      rules:
        - allow: [User, Group]

    # Parasol Insurance catalog (271 entities + TechDocs + Templates)
    - type: url
      target: https://github.com/rhdh-parasol/rhdh-agentic/blob/main/catalog/parasol-catalog-index.yaml
      rules:
        - allow: [Location, Component, API, Domain, Group, System, Template]
YAMLEOF
  echo "    Created configs/app-config/app-config.local.yaml"
fi

# Step 6: Create dynamic-plugins.override.yaml
if [ -f configs/dynamic-plugins/dynamic-plugins.override.yaml ]; then
  echo "    dynamic-plugins.override.yaml already exists, skipping."
else
  cat > configs/dynamic-plugins/dynamic-plugins.override.yaml << 'YAMLEOF'
# Dynamic plugin overrides for rhdh-local-parasol
includes:
  - dynamic-plugins.default.yaml

plugins:
  # Note: GitHub auth backend module is built into the RHDH :next image
  # Do NOT add it as a dynamic plugin — causes "already registered" conflict

  # Scaffolder GitHub module — creates repos on rhdh-parasol org
  - package: ./dynamic-plugins/dist/backstage-plugin-scaffolder-backend-module-github-dynamic
    disabled: false

  # Auth frontend plugin — serves OAuth2 consent page for backstage-cli auth login
  - package: "oci://ghcr.io/redhat-developer/rhdh-plugin-export-overlays/backstage-plugin-auth:bs_1.49.4__0.1.6"
    disabled: false
    pluginConfig:
      dynamicPlugins:
        frontend:
          backstage.plugin-auth:
            dynamicRoutes:
              - path: /oauth2/*
                importName: Router
YAMLEOF
  echo "    Created configs/dynamic-plugins/dynamic-plugins.override.yaml"
fi

# Step 7: Check for GitHub App credentials
if [ -f configs/github-app-credentials.yaml ]; then
  echo "    GitHub App credentials found."
else
  echo ""
  echo "!!! GitHub App credentials missing!"
  echo ""
  echo "    Option A — Create a new app (if none exists on the org):"
  echo "      NPM_CONFIG_LEGACY_PEER_DEPS=true npx @backstage/cli@0.36.2 create-github-app rhdh-parasol"
  echo "      mv github-app-*-credentials.yaml configs/github-app-credentials.yaml"
  echo ""
  echo "    Then MANUALLY set the OAuth callback URL:"
  echo "      1. Go to https://github.com/organizations/rhdh-parasol/settings/apps/rhdh-gh-app-parasol"
  echo "      2. Set Callback URL to: http://localhost:7007/api/auth/github/handler/frame"
  echo "      3. Save"
  echo ""
  echo "    Option B — Copy from another developer:"
  echo "      cp /path/to/existing/github-app-credentials.yaml configs/github-app-credentials.yaml"
  echo ""
fi

echo ""
echo "==> Setup complete. Next steps:"
echo "    1. Ensure configs/github-app-credentials.yaml exists"
echo "    2. Fill in AUTH_GITHUB_CLIENT_ID and AUTH_GITHUB_CLIENT_SECRET in .env"
echo "    3. Run: podman compose up"
echo "    4. Open http://localhost:7007 and sign in with GitHub"
