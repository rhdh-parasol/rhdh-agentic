## ADDED Requirements

### Requirement: Templates matching Parasol's approved stacks

The catalog SHALL include Software Templates adapted from [redhat-developer/red-hat-developer-hub-software-templates](https://github.com/redhat-developer/red-hat-developer-hub-software-templates) covering the primary stack combinations used by Parasol Insurance services. Based on Parasol's tag distributions (Java: 113 components, Python: 46 components, plus Node.js services), templates SHALL cover at least these three technology families.

#### Scenario: Template inventory

- **WHEN** an agent lists available templates in the catalog
- **THEN** it finds templates with descriptive titles, descriptions, and tags indicating the stack technologies

#### Scenario: Template-to-domain mapping

- **WHEN** an agent needs to scaffold a service for a Parasol domain
- **THEN** it can identify the correct template from the template's description and tags

### Requirement: Template discoverability

Each template SHALL have a descriptive title and description that tells an agent what stack it provides and which Parasol domains it targets. Each template SHALL include tags for all technologies in its stack.

#### Scenario: Agent selects correct template

- **WHEN** an agent reads the templates' titles, descriptions, and tags
- **THEN** it can match the correct template to a domain's approved stack without consulting external documentation

### Requirement: Template parameters

Every template SHALL collect at minimum: service name (kebab-case), description, owner (Group picker), and system (entity picker). Stack-specific parameters SHALL vary by template.

#### Scenario: Required parameters present

- **WHEN** an agent reads a template's parameter schema
- **THEN** it can determine required inputs and valid values

### Requirement: Skeleton output produces valid catalog entity

Every template skeleton SHALL produce a valid `catalog-info.yaml` with correct `owner`, `system`, and `dependsOn` references matching entities in the Parasol catalog. Skeletons SHALL follow the catalog-info.yaml patterns from the RHDH templates repo (`skeletons/catalog-info/`) and include a buildable project using the template's framework.

#### Scenario: Generated catalog-info.yaml is valid

- **WHEN** a template skeleton is rendered with valid parameters
- **THEN** the generated `catalog-info.yaml` has correct entity references

#### Scenario: Skeleton project is buildable

- **WHEN** a template skeleton is rendered
- **THEN** it produces a project structure that compiles or runs with standard build tooling
