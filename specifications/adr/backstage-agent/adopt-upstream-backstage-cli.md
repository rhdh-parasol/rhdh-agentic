# ADR: Adopt Upstream backstage-cli

**Date:** 2026-05-12
**Author:** Tomas Kral
**Parent PRD:** [backstage-agent](../../prd/backstage-agent.md)

---

## Context

The [backstage-agent PRD](../../prd/backstage-agent.md) requires agent-accessible, intent-based access to three Backstage pillars: Catalog, TechDocs, and Templates. The PRD defers technology stack, packaging, authentication mechanism, and backend transport to architect decisions.

The project's development principle is **upstream-first**: "Align with Backstage upstream wherever possible."

Upstream Backstage provides two relevant systems:

**[ActionsRegistry](https://backstage.io/docs/backend-system/core-services/actions-registry)** — backend plugins register [actions](https://backstage.io/docs/backend-system/core-services/actions) with typed input/output schemas (Zod). Once registered, actions are automatically available across multiple surfaces without any surface-specific code:

- **CLI** — `backstage-cli actions execute <action-id>` dynamically discovers actions from the server, auto-generates CLI flags from the action's JSON schema via [`schemaToFlags`](https://github.com/backstage/backstage/blob/master/packages/cli-module-actions/src/lib/schemaToFlags.ts), and renders rich `--help` output. Users configure which plugins to query via `actions sources add <plugin-id>`.
- **MCP tools** — the MCP Actions plugin exposes registered actions as MCP tools.
- **Scaffolder steps** — actions can be called from software templates.

The CLI's [`ActionsClient`](https://github.com/backstage/backstage/blob/master/packages/cli-module-actions/src/lib/ActionsClient.ts) queries `/api/{pluginId}/.backstage/actions/v1/actions` at runtime. There is zero CLI-side code per action — the entire contract is the server-side schema.

**`backstage-cli` auth** — `CliAuth` + CIMD handles authentication, token storage, refresh, and multi-instance management.

**Existing upstream actions** already cover the Catalog and Templates pillars:

- **Catalog** — `query-catalog-entities`, `get-catalog-entity`, `validate-entity`, `register-entity`, `unregister-entity`, `get-catalog-model-description` ([coverage analysis](https://github.com/rhdh-parasol/rhdh-agentic/issues/46))
- **Scaffolder** — `execute-template`, `dry-run-template`, `list-scaffolder-tasks`, `get-scaffolder-task-logs`, `list-scaffolder-actions` ([coverage analysis](https://github.com/rhdh-parasol/rhdh-agentic/issues/48))

TechDocs is the only pillar with no upstream actions.

## Decision

### D-1: Use upstream backstage-cli — no custom CLI

Use `backstage-cli` as-is for agent interaction with Backstage. No CLI module, no CLI extension, no standalone CLI tool. The upstream `cli-module-actions` package already provides the generic `actions execute` command that dynamically discovers and invokes any server-side action.

### D-2: Contribute missing capabilities as server-side Backstage Actions

Where upstream lacks functionality the PRD requires, contribute it as server-side [Backstage Actions](https://backstage.io/docs/backend-system/core-services/actions) registered via the [ActionsRegistry](https://backstage.io/docs/backend-system/core-services/actions-registry). Contributing a backend plugin with registered actions is sufficient — the CLI, MCP, and scaffolder surfaces pick them up automatically with no client-side code.

The primary gap is TechDocs: no server-side TechDocs actions exist yet. Contributing a backend module that registers actions like `techdocs:search` and `techdocs:get-content` would make them immediately available via `backstage-cli actions execute techdocs:*` (after `actions sources add techdocs`).

Contributions may also include agent-oriented output enhancements (hints arrays, trust/safety classification) proposed to the upstream actions framework.

## Consequences

### Positive

- **Upstream-first** — contributions benefit all Backstage users, not just RHDH users.
- **Reduced scope** — Catalog and Templates pillars require no implementation. Auth, transport, flag parsing, and action discovery are handled by upstream. Our contributions are purely server-side backend plugins.
- **No divergence risk** — using the same tool the upstream community maintains.
- **Multi-surface** — actions contributed upstream automatically work as CLI commands, MCP tools, and scaffolder steps.

### Negative

- **Release coupling** — delivery is on upstream Backstage's release cadence rather than independent.
- **Upstream acceptance** — contributions (TechDocs actions, output UX enhancements) must be accepted by Backstage maintainers. If rejected, a fallback approach is needed.
- **Reduced control** — agent-specific UX features (hints, trust classification) depend on upstream willingness to extend the actions framework.

### Known Gaps

- **G-1:** TechDocs has no upstream actions. A backend module registering TechDocs actions needs to be contributed. This is the only pillar requiring new server-side code.
- **G-2:** Agent-specific output features (hints arrays, human-readable tables, LLM-optimized formatting) are not part of the upstream actions framework. These may need to be proposed as upstream enhancements or implemented as a thin post-processing layer.
- **G-3:** The Doctor health-check capability ([#49](https://github.com/rhdh-parasol/rhdh-agentic/issues/49)) has no direct upstream equivalent. `who-am-i` verifies auth, but a holistic diagnostic aggregating connectivity, auth, and config checks may need to be contributed or built as a wrapper.

## Alternatives Considered

### Alternative A: Standalone CLI

Build a standalone `backstage-agent` binary with its own command framework (Commander.js), custom OAuth PKCE auth flow, and direct REST transport to Backstage APIs.

**Pros:**

- Full control over UX, release cadence, and feature scope
- No dependency on upstream acceptance of contributions
- Can be installed globally without a Backstage project

**Why rejected:** Reimplements capabilities (catalog queries, template execution, auth, flag parsing) that upstream already provides. Creates a parallel tool that would diverge from upstream over time, increasing long-term maintenance burden. Violates the upstream-first development principle.

### Alternative B: Standalone CLI with ActionsRegistry Transport

Build a standalone CLI binary but use ActionsRegistry as the backend transport instead of direct REST. Fall back to REST where actions aren't available.

**Pros:**

- Maintains release independence and standalone installation
- Leverages upstream actions without full coupling
- Preserves a custom output layer for agent-specific UX features

**Why rejected:** Still maintains a parallel CLI framework (command parsing, flag generation, help output) that duplicates what `backstage-cli` already provides. The ActionsRegistry auto-generates CLI flags from action schemas — reimplementing flag parsing in a separate tool provides no additional value. The marginal benefit of release independence doesn't justify maintaining a separate command framework.

## References

- [Issue #51: Evaluate backstage-agent as backstage-cli module](https://github.com/rhdh-parasol/rhdh-agentic/issues/51)
- [KubeCon EU 2026: State of Backstage in 2026](https://hosted-files.sched.co/kccnceu2026/b7/KubeCon%20EU%202026%20-%20The%20State%20of%20Backstage%20in%202026.pdf) (Ben Lambert & Patrik Oldsberg)
- [Backstage Actions](https://backstage.io/docs/backend-system/core-services/actions) — how to define and register actions
- [ActionsRegistry](https://backstage.io/docs/backend-system/core-services/actions-registry) — server-side action registration service
- [Upstream `ActionsClient`](https://github.com/backstage/backstage/blob/master/packages/cli-module-actions/src/lib/ActionsClient.ts) — CLI-side dynamic action discovery and execution
- [Issue #46: Catalog Pillar upstream coverage analysis](https://github.com/rhdh-parasol/rhdh-agentic/issues/46)
- [Issue #48: Templates Pillar upstream coverage analysis](https://github.com/rhdh-parasol/rhdh-agentic/issues/48)

## Change Log

| Date | Author | Summary |
|------|--------|---------|
| 2026-05-12 | Tomas Kral | Initial decision |
| 2026-05-12 | Tomas Kral | Clarify: server-side actions only, no CLI extension needed |
