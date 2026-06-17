---
name: catalog-explore
description: Query the Backstage software catalog using backstage-cli actions
user_invocable: true
---

# Catalog Explorer

You help developers explore a Backstage software catalog by running catalog query actions via the CLI.

## Tool

All catalog queries use this command pattern:

```bash
NPM_CONFIG_LEGACY_PEER_DEPS=true npx @backstage/cli@0.36.2 actions execute <action-id> [params] --backendUrl http://localhost:7007 2>/dev/null
```

Always include `--backendUrl http://localhost:7007` and redirect stderr to `/dev/null`.

## Available Actions

### `catalog:query-catalog-entities`
Filter and list catalog entities.

Parameters:
- `--query '{"fullTextFilterTerm":"<search>","filter":{"kind":"<Kind>"}}'` — filter by kind, text, or both
- `--fields '["metadata.name","metadata.namespace","spec.owner","spec.type"]'` — select output fields (always use to keep output manageable)

Examples:
```bash
# List all domains
NPM_CONFIG_LEGACY_PEER_DEPS=true npx @backstage/cli@0.36.2 actions execute catalog:query-catalog-entities \
  --query '{"filter":{"kind":"Domain"}}' \
  --fields '["metadata.name","metadata.description","spec.owner"]' \
  --backendUrl http://localhost:7007 2>/dev/null

# List components in a specific system
NPM_CONFIG_LEGACY_PEER_DEPS=true npx @backstage/cli@0.36.2 actions execute catalog:query-catalog-entities \
  --query '{"filter":{"kind":"Component","spec.system":"my-system"}}' \
  --fields '["metadata.name","spec.type","spec.lifecycle","spec.owner"]' \
  --backendUrl http://localhost:7007 2>/dev/null

# Search by text
NPM_CONFIG_LEGACY_PEER_DEPS=true npx @backstage/cli@0.36.2 actions execute catalog:query-catalog-entities \
  --query '{"fullTextFilterTerm":"payment","filter":{"kind":"Component"}}' \
  --fields '["metadata.name","metadata.description","spec.system"]' \
  --backendUrl http://localhost:7007 2>/dev/null
```

### `catalog:get-catalog-entity`
Get full details for a single entity.

Parameters:
- `--kind <Kind>` — entity kind (Component, API, System, Domain, Template, etc.)
- `--name <name>` — entity name
- `--namespace default` — namespace (usually "default")

Example:
```bash
NPM_CONFIG_LEGACY_PEER_DEPS=true npx @backstage/cli@0.36.2 actions execute catalog:get-catalog-entity \
  --kind Component --name my-service --namespace default \
  --backendUrl http://localhost:7007 2>/dev/null
```

### `techdocs-mcp-extras:retrieve-techdocs-content`
Read TechDocs content for an entity (handbooks, ADRs, governance docs).

Parameters:
- `--entityRef <kind:namespace/name>` — full entity reference

Example:
```bash
NPM_CONFIG_LEGACY_PEER_DEPS=true npx @backstage/cli@0.36.2 actions execute techdocs-mcp-extras:retrieve-techdocs-content \
  --entityRef "domain:default/claims" \
  --backendUrl http://localhost:7007 2>/dev/null
```

### `techdocs-mcp-extras:fetch-techdocs`
List all entities that have TechDocs published.

```bash
NPM_CONFIG_LEGACY_PEER_DEPS=true npx @backstage/cli@0.36.2 actions execute techdocs-mcp-extras:fetch-techdocs \
  --backendUrl http://localhost:7007 2>/dev/null
```

## Exploration Strategy

1. **Domains first** — understand the business boundaries
2. **Systems** — find which systems belong to each domain
3. **Components & APIs** — drill into individual services
4. **TechDocs** — read handbooks and governance for context

## Boundaries

This skill queries the catalog only. It does not:
- Scaffold new projects or execute templates
- Modify or register catalog entities
- Make changes to the Backstage instance
