## ADDED Requirements

### Requirement: TechDocs coverage for Parasol domains

The catalog SHALL include TechDocs sites attached to Parasol Insurance entities, covering domain handbooks, system ADRs, and org-wide standards. Component onboarding is covered by the combination of domain handbooks (approved stacks, governance rules) and software templates (scaffolding), rather than separate onboarding guide documents. Parasol has 14 domains (claims, underwriting, policy, billing, digital channels, data platform, commercial/specialty, personal lines, life insurance, etc.) and 53 systems. TechDocs content SHALL be grounded in existing source material: 16 inline OpenAPI specs, tag distributions (`java:113`, `python:46`, `rest:157`), the [redhat-ads-tech/parasol-insurance](https://github.com/redhat-ads-tech/parasol-insurance) application code, and the Tech Radar dataset from benwilcock/backstage-catalogs. TechDocs site structure SHALL follow the mkdocs.yaml skeleton from [redhat-developer/red-hat-developer-hub-software-templates](https://github.com/redhat-developer/red-hat-developer-hub-software-templates).

#### Scenario: TechDocs entities have buildable sites

- **WHEN** any entity with a `backstage.io/techdocs-ref` annotation is inspected
- **THEN** the referenced location contains a valid `mkdocs.yml` and `docs/` directory, and `mkdocs build` succeeds without errors

### Requirement: Domain Handbooks

Priority Parasol Domain entities SHALL have a TechDocs site containing a Domain Handbook with an Approved Stack Matrix, Governance Rules, and When to Deviate sections.

#### Scenario: Approved Stack Matrix is agent-queryable

- **WHEN** an agent reads a Parasol domain handbook (e.g., Claims)
- **THEN** it can determine the approved technology stack for that domain with rationale for each choice

#### Scenario: Governance rules are explicit

- **WHEN** an agent reads any Domain handbook
- **THEN** it finds: what is mandatory, what requires approval, and what is forbidden for that domain

### Requirement: Architecture Decision Records

System entities with key architectural decisions SHALL have TechDocs containing ADRs with Status, Date, Context, Decision, Alternatives Considered (at least one with reason for rejection), and Consequences (positive and negative).

#### Scenario: ADR completeness

- **WHEN** an agent reads a System ADR
- **THEN** it finds all required sections: Status, Context, Decision, at least one Alternative Considered with rejection reason, and Consequences with both positive and negative impacts

#### Scenario: ADR answers "why X over Y"

- **WHEN** an agent asks why a specific technology was chosen
- **THEN** the relevant ADR provides specific alternatives considered and trade-offs

### Requirement: Organization-wide standards

A Parasol org-level entity SHALL have a TechDocs site covering cross-cutting engineering standards: API design conventions, observability requirements, and security/auth patterns.

#### Scenario: Org standards are discoverable

- **WHEN** an agent navigates to the Parasol platform engineering or standards entity
- **THEN** it finds TechDocs with standards covering API design, observability, and security

### Requirement: Agent-derivable answers

TechDocs content SHALL be rich enough for an agent to derive concrete, actionable answers — not just placeholder prose.

#### Scenario: Framework recommendation from domain handbook

- **WHEN** an agent reads a Domain handbook and asks "What framework should I use for a new service in this domain?"
- **THEN** the content provides a specific technology name, its status (required/preferred/allowed), and rationale

#### Scenario: Technology suitability from rationale doc

- **WHEN** an agent asks "Should I use this technology for use case Z?"
- **THEN** the content provides enough information to answer yes/no with reasoning
