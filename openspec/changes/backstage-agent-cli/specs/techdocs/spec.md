## ADDED Requirements

### Requirement: Search TechDocs

The CLI SHALL provide `backstage-agent techdocs search <query>` that searches across TechDocs content for organizational documentation, ADRs, standards, and compliance requirements.

#### Scenario: Search with results

- **WHEN** a user runs `backstage-agent techdocs search "authentication policy"`
- **THEN** the output envelope `data.results` contains matching documentation pages
- **AND** each result includes `entityRef`, `title`, `path`, and a text `snippet`
- **AND** `hints` suggests `backstage-agent techdocs read <entity-ref> <path>` for the first result

#### Scenario: Search with no results

- **WHEN** a user runs `backstage-agent techdocs search "xyznonexistent"`
- **THEN** the output envelope `data.results` is an empty array

### Requirement: Read TechDocs content

The CLI SHALL provide `backstage-agent techdocs read <entity-ref> [path]` that retrieves the content of a TechDocs page for a given entity. If `path` is omitted, the root page SHALL be returned.

#### Scenario: Read root documentation page

- **WHEN** a user runs `backstage-agent techdocs read component:default/my-service`
- **THEN** the output envelope `data` contains `entityRef`, `title`, `path`, and `content` with the rendered documentation text

#### Scenario: Read specific documentation page

- **WHEN** a user runs `backstage-agent techdocs read component:default/my-service adr/001-auth`
- **THEN** the output envelope `data.content` contains the content of that specific page

#### Scenario: Entity has no TechDocs

- **WHEN** a user runs `backstage-agent techdocs read component:default/no-docs-entity`
- **THEN** the command exits with code `1`
- **AND** the error envelope contains `code: "NOT_FOUND"` with a message indicating no TechDocs exist for this entity

#### Scenario: Documentation page not found

- **WHEN** a user runs `backstage-agent techdocs read component:default/my-service nonexistent/page`
- **THEN** the command exits with code `1`
- **AND** `hints` suggests `backstage-agent techdocs read component:default/my-service` to see the root page

### Requirement: TechDocs commands are read-only

All TechDocs commands (`search`, `read`) SHALL be classified as trust level `read-only`.

#### Scenario: TechDocs search trust level

- **WHEN** `backstage-agent techdocs search "query"` executes
- **THEN** the `trustLevel` field in the output envelope is `read-only`
