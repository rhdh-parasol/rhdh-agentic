## Context

`rhdh-agentic` currently has no automated tests or CI validation. The repo contains OpenSpec artifacts, Backstage catalog entities, software templates, and an emerging CLI (`backstage-agent-cli`, Issue #31). The broader RHDH ecosystem relies on OpenShift CI with ephemeral clusters for E2E testing — a pattern that is slow, non-reproducible locally, and overkill for this repo's content.

`rhdh-local` (see ADR context in `specifications/adr/backstage-agent/`) provides a Docker Compose-based RHDH runtime that runs on any machine with Docker. GitHub Actions runners have Docker pre-installed. `nektos/act` executes GitHub Actions workflows locally using Docker. These three facts enable a unified test environment.

## Goals / Non-Goals

**Goals:**

- Sub-5-minute PR feedback for all validation and integration tests
- Identical test execution across: local dev machine, GitHub Actions, and `act`
- Zero cluster dependencies for the test suite in this repo
- Validate catalog entities, templates, and OpenSpec artifacts on every PR
- Establish reusable patterns for `rhdh-local`-based testing that other RHDH repos can adopt

**Non-Goals:**

- Testing RHDH platform features (auth, RBAC, operator behavior)
- Replacing OpenShift CI in repos that need real cluster infrastructure
- Full Playwright browser testing (too heavy for this repo's scope)

## Decisions

### 1. Three-layer test architecture

**Layer 1 — Static validation (no runtime, ~30s):**
Fast schema and structural checks. Runs first, fails fast.

- `backstage-cli catalog:validate` for catalog entity YAML
- JSON Schema validation for OpenSpec artifacts (proposal, design, specs, tasks)
- Template YAML lint (parameter schemas, valid step actions)
- TypeScript type-checking for CLI code (`tsc --noEmit`)

**Layer 2 — Integration tests against `rhdh-local` (~3-4 min):**
Start `rhdh-local` via Docker Compose, run tests against the live instance.

- Catalog entity registration: POST entities to `/api/catalog/entities`, verify they resolve
- Template dry-run: invoke Software Templates via API, verify parameter validation
- Plugin loading smoke test: verify health endpoint and plugin list
- CLI integration tests (once CLI exists): test commands against the running instance

**Layer 3 — Cluster tests (not in this repo):**
Operator, Route, RBAC, multi-node tests remain in `rhdh-operator` and `rhdh` repos on OpenShift CI.

**Why this over a flat test suite:** Each layer has a different cost/value ratio. Layer 1 catches 80% of issues in seconds. Layer 2 catches integration issues without cluster overhead. Layer 3 is reserved for what truly needs a cluster.

### 2. `rhdh-local` as the CI test runtime

Use `rhdh-local` directly via `docker compose up` in the GitHub Actions workflow. No custom test container image.

**Startup orchestration:**

- `rhdh-local` has no healthcheck on the `rhdh` service — add a wait loop: `curl --retry 30 --retry-delay 2 --retry-all-errors http://localhost:7007/api/health`
- The `install-dynamic-plugins` init container must complete first (handled by `depends_on: service_completed_successfully`)
- Total startup: ~60-90s (plugin install + backend boot)

**Alternative considered:** Building a custom test container with RHDH pre-baked. Rejected — adds maintenance burden and diverges from the runtime developers actually use.

### 3. `act`-first workflow design

Design GitHub Actions workflows with `act` compatibility as a hard constraint. This means:

- **No GitHub-specific magic:** Avoid `actions/cache`, complex matrix strategies, or OIDC tokens in test workflows
- **Self-contained steps:** Each step uses standard Docker images or shell commands
- **Explicit Docker Compose:** Use `docker compose` directly rather than GHA service containers (service containers don't work in `act`)
- **Environment parity:** Pin the `act` runner image in a `.actrc` file so all developers use the same base

**Alternative considered:** Treating `act` as optional/best-effort. Rejected — "works in CI but not locally" defeats the core goal. Making `act` a constraint forces simpler, more portable workflows.

### 4. Test runner: shell scripts + Jest

- **Layer 1 (validation):** Shell scripts wrapping `backstage-cli catalog:validate`, `ajv` for JSON Schema, `tsc`
- **Layer 2 (integration):** Jest with `node-fetch` or `supertest` for API calls against `rhdh-local`. Jest provides structured assertions, test reporting, and is already the ecosystem standard.

**Alternative considered:** Playwright for integration tests. Rejected — no browser UI testing needed. API-level tests are faster and simpler for catalog/template verification.

### 5. Workflow structure

Single workflow file `.github/workflows/test.yml` with two jobs:

```
validate (Layer 1) ──→ integration (Layer 2, needs: validate)
```

`validate` runs unconditionally. `integration` only runs if validation passes and relevant files changed (catalog entities, templates, docker-compose config, CLI code).

**Developer local commands:**

- `make validate` — runs Layer 1 checks
- `make integration` — starts `rhdh-local`, runs Layer 2 tests, tears down
- `make test` — runs both
- `act -j validate` — runs the validation job from the GHA workflow
- `act -j integration` — runs the integration job locally

## Risks / Trade-offs

**[`rhdh-local` startup time in CI]** → ~90s overhead per integration run. Acceptable for PR checks. Mitigate by only running integration job when relevant files change.

**[`act` compatibility constraints limit workflow features]** → Cannot use GHA caching, artifacts upload, or matrix strategies in test workflows. Acceptable — test workflows should be simple. Non-test workflows (release, deploy) are not constrained.

**[`rhdh-local` image version drift]** → Tests may pass against a different RHDH version than production. Mitigate by pinning `RHDH_IMAGE` in test config and updating it as part of version bumps.

**[Docker-in-Docker in `act`]** → `act` runs steps in Docker containers, and `rhdh-local` uses Docker Compose. This requires Docker socket mounting (`-v /var/run/docker.sock`). Works on Linux/macOS but adds complexity. Document in contributing guide.

## Open Questions

- Should we contribute a healthcheck back to `rhdh-local` upstream, or keep it as a test-side concern?
- What OpenSpec JSON Schemas should we validate against? Do they exist, or do we need to define them?
- For CLI integration tests: should the CLI talk to `rhdh-local` or to a mock backend? (Depends on CLI architecture decisions in Issue #31)
