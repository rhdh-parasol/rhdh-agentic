## Context

The [backstage-agent PRD](../../../specifications/prd/backstage-agent.md) defines an intent-based CLI for AI coding agents. Three ADRs have already resolved the foundational architecture decisions:

- [Technology Stack](../../../specifications/adr/backstage-agent/technology-stack-and-packaging.md) — TypeScript, Commander.js, standalone npm package
- [CLI Backend Transport](../../../specifications/adr/backstage-agent/cli-backend-transport.md) — REST APIs as primary transport, `@backstage/catalog-client` for catalog, transport abstraction for future MCP support
- [Authentication](../../../specifications/adr/backstage-agent/authentication.md) — `CliAuth` from `@backstage/cli-node` for token read/refresh, thin OAuth PKCE login command

This design builds on those decisions to define the implementation architecture across the five capabilities: `cli-core`, `auth`, `catalog`, `techdocs`, and `templates`.

## Goals / Non-Goals

**Goals:**

- Define the package structure and module boundaries for the CLI
- Establish the command hierarchy and output contract
- Define how the five capabilities compose into a cohesive tool
- Ensure every command follows the agent-native design principles from the PRD

**Non-Goals:**

- Individual command signatures and flags — those belong in capability specs
- Distribution-specific features (RHDH RBAC, dynamic plugins)
- MCP Actions transport implementation (deferred per transport ADR)
- CI/CD pipeline design

## Decisions

### D-1: Package Structure — Single Package, Layered Architecture

```
backstage-agent/
├── bin/backstage-agent              # Entry point
├── src/
│   ├── index.ts                     # Root program, registers command groups
│   ├── commands/
│   │   ├── catalog/                 # catalog list, catalog get, catalog search
│   │   ├── techdocs/                # techdocs search, techdocs read
│   │   ├── templates/               # templates list, templates get, templates execute
│   │   └── auth/                    # auth login, auth status, auth logout
│   ├── lib/                         # Service interfaces + REST implementations
│   │   ├── catalog.ts               # CatalogService interface + RestCatalogService
│   │   ├── techdocs.ts              # TechDocsService interface + RestTechDocsService
│   │   ├── templates.ts             # TemplatesService interface + RestTemplatesService
│   │   └── auth.ts                  # Auth helpers wrapping CliAuth
│   └── output/                      # Output formatting
│       ├── formatter.ts             # JSON / human-readable output switching
│       └── hints.ts                 # Next-step hint generation
├── package.json
└── tsconfig.json
```

Single npm package. Commands import from `lib/` service interfaces, never from transport details directly. The `output/` layer handles all formatting concerns so commands return structured data without worrying about presentation.

**Rationale:** The CLI is a focused tool, not a plugin platform. A single package keeps dependencies, builds, and versioning simple. The layered architecture (commands → lib → transport) matches the transport ADR's abstraction pattern (D-4) and allows swapping REST for MCP later without touching command code.

### D-2: Command Hierarchy — Verb-Noun with Subcommands

```
backstage-agent <group> <action> [args] [flags]
```

Groups map to capabilities:

- `backstage-agent catalog list|get|search`
- `backstage-agent techdocs search|read`
- `backstage-agent templates list|get|execute`
- `backstage-agent auth login|status|logout`

Every command supports:

- `--output json|text` (default: `json`)
- `--backend-url <url>` (override, otherwise from stored auth)
- `--help` (full contract: signature, output schema, trust level, examples)

**Rationale:** Verb-noun pattern matches `gh` CLI and is predictable for agents discovering commands via `--help`. Grouping by pillar maps directly to the Backstage domain model.

### D-3: Output Contract — Structured Envelope

All commands return a consistent JSON envelope:

```json
{
  "data": { ... },
  "hints": ["Try: backstage-agent catalog get <ref>"],
  "trustLevel": "read-only"
}
```

- `data`: command-specific payload
- `hints`: array of next-step suggestions (what to run next)
- `trustLevel`: one of `read-only`, `reversible`, `destructive`, `external`

Errors use a parallel structure:

```json
{
  "error": { "code": "NOT_FOUND", "message": "...", "recovery": "..." },
  "hints": ["Try: backstage-agent catalog search <query>"]
}
```

Exit codes: `0` success, `1` runtime error, `2` usage error. Non-zero exits always produce the error envelope on stderr.

**Rationale:** Agents parse JSON output programmatically. The envelope gives them structured next-step guidance and trust classification without parsing prose. The PRD calls these out explicitly as agent-native design principles.

### D-4: Auth Integration — Delegated to CliAuth

Per the [authentication ADR](../../../specifications/adr/backstage-agent/authentication.md), all commands obtain tokens via `CliAuth.create()` → `auth.getAccessToken()`. The `auth login` command handles the one-time OAuth setup. Commands that need a backend URL resolve it from `--backend-url` flag → `CliAuth` stored instance.

No custom token management code. The `lib/auth.ts` module provides a thin wrapper that creates the authenticated fetch function used by all service implementations.

### D-5: Help as Protocol Contract

`--help` output for each command includes:

- Command signature with all flags
- Output format description (JSON schema summary)
- Trust level classification
- Example invocations
- Related commands (cross-references)

This is the agent's primary discovery mechanism — agents read `--help` cold to understand what the CLI can do. Commander.js supports custom help formatting to inject trust levels and examples beyond the default flag listing.

## Risks / Trade-offs

**[Risk] `@backstage/cli-node` CliAuth API changes** → Pin to a known-good version range. CliAuth is marked `@public`, so breaking changes follow semver. Monitor upstream releases.

**[Risk] Scaffolder/TechDocs REST APIs lack published clients** → Own typed wrappers in `lib/`. Track upstream OpenAPI spec changes. Mitigation: integration tests against a real Backstage instance.

**[Risk] Help-as-contract maintenance burden** → Every command change must update help text with trust level, output schema, and examples. Mitigation: generate help metadata from command definitions rather than hand-writing.

**[Trade-off] Single package vs monorepo** → Single package means lib/ changes ship with command changes (no independent versioning of the transport layer). Acceptable for a focused CLI; revisit if the tool grows significantly.

**[Trade-off] JSON-first output** → Human readability is secondary. Users who want human-readable output must pass `--output text`. This is intentional — the PRD is explicit that the primary consumer is agents.

## Open Questions

- **Config loading**: How does the CLI resolve `--backend-url` default when not passed and no stored auth instance exists? The tech stack ADR notes this as gap G-3. Likely: require `--backend-url` on first use, store it during `auth login`.
- **Pagination**: Catalog queries can return large result sets. Should the CLI paginate automatically or expose `--limit`/`--offset` flags? Likely: expose flags, let the agent decide.
- **Template execution confirmation**: Template execution is a `destructive` trust-level operation that creates resources. Should it require an explicit `--confirm` flag? PRD says non-interactive, but the trust model suggests gating.
