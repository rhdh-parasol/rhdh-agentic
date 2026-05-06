## ADDED Requirements

### Requirement: Multi-layer catalog via URL references

The catalog SHALL be composed of multiple layers from benwilcock/backstage-catalogs, loaded via URL (pinned to a specific commit SHA): the enterprise OSS catalog (215 entities: 156 Components, 31 Systems, 11 Domains, 10 APIs, 7 Groups) and the Parasol Insurance catalog (271 entities: 175 Components, 53 Systems, 16 APIs, 14 Domains, 13 Groups). TechDocs and Software Templates SHALL be added as an additional layer.

#### Scenario: All catalog layers load in a single Backstage instance

- **WHEN** all catalog location URLs (enterprise, Parasol, TechDocs/Templates) are registered in a Backstage instance
- **THEN** all entities from all layers load without processing errors and are visible in the catalog UI

### Requirement: Parasol entity coverage

The Parasol Insurance catalog (from benwilcock/backstage-catalogs) provides 13 Groups, 14 Domains, 53 Systems, 175 Components, and 16 APIs covering insurance business domains (claims, underwriting, policy, billing, digital channels, data platform, commercial/specialty, personal lines, life insurance).

#### Scenario: Entity breadth

- **WHEN** entity counts are tallied across the Parasol catalog
- **THEN** there are at least 13 Groups, 14 Domains, 53 Systems, 175 Components, and 16 APIs

#### Scenario: Domain hierarchy is complete

- **WHEN** the catalog is loaded
- **THEN** every System declares a `domain`, every Component declares a `system`, and every entity declares an `owner`

### Requirement: Entity metadata richness

Every Parasol entity SHALL include a description, tags, and an `owner` reference. Service components SHALL additionally declare `dependsOn` references and `providesApi` or `consumesApi` where applicable.

#### Scenario: Component metadata completeness

- **WHEN** any Parasol Component entity's metadata is inspected
- **THEN** it has: description, at least 1 tag, owner ref, system ref, and at least 1 relationship

#### Scenario: Graph traversal from any service component

- **WHEN** an agent traverses relationships from any Parasol service component
- **THEN** it can reach: its owning team, its domain, and related dependencies through standard Backstage relationship traversal

### Requirement: Local deployment via rhdh-local

The catalog SHALL be deployable to a local RHDH instance using the project's rhdh-local tooling (`/rhdh:rhdh-local` skill). The deployment path SHALL be documented in `catalog/README.md` with prerequisites, configuration steps, and verification commands.

#### Scenario: Agent deploys catalog to rhdh-local

- **WHEN** an agent needs to run the catalog locally for development or testing
- **THEN** it can follow `catalog/README.md` to configure and start a local RHDH instance with all catalog layers loaded (enterprise, Parasol, TechDocs, templates)

#### Scenario: Prerequisites are explicit

- **WHEN** an agent reads the deployment documentation
- **THEN** it finds: required tooling (Podman, rhdh-local-setup), configuration steps (app-config merge, catalog location registration), and startup commands

#### Scenario: Known limitations are documented

- **WHEN** an agent reads the deployment documentation
- **THEN** it finds documented limitations (e.g., `github.parasol.com` placeholder integration, template publish steps not functional without GitHub App)
