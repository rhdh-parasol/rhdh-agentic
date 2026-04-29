# Simulated Enterprise Catalog

A realistic enterprise software catalog for Backstage/RHDH with three content layers:

| Layer | Content | Source |
|-------|---------|--------|
| **Catalog Entities** | 271 Parasol Insurance entities + 215 enterprise OSS entities | [benwilcock/backstage-catalogs](https://github.com/benwilcock/backstage-catalogs) (pinned to commit SHA) |
| **TechDocs** | Domain handbooks, system ADRs, org-wide standards | Local content in `techdocs/` |
| **Software Templates** | Quarkus, Python, Node.js service scaffolding | Local content in `templates/` |

## Prerequisites

- **Podman** running (container runtime for RHDH)
- **rhdh-local-setup** initialized via the `/rhdh:rhdh-local` skill
- **rhdh CLI** available (`rhdh local` commands)

## Deploy to rhdh-local

### 1. Merge the catalog app-config

Copy the contents of `app-config.catalog.yaml` into your local RHDH configuration:

```
rhdh-customizations/configs/app-config/app-config.local.yaml
```

This registers three catalog sources:

- **Enterprise OSS catalog** (`type: url`) — 215 entities from benwilcock/backstage-catalogs
- **Parasol Insurance catalog** (`type: url`) — 271 entities via `parasol-catalog-index.yaml`, which loads our annotated foundations overlay + upstream component/API files
- **Software Templates** — 3 templates via `templates-catalog.yaml`

TechDocs content is discovered automatically via `backstage.io/techdocs-ref` annotations on the annotated Parasol entities.

### 2. Apply and start

```bash
rhdh local apply && rhdh local down && rhdh local up --customized
```

### 3. Verify

Open <http://localhost:7007> and check:

| Check | What to verify |
|-------|---------------|
| Catalog ingestion | All entity kinds visible (Components, Systems, Domains, APIs, Groups, Templates) — no processing errors in logs |
| TechDocs rendering | Open a Parasol domain entity (e.g., Claims) → TechDocs tab → handbook content renders |
| Software Templates | Create section → filter by "parasol" → 3 templates listed with parameter forms |
| Entity relations | Relations tab on any Parasol component → dependency edges visible |

Validate all entity YAML offline:

```bash
just catalog-validate
```

## Directory Structure

```
catalog/
  app-config.catalog.yaml          # Backstage app-config fragment (merge into your config)
  parasol-catalog-index.yaml       # Parasol catalog index (annotated overlay + upstream URLs)
  techdocs-catalog.yaml            # TechDocs catalog location (placeholder — content via annotations)
  templates-catalog.yaml           # Software Templates catalog location
  overlays/
    parasol-foundations-annotated.yaml  # Groups, Domains, Systems with techdocs-ref annotations
  techdocs/
    org/                           # Org-wide standards (API conventions, observability, security)
    domains/{domain}/              # Domain handbooks (approved stack, governance, deviations)
    systems/{system}/              # System ADRs
  templates/
    parasol-quarkus-service/       # Java/Quarkus template + skeleton
    parasol-python-service/        # Python/FastAPI template + skeleton
    parasol-nodejs-service/        # Node.js/Express template + skeleton
    skeletons/catalog-info/        # Shared catalog-info.yaml template
```

## Known Limitations

- **`github.parasol.com` placeholder**: Upstream Parasol entities reference a fictional GitHub Enterprise host. The app-config includes a placeholder integration to suppress Backstage SCM warnings. Source links (View Source, Edit) do not resolve. See [#35](https://github.com/rhdh-parasol/rhdh-agentic/issues/35).
- **Template publish steps**: Templates scaffold project skeletons but do not publish to GitHub or register in the catalog. Adding `publish:github` and `register:catalog` steps requires GitHub App integration. See [#35](https://github.com/rhdh-parasol/rhdh-agentic/issues/35).
- **TechDocs build**: TechDocs rendering in RHDH requires the `techdocs-core` mkdocs plugin. The local RHDH container includes this by default.

## Specs

- [catalog-entities/spec.md](../openspec/specs/catalog-entities/spec.md)
- [techdocs/spec.md](../openspec/specs/techdocs/spec.md)
- [software-templates/spec.md](../openspec/specs/software-templates/spec.md)
