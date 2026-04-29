## ADDED Requirements

### Requirement: List catalog entities

The CLI SHALL provide `backstage-agent catalog list` that retrieves entities from the Backstage software catalog. The command SHALL support filtering by `--kind`, `--type`, `--namespace`, and `--owner` flags.

#### Scenario: List all entities

- **WHEN** a user runs `backstage-agent catalog list`
- **THEN** the output envelope `data` contains an `entities` array with all visible catalog entities
- **AND** each entity includes `metadata.name`, `metadata.namespace`, `kind`, and `spec.type`

#### Scenario: Filter by kind

- **WHEN** a user runs `backstage-agent catalog list --kind Component`
- **THEN** only entities with `kind: Component` are returned

#### Scenario: Filter by multiple criteria

- **WHEN** a user runs `backstage-agent catalog list --kind Component --type service --owner team-a`
- **THEN** only entities matching all specified filters are returned

#### Scenario: No entities match filter

- **WHEN** a user runs `backstage-agent catalog list --kind NonExistent`
- **THEN** the output envelope `data.entities` is an empty array
- **AND** `hints` suggests broadening the filter

### Requirement: Get catalog entity by reference

The CLI SHALL provide `backstage-agent catalog get <entity-ref>` that retrieves a single entity by its entity reference (e.g., `component:default/my-service`). The command SHALL return the full entity including metadata, spec, and relations.

#### Scenario: Get existing entity

- **WHEN** a user runs `backstage-agent catalog get component:default/my-service`
- **THEN** the output envelope `data` contains the full entity object with `metadata`, `spec`, and `relations`

#### Scenario: Entity not found

- **WHEN** a user runs `backstage-agent catalog get component:default/nonexistent`
- **THEN** the command exits with code `1`
- **AND** the error envelope contains `code: "NOT_FOUND"`
- **AND** `hints` suggests `backstage-agent catalog search nonexistent`

#### Scenario: Malformed entity reference

- **WHEN** a user runs `backstage-agent catalog get invalid-ref-format`
- **THEN** the command exits with code `2`
- **AND** the error envelope explains the expected entity reference format

### Requirement: Search catalog entities

The CLI SHALL provide `backstage-agent catalog search <query>` that performs a text search across catalog entities. The command SHALL search across entity names, descriptions, and annotations.

#### Scenario: Search with results

- **WHEN** a user runs `backstage-agent catalog search "payment"`
- **THEN** the output envelope `data.entities` contains entities matching the query
- **AND** `hints` suggests `backstage-agent catalog get <ref>` for the first result

#### Scenario: Search with no results

- **WHEN** a user runs `backstage-agent catalog search "xyznonexistent"`
- **THEN** the output envelope `data.entities` is an empty array
- **AND** `hints` suggests `backstage-agent catalog list` to browse all entities

### Requirement: Catalog commands are read-only

All catalog commands (`list`, `get`, `search`) SHALL be classified as trust level `read-only`.

#### Scenario: Catalog list trust level

- **WHEN** `backstage-agent catalog list` executes
- **THEN** the `trustLevel` field in the output envelope is `read-only`

### Requirement: Pagination support

The `catalog list` and `catalog search` commands SHALL support `--limit` and `--offset` flags to control result pagination.

#### Scenario: Paginated results

- **WHEN** a user runs `backstage-agent catalog list --limit 10 --offset 20`
- **THEN** the output contains at most 10 entities starting from offset 20
- **AND** `data` includes `totalCount` with the total number of matching entities
