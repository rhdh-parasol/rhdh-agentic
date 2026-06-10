# Plan: High-Level Demo Script (v2)

## Context

The existing `docs/demo-script.md` was written against the retired `backstage-agent` standalone CLI with hardcoded JSON responses. The project has since adopted upstream `backstage-cli` with ActionsRegistry ([ADR](https://github.com/rhdh-parasol/rhdh-agentic/pull/55)). This plan describes a replacement demo script that is:

1. **High-level** — describes *what the agent does and learns*, not exact JSON payloads
2. **Executable** — uses real CLI commands against rhdh-local + Parasol catalog
3. **Durable** — won't break when response shapes change or action parameters evolve

The core narrative is unchanged: an AI coding agent queries a live Backstage catalog before writing code, discovers a cross-domain compliance constraint (IBM MQ, not Kafka), and scaffolds a service that respects it.

### CLI Surface — In Flux

The CLI surface is actively evolving. Three layers are relevant:

| Layer | Status | Example |
|-------|--------|---------|
| `backstage-cli actions execute <action>` | Works today | `backstage-cli actions execute catalog:query-catalog-entities --query '{"kind":"Domain"}'` |
| Intent-based subcommands (RHDHPLAN-1131) | In development | `backstage-cli catalog list --kind=Domain --output=json` |
| TechDocs actions | Requires `techdocs-mcp-extras` plugin | Action IDs TBD (upstream PR [#33412](https://github.com/backstage/backstage/pull/33412)) |

[RHDHPLAN-1131](https://redhat.atlassian.net/browse/RHDHPLAN-1131) calls for intent-based CLI modules (`catalog`, `api`, `search`, `docs`, `template`) contributed upstream. These wrap the `actions execute` layer with human- and agent-friendly subcommands. The intent-based layer is a UX wrapper — the underlying ActionsRegistry is the same.

**Design artifacts:** [agentic-feature-refinement/openspec/changes/agent-cli-backstage](https://github.com/redhat-ai-dev/agentic-feature-refinement/blob/main/openspec/changes/agent-cli-backstage/design.md)

**Implication for this demo script:** Commands in the script use the `actions execute` syntax that works today. Once intent-based subcommands ship, the commands should be updated — the narrative and expected results stay the same.

---

## Target Setup

| Component | Details |
|-----------|---------|
| RHDH instance | rhdh-local at `http://localhost:7007` |
| RHDH image | `quay.io/rhdh-community/rhdh:next` (CI nightly, currently configured in `.env`) |
| Catalog | Parasol Insurance (271 entities: 175 components, 16 APIs, 53 systems, 13 domains) |
| CLI | Upstream `@backstage/cli` — standalone via `NPM_CONFIG_LEGACY_PEER_DEPS=true npx -y @backstage/cli` |
| Auth plugin | `backstage-plugin-auth` from rhdh-plugin-export-overlays (required for CLI auth flow) |
| TechDocs plugin | `techdocs-mcp-extras` installed on the RHDH instance |
| Setup guide | [redhat-developer/rhdh#4901](https://github.com/redhat-developer/rhdh/pull/4901) (Tomas Kral, not yet merged) |

---

## Script Structure

### 1. Overview (brief)

What the demo shows in 3-4 sentences. Same pitch as the old script: the agent reads the software catalog *before* it writes a line of code. It discovers domain-specific rules, existing services to integrate with, and a governance constraint it would never have found by guessing.

### 2. Prerequisites

Concrete, checkable steps:

```bash
# 1. rhdh-local running with Parasol catalog loaded
#    (see catalog/README.md for setup)

# 2. Authenticate
npx backstage-cli auth login --backendUrl http://localhost:7007

# 3. Register action sources
npx backstage-cli actions sources add catalog scaffolder
# + TechDocs source (depends on plugin registration)

# 4. Verify
npx backstage-cli actions list
```

Expected output: catalog actions (6), scaffolder actions (5), TechDocs actions (from plugin).

### 3. The Task

Same brief — a new payment reconciliation service for the Claims domain. This is grounded in entities that exist in the Parasol catalog.

### 4. Workflow Phases

Five phases matching the [design-showcase-agent workflow](../openspec/changes/design-showcase-agent/specs/agent-workflow/spec.md). Each phase has:

- **Narrative** — What the agent is trying to accomplish (2-3 sentences)
- **Commands** — Real CLI commands (no hardcoded output)
- **What to expect** — Prose describing what the response contains
- **Agent reasoning** — What conclusion the agent draws

---

#### Phase 1: Discover

**Narrative:** The agent maps the organizational landscape. It finds the Claims domain, identifies the `claims-payment-system`, and discovers existing services it will integrate with.

**Commands:**

```bash
# List all domains
npx backstage-cli actions execute catalog:query-catalog-entities \
  --query '{"kind": "Domain"}' \
  --fields '["metadata.name", "metadata.description", "spec.owner"]'

# Inspect the Claims domain
npx backstage-cli actions execute catalog:get-catalog-entity \
  --kind Domain --name claims

# Find systems in Claims
npx backstage-cli actions execute catalog:query-catalog-entities \
  --query '{"kind": "System", "relations.partof": "domain:default/claims"}' \
  --fields '["metadata.name", "metadata.description"]'

# Inspect the payment system
npx backstage-cli actions execute catalog:get-catalog-entity \
  --kind System --name claims-payment-system

# Find existing components in claims-payment-system
npx backstage-cli actions execute catalog:query-catalog-entities \
  --query '{"kind": "Component", "relations.partof": "system:default/claims-payment-system"}' \
  --fields '["metadata.name", "metadata.description", "metadata.tags"]'
```

**What to expect:** The agent finds 13+ domains, drills into Claims (6 systems), and locates `claims-payment-system` with its existing components: `claims-settlement-service`, `payment-disbursement-service`, `subrogation-recovery-service`.

**Agent reasoning:** "My new reconciliation service belongs in `claims-payment-system` — that's where settlement and disbursement already live. The owning team is `claims-engineering`."

---

#### Phase 2: Learn

**Narrative:** The agent reads domain handbooks from TechDocs to understand what technology stack is required. This is where the critical cross-domain constraint surfaces.

**Commands:**

```bash
# Read Claims domain handbook
# (exact action ID depends on techdocs-mcp-extras plugin)
npx backstage-cli actions execute <techdocs-read-action> \
  --entityRef domain:default/claims

# Read Billing & Payments domain handbook
npx backstage-cli actions execute <techdocs-read-action> \
  --entityRef domain:default/billing-payments

# Read org-wide platform standards
npx backstage-cli actions execute <techdocs-read-action> \
  --entityRef group:default/parasol-platform-engineering
```

> **Note on TechDocs actions:** The exact action ID depends on the `techdocs-mcp-extras` plugin version installed. Upstream PR [#33412](https://github.com/backstage/backstage/pull/33412) proposes `get-techdocs-content`. Use `npx backstage-cli actions list` to discover the available TechDocs actions on your instance.

**What to expect from Claims handbook:**

- Approved Stack Matrix: Java/Quarkus **required** for transactional services, PostgreSQL **required** as only RDBMS, Kafka/AMQ Streams preferred for domain events
- Mandatory rules: Quarkus for new services, PostgreSQL only, RED metrics, mTLS, Vault for secrets
- Forbidden: Python on settlement/payment paths, non-PostgreSQL databases

**What to expect from Billing & Payments handbook:**

- IBM MQ **required** for ALL payment transaction messaging
- **Kafka explicitly forbidden** on payment paths — PCI-DSS Level 1 compliance requirement
- PCI-DSS Level 1 scope: any service reading/writing payment data

**What to expect from org standards:**

- RED metrics mandatory (http_requests_total, duration, in_flight)
- Structured JSON logging with W3C trace context
- OpenTelemetry auto-instrumentation
- SLO: Claims domain p99 < 500ms

---

### The "Aha Moment"

> This is the central argument of the demo.
>
> The agent's first instinct for consuming payment events would be Kafka — it's the standard async backbone for Claims domain services. But the Billing domain handbook is unambiguous: **Kafka is explicitly forbidden on payment transaction paths**. IBM MQ is required. This is a PCI-DSS Level 1 compliance requirement, not a preference.
>
> The reconciliation service touches payment data from the Billing domain. That integration must use IBM MQ. The catalog is the only place this constraint is documented. Without querying it, the agent would have built the wrong thing.
>
> A generic agent — or a human developer unfamiliar with the Billing domain — would have reached for Kafka by default. The catalog prevented a compliance violation before a line of code was written.

---

#### Phase 3: Reuse

**Narrative:** The agent identifies existing services and APIs it should integrate with rather than rebuild.

**Commands:**

```bash
# Inspect upstream services
npx backstage-cli actions execute catalog:get-catalog-entity \
  --kind Component --name claims-settlement-service

npx backstage-cli actions execute catalog:get-catalog-entity \
  --kind Component --name payment-disbursement-service

# Find relevant APIs
npx backstage-cli actions execute catalog:query-catalog-entities \
  --query '{"kind": "API"}' \
  --fields '["metadata.name", "metadata.description", "spec.owner"]'

# Inspect the audit trail API
npx backstage-cli actions execute catalog:get-catalog-entity \
  --kind API --name audit-trail-api
```

**What to expect:** The agent identifies four integration points:

1. `claims-settlement-service` — source of settlement decisions (upstream, same system)
2. `payment-disbursement-service` — source of executed payment records (uses IBM MQ for Billing integration)
3. Premium Payment API — Billing domain API, PCI-DSS scope
4. Audit Trail API — compliance domain, immutable audit records

**Agent reasoning:** "I now have my integration map. I'll consume from settlement and disbursement services, use the Premium Payment API for payment status, and write reconciliation audit records to the Audit Trail API."

---

#### Phase 4: Scaffold

**Narrative:** The agent selects and executes the appropriate software template based on everything it learned.

**Commands:**

```bash
# List available templates
npx backstage-cli actions execute catalog:query-catalog-entities \
  --query '{"kind": "Template"}' \
  --fields '["metadata.name", "metadata.description", "metadata.tags"]'

# Inspect the Quarkus template parameters
npx backstage-cli actions execute catalog:get-catalog-entity \
  --kind Template --name parasol-quarkus-service

# Execute the template
npx backstage-cli actions execute scaffolder:execute-template \
  --name parasol-quarkus-service \
  --description "Reconciles claim settlement payments against the financial ledger to detect discrepancies and generate audit reports for the finance team." \
  --owner group:default/claims-engineering \
  --system system:default/claims-payment-system
```

**What to expect:** Three templates available (Quarkus, Python, Node.js). The agent selects Quarkus because the Claims domain requires it for transactional services. Template execution produces a Maven project skeleton with REST endpoints, health checks, metrics, OpenTelemetry, and a `catalog-info.yaml`.

**Agent reasoning:** "Quarkus is the only correct choice — the Claims domain handbook requires it for all new transactional services. Python is allowed only for ML/fraud, Node.js only for notification handlers."

---

#### Phase 5: Verify

**Narrative:** The agent confirms the scaffolded service is registered in the catalog with correct ownership, system placement, and dependencies.

**Commands:**

```bash
# Verify catalog registration
npx backstage-cli actions execute catalog:get-catalog-entity \
  --kind Component --name claims-payment-reconciliation-service
```

**What to expect:** The new component is registered with:

- Owner: `group:default/claims-engineering`
- System: `system:default/claims-payment-system`
- Dependencies on the four integration points identified in Phase 3
- Tags including `pci-dss-scope` (because it integrates with Billing domain payment data)

> Note: Registration timing depends on the RHDH instance configuration (SCM integration, manual import). The agent should report pending registration and provide the expected entity reference if not yet visible.

---

### 5. Summary

| Phase | What the agent did | Source of truth |
|-------|-------------------|-----------------|
| Discover | Mapped Claims domain, found claims-payment-system | Catalog entities + relationships |
| Learn | Read domain handbooks, found IBM MQ mandate | TechDocs (Claims + Billing handbooks) |
| Reuse | Identified 4 integration points | Catalog components + APIs |
| Scaffold | Selected Quarkus template, executed it | Software Templates |
| Verify | Confirmed catalog registration | Catalog entity lookup |

Every technology choice — Quarkus, PostgreSQL, IBM MQ, OpenTelemetry, Vault — came from the catalog, not from the agent's training data.

---

## Differences from v1 (`docs/demo-script.md`)

| Aspect | v1 (old) | v2 (this plan) |
|--------|----------|----------------|
| CLI | `backstage-agent` (retired) | `npx backstage-cli actions execute` (upstream) |
| Output | Hardcoded JSON responses (~800 lines) | "What to expect" prose blocks |
| Structure | 9 scenes with presenter notes | 5 workflow phases matching design-showcase-agent spec |
| TechDocs | `backstage-agent techdocs read` | Plugin-provided action (ID discovered at runtime) |
| Durability | Breaks when response shapes change | Survives schema evolution |
| Executable | No (fictional responses) | Yes (real commands against rhdh-local) |

## Open Questions

1. **TechDocs action ID:** The exact action name depends on what ships in `techdocs-mcp-extras` or upstream PR [#33412](https://github.com/backstage/backstage/pull/33412). The script uses `<techdocs-read-action>` as placeholder. Once the plugin is installed, replace with the actual action ID from `backstage-cli actions list`.

2. **Template execution parameters:** The `scaffolder:execute-template` parameters need to match the actual template schema. The ADR demo showed this works but used the Node.js template. Need to verify `parasol-quarkus-service` accepts `--description`, `--owner`, `--system` as flags.

3. **CLI surface transition:** Once RHDHPLAN-1131 delivers intent-based subcommands, all `actions execute` commands in this script should be replaced with their intent-based equivalents (e.g., `backstage-cli catalog list --kind=Domain`). The narrative and expected results stay the same — only the command syntax changes.

4. **Auth plugin availability:** The `backstage-plugin-auth` frontend plugin is required for CLI auth but not included in RHDH by default. Tomas's PR [redhat-developer/rhdh#4901](https://github.com/redhat-developer/rhdh/pull/4901) documents the setup. Need to verify the OCI package tag is compatible with the `:next` image.

## Spike Results (2026-06-03)

Ran a spike against rhdh-local with the Parasol catalog. **Auth is the blocking issue.** Everything else works.

### What works

- **rhdh-local starts** with `quay.io/rhdh-community/rhdh:next` (RHDH 1.11.0, auth-backend 0.27.3)
- **Parasol catalog loads** — all 13+ domains, 53 systems, 175 components, 3 templates visible
- **TechDocs entities** are stitched and processed
- **Catalog is queryable** via direct REST API with guest auth token
- **backstage-cli v0.36.2** installs and runs standalone with `NPM_CONFIG_LEGACY_PEER_DEPS=true`
- **Auth plugin installs** — `backstage-plugin-auth` OCI package loads as dynamic frontend plugin

### What doesn't work

- **`backstage-cli auth login` fails** — the CLI's OAuth2 PKCE flow requires a browser interaction (consent page). Even with guest auth, a human must click "approve" in the browser. No headless/non-interactive auth path exists.

### Root cause details

1. **`NODE_ENV=development` required** — The `CimdClient.validateCimdUrl()` in `@backstage/plugin-auth-backend` only accepts `http://` client IDs when `process.env.NODE_ENV === "development"`. Without this, the URL validation fails silently (swallowed by a try/catch), falls through to the DCR path, and produces the misleading "Invalid client_id" error. This is **not documented** in Tomas's PR #4901.

2. **Browser consent is mandatory** — Even after fixing `NODE_ENV`, the OAuth2 flow redirects to `/oauth2/authorize/:sessionId` where a logged-in user must click "approve". With guest auth there's no password, but the browser step can't be skipped.

3. **No non-interactive auth mode** — `backstage-cli` has no `--token`, `--service-account`, or API-key authentication. The only auth path is the browser-based OAuth2 PKCE flow.

### Setup recipe (for when auth is resolved)

These files were created/modified in rhdh-local:

**`configs/app-config/app-config.local.yaml`** — Parasol catalog + OAuth2 experimental flags + guest auth:

```yaml
auth:
  environment: development
  providers:
    guest:
      dangerouslyAllowOutsideDevelopment: true
  experimentalClientIdMetadataDocuments:
    enabled: true
  experimentalRefreshToken:
    enabled: true
```

**`configs/dynamic-plugins/dynamic-plugins.override.yaml`** — Auth plugin + scaffolder-github:

```yaml
plugins:
  - package: ./dynamic-plugins/dist/backstage-plugin-scaffolder-backend-module-github-dynamic
    disabled: false
  - package: "oci://ghcr.io/redhat-developer/rhdh-plugin-export-overlays/backstage-plugin-auth:<tag>"
    disabled: false
    pluginConfig:
      dynamicPlugins:
        frontend:
          backstage.plugin-auth:
            dynamicRoutes:
              - path: /oauth2/*
                importName: Router
```

**`.env`** — Must include:

```bash
NODE_ENV=development
GITHUB_TOKEN=<token-for-catalog-url-access>
```

### Auth: RESOLVED (2026-06-03)

Switched from guest auth to GitHub OAuth via a dedicated GitHub App. GitHub login works end-to-end. The browser step is still required (OAuth2 PKCE), but with GitHub as the identity provider, the flow works for a human-driven demo.

**Setup:** See [rhdh-local-parasol-setup.md](rhdh-local-parasol-setup.md) for the full reproducible setup, including 9 pitfalls we discovered.

- GitHub org: [rhdh-parasol](https://github.com/rhdh-parasol)
- GitHub App: `rhdh-gh-app-parasol` (App ID: 3951171)
- Dedicated rhdh-local checkout: `rhdh-local-parasol` (clone of redhat-developer/rhdh-local)
- Setup script: `scripts/setup-rhdh-local-parasol.sh`

**Key discoveries during setup:**

1. `backstage-cli create-github-app` does NOT set the OAuth callback URL — must be done manually
2. Backstage config merge REPLACES arrays (including `catalog.locations`) — local overlay must include all locations
3. GitHub auth backend module is built into RHDH `:next` image — do NOT add as dynamic plugin (causes duplicate registration crash)
4. Sign-in resolver must be explicitly configured: `usernameMatchingUserEntityName`
5. User entity with `metadata.name` matching the GitHub username is required
6. Guest auth must be explicitly disabled in the local overlay (base config enables it, deep-merge preserves it)
7. `GITHUB_TOKEN` PAT needed alongside GitHub App — the App only covers `rhdh-parasol` org, but the catalog URL is in `rhdh-parasol/rhdh-agentic`. Add `token: ${GITHUB_TOKEN}` to the `github.com` integration as a fallback.
8. `podman compose restart` does NOT re-read `.env` — must use `up -d --force-recreate`
9. `backend.auth.externalAccess` with a static token needed for API queries without browser auth

### Catalog Loading: VERIFIED (2026-06-03)

Parasol catalog loads successfully with `GITHUB_TOKEN` configured. Verified entity counts:

| Kind | Count |
|------|-------|
| Component | 175 |
| System | 53 |
| API | 16 |
| Domain | 14 |
| Group | 14 |
| Template | 3 |
| User | 1 |
| **Parasol total** | **~276** |
| Package (RHDH extensions) | 140 |
| Plugin (RHDH extensions) | 84 |
| Location | 5 |
| **Grand total** | **505** |

### backstage-cli Auth: VERIFIED (2026-06-03)

`backstage-cli auth login` works end-to-end with GitHub OAuth. Critical fix: the auth frontend plugin must be version `bs_1.49.4__0.1.6` (not `next__0.1.5` — that version has a routing bug where the session ID resolves to `undefined` on the consent page).

```
npx @backstage/cli@0.36.2 auth login --backendUrl http://localhost:7007
# → Opens browser → GitHub OAuth → RHDH consent page → "Login successful"
```

### Demo Script Queries: VERIFIED (2026-06-03)

All Phase 1/3/4 commands from the demo script work via `backstage-cli actions execute`:

| Phase | Command | Result |
|-------|---------|--------|
| 1 Discover | `catalog:query-catalog-entities --query '{"kind":"Domain"}'` | 14 domains returned |
| 1 Discover | `catalog:get-catalog-entity --kind Domain --name claims` | Claims domain with 6 systems, TechDocs ref |
| 3 Reuse | `catalog:query-catalog-entities --query '{"kind":"API"}'` | 16 APIs returned including audit-log-api, premium-payment-api |
| 4 Scaffold | `catalog:query-catalog-entities --query '{"kind":"Template"}'` | 3 templates: parasol-quarkus-service (recommended), python, nodejs |

Phase 2 (Learn/TechDocs) not tested — requires `techdocs-mcp-extras` plugin.
Phase 5 (Verify) not tested — requires template execution.

**Remaining auth options for headless/CI use:**

1. **Static external access token** — `backend.auth.externalAccess` configured with static token (`development`). CLI would need `--token` flag support (doesn't exist today).
2. **Headless approve script** — Programmatically POST to `/api/auth/v1/sessions/:id/approve` to simulate the browser consent. Hacky but works for dev/demo.
3. **Wait for RHDHPLAN-1131** — The intent-based CLI work may include non-interactive auth as part of "standalone execution, no prior setup beyond authentication."

---

## Next: Demo Recording & Showboat Artifact

### Approach

Instead of writing a static demo script document, **run the demo live with Claude Code and capture it**.

1. **Run the demo phases via `claude -p`** with `--output-format stream-json` (or `--stream-json`) to capture structured output. Feed each phase as a prompt — Claude executes the `backstage-cli` commands, reasons about results, and narrates the decisions.

2. **Capture the full session output** — the JSON stream includes tool calls, results, and Claude's reasoning. This is the raw material.

3. **Use `/showboat`** to turn the captured session into a polished demo artifact — a narrative document that tells the story of what the agent did, what it discovered, and why each decision mattered. The showboat artifact lives alongside the spec and serves as proof-of-work for acceptance.

### Why this approach

- **Real, not rehearsed.** The output is from actual CLI commands against a live RHDH instance, not handcrafted JSON.
- **Reproducible.** Anyone with a running rhdh-local-parasol instance can re-run the prompts.
- **Durable.** The narrative survives CLI surface changes — if `actions execute` becomes `catalog list`, only the prompts change, not the story.
- **Acceptance-ready.** The showboat artifact is what a reviewer reads to understand the demo without re-running it.

### Session outline

Prerequisites: rhdh-local-parasol running, `backstage-cli auth login` completed.

```bash
# Phase 1: Discover
claude -p "You are a coding agent about to build a payment reconciliation service for Parasol Insurance.
Use backstage-cli to query the catalog and discover the organizational landscape.
Find the Claims domain, identify the claims-payment-system, and list existing components in it.
Reason about where your new service belongs and who owns it." \
  --output-format stream-json > demo-phase1.jsonl

# Phase 2: Learn (requires techdocs-mcp-extras)
claude -p "Now read the domain handbooks via TechDocs for the Claims and Billing & Payments domains.
What technology stack is required? What constraints exist for payment-path services?
Pay special attention to messaging requirements." \
  --output-format stream-json > demo-phase2.jsonl

# Phase 3: Reuse
claude -p "Identify existing services and APIs you should integrate with rather than rebuild.
Look at claims-settlement-service, payment-disbursement-service, and relevant APIs.
Map your integration points." \
  --output-format stream-json > demo-phase3.jsonl

# Phase 4: Scaffold
claude -p "Select and execute the appropriate software template.
List available templates, choose the right one based on domain requirements,
and explain why the other templates are wrong choices." \
  --output-format stream-json > demo-phase4.jsonl

# Phase 5: Verify
claude -p "Verify the scaffolded service is registered in the catalog with correct ownership,
system placement, and dependencies." \
  --output-format stream-json > demo-phase5.jsonl
```

Then synthesize:

```bash
# Use /showboat to create the narrative artifact from the captured output
# (run in a Claude Code session with access to the .jsonl files)
```

### Recording pipeline (established 2026-06-04)

The capture-to-publish pipeline is working end-to-end:

```
claude -p "<prompt>" \
  --output-format stream-json --verbose \
  --allowedTools 'Bash(*)' 'Read(*)' \
  --max-turns 25 \
  < /dev/null > docs/demo-phaseN.jsonl
```

Key flags:
- `--verbose` is **required** for `stream-json` output (otherwise errors)
- `--allowedTools 'Bash(*)'` is **required** — non-interactive mode has no human to approve permission prompts
- `< /dev/null` avoids "no stdin data" warning

**Transcript generation:** `claude-code-transcripts` does NOT read `stream-json` output — it needs the internal session files at `~/.claude/projects/PROJECT/SESSION_ID.jsonl`. Match via `session_id` field in the stream-json output.

```bash
# Find session ID from capture
grep -o '"session_id":"[^"]*"' docs/demo-phase1.jsonl | head -1

# Generate HTML transcript
uvx claude-code-transcripts json ~/.claude/projects/.../SESSION_ID.jsonl -o OUTPUT_DIR
```

**Publishing:** HTML transcripts go to [rhdh-parasol/demo-transcripts](https://github.com/rhdh-parasol/demo-transcripts) → GitHub Pages at https://rhdh-parasol.github.io/demo-transcripts/. Timestamped index — each run gets a `YYYY-MM-DD/` directory.

**Submodule:** The transcript repo is linked into this repo at `docs/demo-transcripts`. Clone with `--recurse-submodules`.

**Showboat demo:** `docs/demo-catalog-driven-agent.demo.md` — a narrative document built with `uvx showboat` that re-runs the `backstage-cli` commands live and captures real output. This is the human-readable walkthrough; the transcripts are the machine-parseable proof.

### Artifacts produced (2026-06-04)

| Artifact | Path | Purpose |
|----------|------|---------|
| Showboat narrative | `docs/demo-catalog-driven-agent.demo.md` | Human-readable walkthrough with live captured output |
| Phase 1 capture | `docs/demo-phase1.jsonl` | Raw stream-json from Discover phase |
| Phase 2 capture | `docs/demo-phase2.jsonl` | Raw stream-json from Learn phase (TechDocs + IBM MQ) |
| Phase 3 capture | `docs/demo-phase3.jsonl` | Raw stream-json from Reuse phase |
| Phase 4 capture | `docs/demo-phase4.jsonl` | Raw stream-json from Scaffold phase |
| HTML transcripts | `docs/demo-transcripts/` (submodule) | Browsable transcripts on GitHub Pages |

Total capture cost: ~$1.81 across 31 turns (Phase 2: $0.63, 4 turns, 68s).

### Phase 2 unblock: techdocs-mcp-extras plugin (researched 2026-06-08)

The `techdocs-mcp-extras` plugin exists in `redhat-developer/rhdh-plugins` (workspace `mcp-integrations`). It's a backend dynamic plugin that registers three MCP actions:

| Action | Purpose | CLI usage |
|--------|---------|-----------|
| `fetch-techdocs` | List all entities with TechDocs | `actions execute techdocs-mcp-extras:fetch-techdocs` |
| `retrieve-techdocs-content` | Get page content as text | `actions execute techdocs-mcp-extras:retrieve-techdocs-content --entityRef domain:default/claims` |
| `analyze-techdocs-coverage` | Documentation coverage analysis | `actions execute techdocs-mcp-extras:analyze-techdocs-coverage` |

**OCI package** (compatible with RHDH `:next` / Backstage 1.49.4):

```yaml
# Add to rhdh-local-parasol configs/dynamic-plugins/dynamic-plugins.override.yaml
plugins:
  - package: oci://ghcr.io/redhat-developer/rhdh-plugin-export-overlays/red-hat-developer-hub-backstage-plugin-techdocs-mcp-extras:bs_1.49.4__0.2.3!red-hat-developer-hub-backstage-plugin-techdocs-mcp-extras
    disabled: false
```

**App config** (add to `configs/app-config/app-config.local.yaml`):

```yaml
backend:
  actions:
    pluginSources:
      - techdocs-mcp-extras
```

**CLI registration** (after RHDH restart):

```bash
npx @backstage/cli@0.36.2 actions sources add techdocs-mcp-extras
npx @backstage/cli@0.36.2 actions list  # should now show techdocs-mcp-extras actions
```

**Prerequisite:** TechDocs content must be built and available. The Parasol catalog has TechDocs source files at `catalog/techdocs/domains/{claims,billing-payments,...}/docs/index.md` with `mkdocs.yml` configs. The RHDH instance needs to have built these (check TechDocs panel in the UI for the Claims domain entity). If TechDocs haven't been built, the `retrieve-techdocs-content` action will return empty/404.

**Source:** [rhdh-plugins/workspaces/mcp-integrations/plugins/techdocs-mcp-extras](https://github.com/redhat-developer/rhdh-plugins/tree/main/workspaces/mcp-integrations/plugins/techdocs-mcp-extras)

**Note:** The upstream PR [backstage/backstage#33412](https://github.com/backstage/backstage/pull/33412) adds similar actions directly to `techdocs-backend`, but is not yet merged. The RHDH `techdocs-mcp-extras` plugin is the shipped path today.

### Remaining blockers for full demo

| Phase | Blocker | Status |
|-------|---------|--------|
| 1 Discover | None | **Captured** |
| 2 Learn | None | **Captured** (2026-06-08) |
| 3 Reuse | None | **Captured** |
| 4 Scaffold | Inspect-only captured; execution needs template prep | Partial |
| 5 Verify | Depends on Phase 4 execution | Blocked on Phase 4 |

### Handoff checklist for next session

**Phase 4 execution (scaffold a real service):**

- [ ] Verify `parasol-quarkus-service` template parameters (accepted flags)
- [ ] Execute template via `backstage-cli actions execute scaffolder:execute-template`
- [ ] Capture Phase 4 execution via `claude -p`

**Phase 5 verify:**

- [ ] After template execution, verify catalog registration via `backstage-cli`
- [ ] Capture Phase 5 via `claude -p`

**Showboat update:**

- [ ] Update `docs/demo-catalog-driven-agent.demo.md` with Phase 2 section (TechDocs + IBM MQ discovery)
- [ ] Push transcripts to `rhdh-parasol/demo-transcripts` for GitHub Pages

**Previously completed:**

- [x] RHDH running at localhost:7007 with Parasol catalog (505 entities)
- [x] Action sources registered: catalog, scaffolder, techdocs-mcp-extras
- [x] `techdocs-mcp-extras` plugin installed (OCI package `bs_1.49.4__0.2.3`)
- [x] TechDocs built for Claims and Billing & Payments domains
- [x] `RHDH_STATIC_TOKEN` added to `.env` for API access
- [x] Phases 1, 2, 3, 4 captured and published
- [x] Showboat narrative created
- [x] HTML transcripts on GitHub Pages (https://rhdh-parasol.github.io/demo-transcripts/)
