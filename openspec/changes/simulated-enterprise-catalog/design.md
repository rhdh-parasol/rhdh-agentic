## Context

The [PRD](../../specifications/prd/simulated-enterprise-catalog.md) calls for a realistic enterprise catalog that AI agents can query for organizational context. The benwilcock/backstage-catalogs repo already provides two catalog layers:

- **Enterprise OSS catalog** (`enterprise/`): 215 entities (156 Components, 31 Systems, 11 Domains, 10 APIs, 7 Groups)
- **Parasol Insurance catalog** (`parasol/`): 271 entities (175 Components, 53 Systems, 16 APIs, 14 Domains, 13 Groups) — a realistic insurance company with claims, underwriting, policy, billing, digital channels, and more

Both layers have rich entity metadata (tags: `java:113`, `python:46`, `rest:157`) and Parasol includes 16 inline OpenAPI 3.0.3 specs in its API entities. However, neither layer has TechDocs or software templates. This change adds the prose and scaffolding layers that agents need to reason about *why* decisions were made and *how* to scaffold new services.

Three FSDs define the scope:

- `specifications/fsd/simulated-enterprise-catalog/catalog-entities.md`
- `specifications/fsd/simulated-enterprise-catalog/techdocs.md`
- `specifications/fsd/simulated-enterprise-catalog/software-templates.md`

## Goals / Non-Goals

**Goals:**

- Add TechDocs to Parasol Insurance catalog entities (domain handbooks, system ADRs, component onboarding guides, org-wide standards)
- Add Software Templates adapted from [redhat-developer/red-hat-developer-hub-software-templates](https://github.com/redhat-developer/red-hat-developer-hub-software-templates) for Parasol's approved stack combinations
- Load the complete catalog (enterprise + Parasol + TechDocs + Templates) via URL references

**Non-Goals:**

- Creating new entity definitions (Parasol entities already exist — 271 total)
- Writing OpenAPI specs (16 inline specs already exist in Parasol API entities)
- Forking or vendoring benwilcock/backstage-catalogs locally
- Patching upstream entity kinds
- Runtime or deployment configuration
- Custom Backstage plugins or RHDH-specific extensions

## Decisions

### 1. Use Parasol Insurance as the business catalog layer

**Decision:** Use benwilcock's existing Parasol Insurance catalog (271 entities) rather than maintaining a separate fictional enterprise (Meridian). "Parasol" is a standard Red Hat marketing brand used across demos.

**Why:** Parasol has 175 Components, 53 Systems, 16 APIs, 14 Domains, and 13 Groups — far richer than our Meridian overlay (20 components). Building our own entity layer duplicated existing work.

**Trade-off:** We don't control the entity definitions — changes require upstream PRs. Acceptable since entities are stable and we pin to a commit SHA.

### 2. URL-based catalog loading

**Decision:** Reference benwilcock/backstage-catalogs via URL (pinned to a specific commit SHA). No local submodule, no patches.

**Why:** Simplest integration. No submodule management, no clone complexity.

**Pinning strategy:** Reference at a specific commit SHA in the catalog config URL. Bump explicitly when upstream changes are desired.

### 3. TechDocs authored for Parasol's insurance domains

**Decision:** Write TechDocs content that matches Parasol's domain structure (claims, underwriting, policy, etc.) rather than generic patterns.

**Why:** TechDocs must reference real entities to be useful. An agent reading a Claims domain handbook needs to see the actual claims components, their approved stacks, and governance rules. Generic TechDocs that don't match the catalog entities provide no agent value.

### 4. Domain-organized TechDocs directory structure

**Decision:** Organize TechDocs by Parasol domain, co-located with or referencing Parasol entity names.

**Why:** Agents discover TechDocs via entity annotations. The directory structure mirrors the domain hierarchy agents traverse.

### 5. Adapt RHDH software-templates rather than authoring from scratch

**Decision:** Base Software Templates on [redhat-developer/red-hat-developer-hub-software-templates](https://github.com/redhat-developer/red-hat-developer-hub-software-templates), adapting existing Quarkus, Spring Boot, and Node.js backend templates for Parasol's domain context.

**Why:** The RHDH templates repo already has production-quality scaffolder templates with catalog-info.yaml skeletons, CI pipelines, and TechDocs wiring. Adapting these for Parasol's domains avoids duplicating scaffolding structure and stays aligned with RHDH's golden-path patterns.

### 6. Leverage existing inline OpenAPI specs

**Decision:** Do not author new OpenAPI specifications. Parasol's 16 API entities in benwilcock/backstage-catalogs already contain inline OpenAPI 3.0.3 definitions (FNOL, Claims Status, Fraud Score, Policy, Premium, etc.).

**Why:** The specs are realistic (2-4 endpoints each, with schemas) and already wired to API entities. Writing new ones would duplicate work. If standalone spec files are needed later, they can be extracted from the inline definitions.

### 7. Template skeletons match Parasol's stack patterns

**Decision:** Software Templates scaffold services using the technology stacks that Parasol's existing services use (Java: 113 components, Python: 46 components, Node.js patterns visible in the catalog).

**Why:** Templates must produce `catalog-info.yaml` files with valid references to entities in the Parasol catalog. Templates for stacks that don't match the existing catalog are inconsistent.

### 8. Template skeletons use Nunjucks templating

**Decision:** Template skeletons use `${{ values.name }}` Nunjucks variables, matching standard Backstage scaffolder v1beta3 conventions.

**Why:** Direct compatibility with the Backstage scaffolder — no custom actions required.

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| benwilcock renames or removes Parasol entities | Pin catalog URL to specific commit SHA; bump explicitly |
| TechDocs annotations require changes to Parasol entity files | Contribute via upstream PR; alternatively maintain annotation overlay |
| Parasol's tech stack choices not explicitly documented in entities | Derive from component tags, descriptions, and language metadata |
| Template skeletons fail pre-commit YAML checks | Add exclude pattern for template skeleton paths |

## Verification Strategy

Verification uses the `/rhdh:rhdh-local` skill to manage a local RHDH instance. The skill handles the customization system (`rhdh-customizations/`), container lifecycle (`rhdh local up/down`), and plugin configuration.

**Loading the catalog into rhdh-local:**

1. Configure catalog locations in `rhdh-customizations/configs/app-config/app-config.local.yaml`:
   - Enterprise OSS: `type: url` pointing to `enterprise-catalog-index.yaml` (pinned to commit SHA)
   - Parasol Insurance: `type: url` pointing to `parasol-catalog-index.yaml` (pinned to commit SHA)
   - TechDocs + Templates: `type: url` or `type: file` for local content
2. Sync and start: `rhdh local apply && rhdh local down && rhdh local up --customized`

**Verification checklist:**

| Check | What to verify | How |
|-------|---------------|-----|
| Catalog ingestion | All layers load without processing errors | Backstage logs show no catalog errors |
| TechDocs rendering | TechDocs tab renders content for annotated entities | Open a Parasol domain entity → TechDocs tab → content visible |
| Software Templates | Templates appear in "Create" section with correct parameter forms | Create → filter by Parasol → templates listed |
| Graph visualization | Entity relations graph shows correct edges | Relations tab shows dependency edges |

**Evidence capture:** Screenshots of each verification check belong in the capability `demo.md` files (created via the showboat skill as required by OpenSpec config rules), not in this design doc.

## Available Resources

| Resource | Location | Value |
|----------|----------|-------|
| RHDH Software Templates (Quarkus, Spring Boot, Node.js, TechDocs) | [redhat-developer/red-hat-developer-hub-software-templates](https://github.com/redhat-developer/red-hat-developer-hub-software-templates) | Skeleton base for templates |
| Parasol Insurance application (Quarkus, data model, seed data) | [redhat-ads-tech/parasol-insurance](https://github.com/redhat-ads-tech/parasol-insurance) | Ground truth for domain-accurate TechDocs |
| Tech Radar dataset (Red Hat/IBM stack, 4 quadrants) | `tech-radar-data.json` in benwilcock/backstage-catalogs | Approved stack data for domain handbooks |
| 16 inline OpenAPI 3.0.3 specs | Parasol API entities in benwilcock/backstage-catalogs | API documentation already written |
| Janus-IDP templates (predecessor patterns) | [janus-idp/software-templates](https://github.com/janus-idp/software-templates) | Additional template patterns |

## Open Questions (Resolved)

- **TechDocs annotation strategy**: ~~Adding `backstage.io/techdocs-ref` annotations to Parasol entities requires either an upstream PR or a local annotation overlay mechanism~~ — Resolved: local annotation overlay in `catalog/overlays/parasol-foundations-annotated.yaml`. Upstream entities loaded via URL; foundations (Groups, Domains, Systems) replaced with annotated versions that add `backstage.io/techdocs-ref` pointing to `catalog/techdocs/` directories.
- **Parasol stack matrix**: ~~Parasol's tag distributions (`java:113`, `python:46`, `rest:157`) and the Tech Radar dataset provide a starting point, but need to map stacks to specific domains before writing domain handbooks~~ — Resolved: stack matrices derived per domain from component tags and Tech Radar data. Each of 6 priority domain handbooks has a complete Approved Stack Matrix with technology, status, count, and rationale.
