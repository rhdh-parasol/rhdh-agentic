## Why

AI coding agents produce code without organizational context — they guess at technology choices, duplicate existing services, and bypass governance because they cannot see the enterprise software landscape. Backstage already holds this context (catalog, TechDocs, templates) but exposes it through APIs that require agents to understand Backstage internals. An intent-based CLI bridges this gap, giving agents structured access to organizational knowledge. See [backstage-agent PRD](../../../specifications/prd/backstage-agent.md).

## What Changes

- **New CLI tool** (`backstage-agent`): intent-based, non-interactive command-line interface designed for AI coding agent consumption
- **Catalog commands**: discover and inspect components, services, APIs, and their relationships in the Backstage software catalog
- **TechDocs commands**: search and read organizational standards, ADRs, compliance requirements, and technology rationale
- **Template commands**: list available scaffolding templates and execute them to create new components conforming to organizational standards
- **Agent-native design**: structured JSON output by default, informative errors with recovery hints, next-step suggestions, trust-level awareness on all operations
- **Authentication**: connect to any Backstage instance using standard Backstage auth — no special agent infrastructure required

## Non-goals

- **Backstage backend changes** — the CLI consumes existing Backstage APIs; it does not require backend modifications
- **Distribution-specific features** — RHDH dynamic plugin management, RHDH RBAC, and other distribution-specific operations are future scope
- **MCP server implementation** — the CLI is a standalone tool, not an MCP server (though it may use MCP Actions internally)
- **Interactive workflows** — no stdin prompts, wizards, or confirmation dialogs; all input via flags and arguments
- **GUI or web interface** — this change covers the CLI only

## Capabilities

### New Capabilities

- `cli-core`: Core CLI framework — command routing, structured output (JSON/human-readable), help-as-contract system, error handling with recovery hints, next-step suggestions, and trust-level classification
- `auth`: Authentication and connection management — connecting to Backstage instances, token handling, multi-instance support, and RBAC-aware access

### Future Capabilities

Pillar commands to be added in subsequent changes after cli-core and auth are implemented:

- **Catalog** — discover and inspect components, services, APIs, and their relationships
- **TechDocs** — search and read organizational documentation, standards, and ADRs
- **Templates** — list, inspect, and execute scaffolding templates

### Modified Capabilities

_None — this is a new tool with no existing specs to modify._

## Impact

- **New package**: standalone CLI binary built with TypeScript and Commander.js, distributed as an npm package (resolved in [Technology Stack ADR](../../../specifications/adr/backstage-agent/technology-stack-and-packaging.md))
- **Backstage API dependency**: requires a running Backstage instance with catalog, TechDocs, and scaffolder APIs available
- **Auth integration**: must support standard Backstage authentication mechanisms (static tokens, OIDC)
- **CI/CD**: new build pipeline for CLI packaging and distribution
- **Documentation**: new TechDocs site or README for CLI usage, agent integration guides
