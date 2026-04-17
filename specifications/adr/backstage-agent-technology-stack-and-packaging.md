# ADR: Technology Stack and Packaging for backstage-agent CLI

**Date:** 2026-04-14
**Author:** Architect Agent
**Parent PRD:** [backstage-agent](../prd/backstage-agent.md)
**Related ADRs:** [authentication](backstage-agent-authentication.md), [cli-backend-transport](backstage-agent-cli-backend-transport.md)

---

## Context

The backstage-agent CLI (PRD: `specifications/prd/backstage-agent.md`) requires foundational technology decisions before implementation can begin. The PRD explicitly defers these to the architect:

> "Technology stack and packaging -- Implementation language, framework choices, and delivery mechanism (standalone binary, Backstage CLI module, or both) are Architect decisions."

Key constraints from the PRD:

- **Agent-native**: Non-interactive, structured output (JSON), no stdin prompts. Machine consumption first.
- **Upstream alignment**: The meeting record (2026-04-14) establishes a guiding principle — default to upstream Backstage choices unless there is a strong reason to deviate. Deviations require justification.
- **No special infrastructure**: Must work with any Backstage instance using standard auth. No new backend services.

Research findings on the Backstage CLI module system:

- Modules are discovered from project `devDependencies` via `backstage.role: "cli-module"` in `package.json`.
- `createCliModule()` API is lightweight: registers commands via `addCommand()` callback.
- `@backstage/cli` is designed for project-local use — not global installation or standalone execution. It expects to run within a project context where it discovers modules from local dependencies.
- The Backstage CLI uses TypeScript and Commander.js.
- No existing examples of CLI modules operating outside a Backstage project.

This means the backstage-agent CLI cannot ship as a native `@backstage/cli` module and also work standalone — the module system requires a Backstage project context.

## Decision

### D-1: Implementation Language — TypeScript

TypeScript, targeting Node.js (LTS).

**Rationale:** Aligns with the Backstage ecosystem. The upstream Backstage CLI, all Backstage plugins, and the CLI module system are TypeScript. Using TypeScript means:

- Shared type definitions with Backstage packages (catalog model types, config schemas)
- Contributors familiar with Backstage can contribute without learning a new stack

### D-2: CLI Framework — Commander.js

Use Commander.js for command parsing and help generation.

**Rationale:** The upstream Backstage CLI uses Commander.js. Aligning here means:

- Consistent command patterns and `--help` output format with the Backstage CLI
- No additional framework dependency beyond what Backstage already uses

### D-3: Packaging — Standalone CLI

Ship as a standalone npm package (`backstage-agent`) with its own binary entry point. The CLI does NOT depend on `@backstage/cli` or `@backstage/cli-node` at runtime.

```
backstage-agent/
├── bin/
│   └── backstage-agent          # Entry point
├── src/
│   ├── commands/                 # Commander.js commands
│   │   ├── catalog/
│   │   ├── techdocs/
│   │   └── templates/
│   ├── lib/                      # Shared logic (API clients, formatters)
│   └── index.ts                  # Command registration
└── package.json
```

The PRD suggests the architecture should allow future packaging as a Backstage CLI module (`@backstage/cli-module-agent`). This ADR does not design for that. The CLI module system requires a Backstage project context — modules are discovered from `devDependencies` in a local `package.json`. The primary user (a coding agent) needs organizational context *before* it has a project, which is the opposite of what the module system provides. Designing for module compatibility now would add constraints (portable command contracts, adapter packages) for a scenario that contradicts the tool's core use case. If module packaging becomes relevant, it can be addressed then — TypeScript + Commander.js alignment means the distance is short regardless.

## Consequences

### Positive

- The CLI can be installed globally (`npm install -g backstage-agent`) or via `npx`, working anywhere — no Backstage project required
- Agents can use the CLI immediately without scaffolding a Backstage project
- TypeScript + Commander.js alignment minimizes friction for Backstage contributors

### Negative

- The standalone CLI must implement its own config loading — it cannot reuse `@backstage/cli`'s config infrastructure. Auth is reused via `CliAuth` from `@backstage/cli-node` (see [authentication ADR](backstage-agent-authentication.md)).

### Known Gaps

- **G-1:** ~~Authentication mechanism is not decided.~~ **Resolved** — see [authentication](backstage-agent-authentication.md). Decision: use `CliAuth` from `@backstage/cli-node` for token read/refresh, thin login command for standalone use.
- **G-2:** ~~CLI backend transport (REST vs MCP Actions) is not decided.~~ **Resolved** — see [cli-backend-transport](backstage-agent-cli-backend-transport.md). Decision: REST APIs as primary transport, `@backstage/catalog-client` for catalog, transport abstraction for future MCP support.

## Alternatives Considered

### Alternative A: Go Standalone Binary

Build the CLI as a Go binary (like `gh`, `kubectl`). Single-binary distribution, fast startup, cross-platform compilation.

**Pros:**
- Single binary — no Node.js runtime dependency
- Fast cold start (~10ms vs ~200ms for Node.js)
- Established pattern for developer CLIs (`gh`, `kubectl`, `terraform`)

**Why rejected:** Breaks upstream alignment. The Backstage ecosystem is entirely TypeScript. A Go CLI cannot share type definitions and introduces a language boundary that increases maintenance cost. The cold start advantage is marginal for an agent-consumed CLI where commands are called sequentially, not interactively.

### Alternative B: Native Backstage CLI Module (No Standalone)

Ship exclusively as `@backstage/cli-module-agent`, loaded by `@backstage/cli`.

**Pros:**
- Native integration — commands appear alongside `backstage-cli build`, `backstage-cli test`, etc.
- Inherits `@backstage/cli` config loading, auth, and plugin discovery
- Single package, no adapter needed

**Why rejected:** The Backstage CLI module system requires a project context — modules are discovered from `devDependencies` in a local `package.json`. This means an agent would need a Backstage project scaffolded before it can use the CLI. The PRD's primary user is a coding agent that needs organizational context *before* it has a project — the CLI must work standalone. Additionally, `@backstage/cli` is designed for development tooling workflows (build, test, lint), not runtime API interaction — the usage patterns differ.

### Alternative C: Standalone CLI with Module-Compatible Architecture

Ship standalone but design the internal command architecture to be wrappable as a `@backstage/cli-module-agent` in the future — portable `Command` objects, a separate adapter package, and a command contract that satisfies both entry points.

**Pros:**
- Preserves the upstream CLI module integration path without coupling to it now
- If the module system evolves to support standalone use, the adapter is straightforward

**Why rejected:** Speculative future-proofing. The CLI module system requires a Backstage project context (modules discovered from `devDependencies`), which contradicts the primary use case — agents need organizational context *before* they have a project. Designing for module compatibility adds constraints (portable command contracts, two-package design, ongoing compatibility testing) for a scenario that the Context section's own research shows is impractical. TypeScript + Commander.js alignment already keeps the distance short if module packaging ever becomes relevant.

### Alternative D: oclif Framework

Use Salesforce's oclif framework instead of Commander.js. Provides plugin system, auto-generated help, structured output.

**Pros:**
- Built-in plugin architecture for extensibility
- Auto-generated help and man pages
- Structured JSON output support out of the box

**Why rejected:** Introduces a framework divergence from upstream Backstage (which uses Commander.js). Adding oclif means agents and contributors need to learn two different CLI frameworks when working across Backstage tooling. The oclif plugin system is unnecessary — the CLI is a focused tool, not an extensible platform.

## Change Log

| Date | Author | Summary |
|------|--------|---------|
| 2026-04-14 | Architect Agent | Initial decision |
| 2026-04-15 | Tomas Kral | Drop module-compatible architecture from D-3 — speculative future-proofing that contradicts primary use case |
