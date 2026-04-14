# ADR: CLI Backend Transport

**Date:** 2026-04-14
**Author:** Architect Agent
**Parent PRD:** [backstage-agent](../prd/backstage-agent.md)
**Related ADRs:** [technology-stack-and-packaging](technology-stack-and-packaging.md), [authentication](authentication.md)
**Blocking:** This ADR blocks FSD and epic planning for all pillar commands (catalog, TechDocs, templates). No pillar FSD can be written until this transport decision is made.

---

## Context

The backstage-agent CLI needs to communicate with Backstage to access catalog entities, TechDocs content, and scaffolder templates. The PRD defers the transport decision:

> "CLI backend architecture — Whether the CLI talks to REST APIs, MCP Actions, or both is an Architect decision, not a product decision."

Two transport options exist in the Backstage ecosystem:

**Backstage REST APIs** — Traditional HTTP endpoints per plugin:
- **Catalog:** `/api/catalog/entities`, `/entities/by-query`, etc. OpenAPI 3.1 spec. Published npm client `@backstage/catalog-client` (v1.14+, stable). Constructor requires only a `discoveryApi` (`{ getBaseUrl(pluginId): Promise<string> }`) and optional `fetchApi` — trivially implementable standalone.
- **Scaffolder:** `/api/scaffolder/v2/tasks`, `/v2/actions`, `/v2/templates/*/parameter-schema`, etc. OpenAPI 3.1 spec. No published npm client.
- **TechDocs:** `/api/techdocs/metadata/*`, `/api/techdocs/sync/*`. Limited surface. No published npm client.

**MCP Actions** (RFC [#30218](https://github.com/backstage/backstage/issues/30218)) — Model Context Protocol tools registered via `ActionsRegistryService`:
- Transport: Streamable HTTP (bidirectional streaming over `POST /api/mcp-actions/v1`)
- 11 tools available (5 catalog, 5 scaffolder, 1 auth)
- Client: `@modelcontextprotocol/sdk` (v1.25+) — generic MCP client, not Backstage-specific
- Maturity: Plugin at v0.1.12-next (pre-release). Requires `mcp-actions` plugin installed on the Backstage instance
- SSE transport exists but is deprecated and marked for removal

**Dependency analysis of `@backstage/catalog-client`:**
```
@backstage/catalog-client (common-library, published to npm)
├── @backstage/catalog-model (common-library) → types, validators
│   ├── @backstage/errors → @backstage/types + serialize-error
│   ├── @backstage/types (pure types)
│   └── ajv (JSON Schema validation)
├── @backstage/errors
├── @backstage/filter-predicates
├── cross-fetch
├── lodash
└── uri-template
```
All dependencies are published npm packages with `common-library` role. No backend infrastructure, no plugin system, no Backstage app context required.

**Key PRD constraint:** The CLI is an intent layer above both REST and MCP — "one CLI command may aggregate multiple API calls." The transport is an implementation detail, not a user-facing concern.

## Decision

### D-1: REST APIs as Primary Transport

Use Backstage REST APIs as the primary transport for all pillar commands. Every command talks to Backstage via HTTP REST endpoints.

**Rationale:**
- Catalog REST API is stable and production-proven (v1.14+)
- Scaffolder and TechDocs REST APIs have OpenAPI 3.1 specs — contract is well-defined
- Every Backstage instance exposes REST APIs by default — no additional plugin installation required
- REST is the lowest-common-denominator: works with upstream Backstage, RHDH, and any distribution

### D-2: Use `@backstage/catalog-client` for Catalog Operations

Use the official `@backstage/catalog-client` npm package for catalog commands. Provide a minimal `discoveryApi` implementation that resolves base URLs from CLI configuration.

```typescript
// Minimal discoveryApi for standalone use
const discoveryApi = {
  getBaseUrl: async (pluginId: string) => `${backendUrl}/api/${pluginId}`,
};

const catalogClient = new CatalogClient({
  discoveryApi,
  fetchApi: { fetch: authenticatedFetch },
});
```

For scaffolder and TechDocs, use direct HTTP calls (no published client exists). Define typed wrappers in `lib/` that follow the same pattern as catalog-client.

**Rationale:** The catalog-client dependency chain is clean (all `common-library`, all on npm). It provides typed methods (`getEntities`, `getEntityByRef`, `queryEntities`), proper error handling, and alignment with upstream types (`Entity`, `EntityFilterQuery`). No reason to reimplement what already exists and is well-maintained.

### D-3: No MCP Actions Support Initially — Revisit When Stable

Do not implement MCP Actions transport in the initial release. Revisit when MCP Actions plugin reaches v1.0 and is available by default in Backstage distributions.

**Rationale:** MCP Actions is pre-release (v0.1.12-next), requires an additional plugin to be installed on the Backstage instance, and the transport protocol (Streamable HTTP vs SSE) is still evolving. Adding MCP support now would mean:
- Requiring users to install the `mcp-actions` plugin before using the CLI
- Depending on a pre-release API that may change
- Implementing MCP client protocol for minimal gain (the same data is available via stable REST APIs)

The `lib/` layer should be structured to allow adding MCP as an alternative transport later without changing command logic (see D-4).

### D-4: Transport Abstraction in lib/ Layer

Structure the `lib/` layer so commands depend on typed service interfaces, not on transport details. This allows adding MCP Actions (or other transports) later without changing command implementations.

```typescript
// lib/catalog.ts — service interface
export interface CatalogService {
  getEntities(filter?: EntityFilterQuery): Promise<Entity[]>;
  getEntityByRef(ref: string): Promise<Entity>;
  queryEntities(request: QueryEntitiesRequest): Promise<QueryEntitiesResponse>;
}

// lib/catalog-rest.ts — REST implementation (initial)
export class RestCatalogService implements CatalogService {
  private client: CatalogClient;
  // uses @backstage/catalog-client under the hood
}

// lib/catalog-mcp.ts — MCP implementation (future)
// export class McpCatalogService implements CatalogService { ... }
```

Commands import the service interface, not the implementation. The entry point wires the concrete implementation based on configuration or available transport.

## Consequences

### Positive

- Every Backstage instance works out of the box — no additional plugins required
- Catalog commands get typed, well-tested client for free via `@backstage/catalog-client`
- Stable API contracts (OpenAPI 3.1) reduce risk of breaking changes
- Transport abstraction preserves MCP migration path without current cost
- Unblocks FSD and epic planning for all three pillars immediately

### Negative

- Direct REST dependency means the CLI cannot leverage MCP-specific features (tool discovery, streaming responses) until MCP transport is added
- Using `@backstage/catalog-client` adds Backstage npm packages to the dependency tree (~5 packages). Acceptable for a Backstage-ecosystem tool, but increases the npm footprint
- Scaffolder and TechDocs lack published clients — we must maintain our own typed HTTP wrappers and track upstream API changes manually

### Known Gaps

- **G-1:** Scaffolder and TechDocs API stability is less proven than catalog. If these APIs change, our wrappers break. Mitigation: pin to known-good API versions, test against upstream Backstage nightly.
- **G-2:** MCP Actions transport is deferred. When MCP Actions reaches v1.0, a new ADR should evaluate adding it as an alternative transport behind the service interface (D-4). This is low urgency — REST APIs will continue to work.

## Alternatives Considered

### Alternative A: MCP Actions as Primary Transport

Use MCP protocol (`@modelcontextprotocol/sdk`) for all commands. Connect to `POST /api/mcp-actions/v1` and use tool calls for catalog/scaffolder/TechDocs operations.

**Pros:**
- Aligns with MCP ecosystem direction — future-proof if MCP becomes the standard Backstage API layer
- Single transport protocol for all pillars
- Streaming support for long-running operations (scaffolder tasks)

**Why rejected:** MCP Actions is pre-release (v0.1.12-next) with evolving transport protocol. Requires the `mcp-actions` plugin installed on the target Backstage instance — not all instances have it. TechDocs has no MCP actions yet. Adopting MCP now means depending on unstable APIs and limiting the CLI to MCP-enabled instances only, contradicting the PRD's requirement to work with any Backstage instance.

### Alternative B: Both Transports from Day One

Implement both REST and MCP transport from the start. Auto-detect MCP availability and prefer it when available, fall back to REST.

**Pros:**
- Works everywhere (REST fallback) while leveraging MCP where available
- No future migration needed — both paths exist from the start

**Why rejected:** Doubles the implementation and testing surface for the `lib/` layer with minimal user benefit today. MCP Actions availability is rare in production instances. The transport abstraction (D-4) preserves this option for later without the upfront cost.

### Alternative C: Direct REST Calls Without `@backstage/catalog-client`

Call all Backstage REST endpoints directly with fetch. No Backstage npm dependencies.

**Pros:**
- Zero Backstage dependency footprint — fully standalone
- Complete control over types, error handling, and HTTP behavior

**Why rejected:** Reimplements well-tested, maintained code from `@backstage/catalog-client`. The catalog client's dependency chain is clean (`common-library` packages only, all on npm) and its constructor is trivially satisfiable standalone. The type alignment with `@backstage/catalog-model` (`Entity`, `EntityFilterQuery`, etc.) is valuable — using custom types would create a translation layer that adds complexity with no benefit.

## Change Log

| Date | Author | Summary |
|------|--------|---------|
| 2026-04-14 | Architect Agent | Initial decision |
