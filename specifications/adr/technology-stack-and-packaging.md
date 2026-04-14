# ADR: Technology Stack and Packaging for backstage-agent CLI

**Date:** 2026-04-14
**Author:** Architect Agent
**Parent PRD:** [backstage-agent](../prd/backstage-agent.md)
**Related ADRs:** [authentication](authentication.md), [cli-backend-transport](cli-backend-transport.md)

---

## Context

The backstage-agent CLI (PRD: `specifications/prd/backstage-agent.md`) requires foundational technology decisions before implementation can begin. The PRD explicitly defers these to the architect:

> "Technology stack and packaging -- Implementation language, framework choices, and delivery mechanism (standalone binary, Backstage CLI module, or both) are Architect decisions."

Key constraints from the PRD:

- **Agent-native**: Non-interactive, structured output (JSON), no stdin prompts. Machine consumption first.
- **Upstream alignment**: The meeting record (2026-04-14) establishes a guiding principle — default to upstream Backstage choices unless there is a strong reason to deviate. Deviations require justification.
- **Backstage CLI module compatibility**: PRD Section 5 notes the Backstage CLI (`@backstage/cli`) has a module system (`createCliModule()` from `@backstage/cli-node`). The PRD requires: "The architecture must allow the agent functionality to be packaged as a Backstage CLI module (`@backstage/cli-module-agent`) in the future."
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
- Future CLI module packaging requires no language bridge
- Contributors familiar with Backstage can contribute without learning a new stack

### D-2: CLI Framework — Commander.js

Use Commander.js for command parsing and help generation.

**Rationale:** The upstream Backstage CLI uses Commander.js. Aligning here means:

- Consistent command patterns and `--help` output format with the Backstage CLI
- Future extraction into a `@backstage/cli-module-agent` module is structurally straightforward — Commander commands map to `addCommand()` registrations
- No additional framework dependency beyond what Backstage already uses

### D-3: Packaging — Standalone CLI, Module-Compatible Architecture

Ship as a standalone npm package (`backstage-agent`) with its own binary entry point. Design the internal command architecture so it can be wrapped as a Backstage CLI module in the future without a rewrite.

Concretely:

- Commands are defined as standalone Commander.js `Command` objects in their own modules
- A thin entry point (`bin/backstage-agent`) creates the program, registers commands, and runs
- A future `@backstage/cli-module-agent` adapter would import the same command modules and register them via `createCliModule()` / `addCommand()`
- The standalone CLI does NOT depend on `@backstage/cli` or `@backstage/cli-node` at runtime

```
backstage-agent/
├── bin/
│   └── backstage-agent          # Standalone entry point
├── src/
│   ├── commands/                 # Commander.js Command objects (portable)
│   │   ├── catalog/
│   │   ├── techdocs/
│   │   └── templates/
│   ├── lib/                      # Shared logic (API clients, formatters)
│   └── index.ts                  # Command registration
└── package.json                  # backstage.role is NOT cli-module
```

A separate future package (`@backstage/cli-module-agent` or similar) would depend on `backstage-agent` and adapt its commands:

```ts
// Future adapter — NOT built now
import { createCliModule } from '@backstage/cli-node';
import { catalogCommands } from 'backstage-agent/commands/catalog';

export default createCliModule({
  packageJson: require('./package.json'),
  init: async registry => {
    for (const cmd of catalogCommands) {
      registry.addCommand(cmd);
    }
  },
});
```

## Consequences

### Positive

- The CLI can be installed globally (`npm install -g backstage-agent`) or via `npx`, working anywhere — no Backstage project required
- Agents can use the CLI immediately without scaffolding a Backstage project
- Module-compatible architecture preserves the upstream integration path without coupling to it now
- TypeScript + Commander.js alignment minimizes friction for Backstage contributors

### Negative

- Two packages will eventually be needed (standalone + CLI module adapter) instead of one
- The standalone CLI must implement its own config loading and auth — it cannot reuse `@backstage/cli`'s config infrastructure
- Maintaining Commander.js command compatibility between the standalone CLI and the future module adapter is an ongoing constraint

### Known Gaps

- **G-1:** Authentication mechanism is not decided. The standalone CLI needs its own auth implementation (static tokens, OIDC, etc.). This is a separate ADR. Blocks: FSD for any command that requires auth.
- **G-2:** ~~CLI backend transport (REST vs MCP Actions) is not decided.~~ **Resolved** — see [cli-backend-transport](cli-backend-transport.md). Decision: REST APIs as primary transport, `@backstage/catalog-client` for catalog, transport abstraction for future MCP support.
- **G-3:** The exact Commander.js command contract for module compatibility is not specified. When the CLI module adapter is built, the command interface may need refinement. Low risk — can be addressed when the adapter is actually needed.

## Alternatives Considered

### Alternative A: Go Standalone Binary

Build the CLI as a Go binary (like `gh`, `kubectl`). Single-binary distribution, fast startup, cross-platform compilation.

**Pros:**
- Single binary — no Node.js runtime dependency
- Fast cold start (~10ms vs ~200ms for Node.js)
- Established pattern for developer CLIs (`gh`, `kubectl`, `terraform`)

**Why rejected:** Breaks upstream alignment. The Backstage ecosystem is entirely TypeScript. A Go CLI cannot share type definitions, cannot be packaged as a Backstage CLI module, and introduces a language boundary that increases maintenance cost. The PRD's requirement for future CLI module compatibility would require maintaining two implementations. The cold start advantage is marginal for an agent-consumed CLI where commands are called sequentially, not interactively.

### Alternative B: Native Backstage CLI Module (No Standalone)

Ship exclusively as `@backstage/cli-module-agent`, loaded by `@backstage/cli`.

**Pros:**
- Native integration — commands appear alongside `backstage-cli build`, `backstage-cli test`, etc.
- Inherits `@backstage/cli` config loading, auth, and plugin discovery
- Single package, no adapter needed

**Why rejected:** The Backstage CLI module system requires a project context — modules are discovered from `devDependencies` in a local `package.json`. This means an agent would need a Backstage project scaffolded before it can use the CLI. The PRD's primary user is a coding agent that needs organizational context *before* it has a project — the CLI must work standalone. Additionally, `@backstage/cli` is designed for development tooling workflows (build, test, lint), not runtime API interaction — the usage patterns differ.

### Alternative C: oclif Framework

Use Salesforce's oclif framework instead of Commander.js. Provides plugin system, auto-generated help, structured output.

**Pros:**
- Built-in plugin architecture for extensibility
- Auto-generated help and man pages
- Structured JSON output support out of the box

**Why rejected:** Introduces a framework divergence from upstream Backstage (which uses Commander.js). The oclif plugin system is redundant — the CLI's extensibility path is through the Backstage CLI module system, not a separate plugin architecture. Adding oclif means agents and contributors need to learn two different CLI frameworks when working across Backstage tooling.

## Change Log

| Date | Author | Summary |
|------|--------|---------|
| 2026-04-14 | Architect Agent | Initial decision |
