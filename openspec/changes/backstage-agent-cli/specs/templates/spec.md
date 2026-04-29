## ADDED Requirements

### Requirement: List available templates

The CLI SHALL provide `backstage-agent templates list` that retrieves all available software templates from the Backstage scaffolder.

#### Scenario: List templates

- **WHEN** a user runs `backstage-agent templates list`
- **THEN** the output envelope `data.templates` contains an array of available templates
- **AND** each template includes `name`, `title`, `description`, and `entityRef`
- **AND** `hints` suggests `backstage-agent templates get <entity-ref>` for the first template

#### Scenario: No templates available

- **WHEN** a user runs `backstage-agent templates list` and no templates exist
- **THEN** the output envelope `data.templates` is an empty array

### Requirement: Get template details

The CLI SHALL provide `backstage-agent templates get <entity-ref>` that retrieves the full details of a software template including its parameter schema and steps.

#### Scenario: Get existing template

- **WHEN** a user runs `backstage-agent templates get template:default/node-service`
- **THEN** the output envelope `data` contains `entityRef`, `title`, `description`, and `parameters` (the JSON Schema for template input parameters)
- **AND** `hints` suggests `backstage-agent templates execute <entity-ref>` with required parameter flags

#### Scenario: Template not found

- **WHEN** a user runs `backstage-agent templates get template:default/nonexistent`
- **THEN** the command exits with code `1`
- **AND** the error envelope contains `code: "NOT_FOUND"`
- **AND** `hints` suggests `backstage-agent templates list`

### Requirement: Execute template

The CLI SHALL provide `backstage-agent templates execute <entity-ref> --values <json>` that executes a software template with the provided parameter values. The `--values` flag accepts a JSON string matching the template's parameter schema.

#### Scenario: Successful template execution

- **WHEN** a user runs `backstage-agent templates execute template:default/node-service --values '{"name":"my-app","owner":"team-a"}'`
- **THEN** the scaffolder creates the component
- **AND** the output envelope `data` contains `taskId`, `status`, and `entityRef` of the created component
- **AND** `hints` suggests `backstage-agent catalog get <created-entity-ref>`

#### Scenario: Invalid parameter values

- **WHEN** a user runs `backstage-agent templates execute template:default/node-service --values '{"name":""}'`
- **AND** the values do not satisfy the template's parameter schema
- **THEN** the command exits with code `1`
- **AND** the error envelope includes validation errors from the parameter schema
- **AND** `hints` suggests `backstage-agent templates get <entity-ref>` to review required parameters

#### Scenario: Template execution without values

- **WHEN** a user runs `backstage-agent templates execute template:default/node-service` without `--values`
- **THEN** the command exits with code `2`
- **AND** the error envelope explains that `--values` is required

### Requirement: Template list and get are read-only

The `templates list` and `templates get` commands SHALL be classified as trust level `read-only`.

#### Scenario: Templates list trust level

- **WHEN** `backstage-agent templates list` executes
- **THEN** the `trustLevel` field in the output envelope is `read-only`

### Requirement: Template execute is destructive

The `templates execute` command SHALL be classified as trust level `destructive` because it creates new resources that may not be easily reversible.

#### Scenario: Templates execute trust level

- **WHEN** `backstage-agent templates execute` executes
- **THEN** the `trustLevel` field in the output envelope is `destructive`
