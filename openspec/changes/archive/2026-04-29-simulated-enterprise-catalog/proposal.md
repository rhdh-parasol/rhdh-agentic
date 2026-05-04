## Why

AI coding agents need organizational context — approved stacks, domain boundaries, rationale — to make grounded architecture proposals. The best community catalog ([benwilcock/backstage-catalogs](https://github.com/benwilcock/backstage-catalogs)) provides two layers: ~156 OSS infrastructure entities and ~100+ fictional business entities (Parasol Insurance). However, it lacks the prose layer agents need: no TechDocs, no software templates, no OpenAPI specs. Without these, agents can discover *what exists* but not *why* decisions were made or *how* to scaffold new services. This change fills that gap (ref: [PRD](../../specifications/prd/simulated-enterprise-catalog.md)).

## What Changes

- **TechDocs for Parasol Insurance catalog**: Domain handbooks with Approved Stack Matrix and governance rules, system ADRs, component onboarding guides, org-wide standards — attached to Parasol's existing catalog entities
- **Software Templates**: Governed scaffolding templates adapted from [redhat-developer/red-hat-developer-hub-software-templates](https://github.com/redhat-developer/red-hat-developer-hub-software-templates) for Parasol's approved stack combinations, with skeleton projects and template TechDocs

## Non-goals

- Creating new catalog entity definitions (Parasol entities already exist in benwilcock's repo)
- Writing OpenAPI specifications (16 inline specs already exist in benwilcock's Parasol API entities)
- Runtime environment or deployment configuration
- Backstage Agent CLI implementation (separate PRD)
- Custom Backstage plugins or distribution-specific extensions

## Capabilities

### New Capabilities

- `catalog-entities`: Integration with benwilcock/backstage-catalogs Parasol Insurance catalog (271 entities: 175 Components, 53 Systems, 16 APIs, 14 Domains, 13 Groups) — loading configuration and cross-referencing
- `techdocs`: TechDocs content attached to Parasol catalog entities — domain handbooks, system ADRs, component onboarding guides, and org-wide standards. Source material: 16 existing inline OpenAPI specs, tag distributions (`java:113`, `python:46`), and [redhat-ads-tech/parasol-insurance](https://github.com/redhat-ads-tech/parasol-insurance) application code
- `software-templates`: Backstage Software Templates adapted from [redhat-developer/red-hat-developer-hub-software-templates](https://github.com/redhat-developer/red-hat-developer-hub-software-templates) for Parasol's approved stack combinations

### Modified Capabilities

*None — no existing specs.*

## Impact

- TechDocs content and Software Templates added to Parasol Insurance catalog (contributed upstream or maintained locally)
- benwilcock/backstage-catalogs referenced via URL (pinned to specific commit) for entity definitions
