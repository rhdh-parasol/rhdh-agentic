## Why

The RHDH ecosystem currently depends on OpenShift CI (Prow) with ephemeral clusters for E2E testing. This creates slow feedback cycles (minutes to provision clusters), makes tests impossible to reproduce locally, and couples test infrastructure to a specific platform. Meanwhile, `rhdh-local` already provides a Docker Compose-based RHDH runtime that could serve as a universal test target — locally, in GitHub Actions, and via `nektos/act` for local workflow execution. The opportunity is to rethink the test stack from scratch rather than inheriting the existing approach.

## What Changes

- Introduce a layered test architecture: fast validation (no runtime), integration tests (against `rhdh-local`), and cluster-specific tests (OpenShift CI, only where necessary)
- Use `rhdh-local` as the standard test runtime in GitHub Actions workflows, eliminating cluster provisioning for most tests
- Design workflows to be `nektos/act`-compatible, enabling developers to run the full CI pipeline locally with identical results
- Add validation for OpenSpec artifacts, catalog entities, and software templates as a fast first layer
- Establish test patterns for the upcoming `backstage-agent-cli` (ref: PRD `backstage-agent.md`, Issue #31)

## Non-goals

- Replacing OpenShift CI for operator, route, or RBAC tests that genuinely require a cluster
- Achieving coverage parity with `rhdh` or `rhdh-plugins` — this repo has different content (specs, catalog entities, templates, CLI)
- Building a custom test framework — leverage existing tools (Jest, Playwright, `backstage-cli`)

## Capabilities

### New Capabilities

- `local-test-runtime`: Using `rhdh-local` as a containerized test target in CI and locally, including health checks, startup orchestration, and teardown
- `artifact-validation`: Schema and structural validation for OpenSpec artifacts, catalog entities, and software template definitions
- `act-compatible-workflows`: GitHub Actions workflow design patterns that ensure local reproducibility via `nektos/act`

### Modified Capabilities

_(none — no existing spec-level requirements change)_

## Impact

- **CI/CD**: New `.github/workflows/` for validation and integration tests
- **Dependencies**: `rhdh-local` becomes a test dependency (Docker Compose); `act` recommended for local dev
- **Developer workflow**: Tests runnable locally without any cluster access
- **Existing repos**: Patterns established here could be adopted by `rhdh-plugins` and `rhdh-plugin-export-overlays`
