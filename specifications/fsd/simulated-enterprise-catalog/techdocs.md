# FSD: TechDocs Content

**Status:** Draft
**Date:** 2026-04-16
**Author:** Architect Agent
**Parent PRD:** [Simulated Enterprise Catalog](../../prd/simulated-enterprise-catalog.md)
**ADR Dependencies:** None

---

## Goal

Provide the prose layer that tells agents *why* technology decisions were made and *what constraints apply* — via TechDocs attached to catalog entities — so that an agent can reason about organizational rationale rather than guessing.

## User Story

**As a** coding agent,
**I want** to read TechDocs attached to catalog entities that explain technology standards, approved stacks, and domain-specific rationale,
**so that** I can propose architectures that respect organizational constraints and understand *why* specific technologies were chosen.

## Data Model

### TechDocs Architecture

Each TechDocs site is a standalone mkdocs project rooted at a catalog entity. The entity's `backstage.io/techdocs-ref` annotation points to the docs directory.

```
catalog/
  platform/
    event-backbone.yaml
    event-backbone/
      docs/
        mkdocs.yml
        docs/
          index.md           # System overview
          adr/
            001-kafka-as-standard.md
          standards/
            event-schema-conventions.md
```

### Entity-to-TechDocs Binding

```yaml
# In the entity YAML
metadata:
  annotations:
    backstage.io/techdocs-ref: dir:./event-backbone/docs
```

### Which Entities Get TechDocs

Not every entity needs TechDocs. The depth-over-breadth principle applies:

| Entity Level | Gets TechDocs | Content Type |
|-------------|---------------|--------------|
| **Domain** (4) | All 4 | Domain handbook: approved stacks, governance rules, team charter |
| **System** (12) | 6 priority systems | System overview, ADRs for key decisions, runbooks |
| **Component** (20+) | 5 key components | Component-specific onboarding, API usage guide |
| **Resource** (7) | 3 key resources | Operational guide, why-this-technology rationale |
| **Group** (6) | 1 (architecture-board) | Organization-wide standards, cross-cutting policies |

**Total TechDocs sites: ~19** (quality over quantity).

### Document Types

**1. Domain Handbooks** (attached to Domain entities)

```markdown
# [Domain] Technology Standards

## Approved Stack
| Category | Technology | Status | Rationale |
|----------|-----------|--------|-----------|
| Backend  | Quarkus   | Required | Low memory, fast startup, GraalVM-ready |
| Database | PostgreSQL | Required | ACID compliance for financial transactions |

## Governance Rules
- All new services MUST use the approved backend framework
- Database exceptions require Architecture Board approval (ADR required)

## When to Deviate
[Criteria for requesting an exception...]
```

**2. Architecture Decision Records** (attached to System entities)

Following the standard ADR format:

```markdown
# ADR-001: Kafka as Enterprise Event Backbone

## Status: Accepted
## Date: 2025-06-15

## Context
Meridian needs a unified async messaging platform...

## Decision
Apache Kafka as the enterprise standard for event streaming.
RabbitMQ approved for command/task patterns only.

## Consequences
- Positive: Single event format, schema registry, replay capability
- Negative: Operational overhead, Kafka expertise required
- Negative: Not ideal for simple request-reply patterns (use RabbitMQ)
```

**3. Technology Rationale Docs** (attached to Resource entities)

```markdown
# Why PostgreSQL

## Approved For
- All transactional workloads in Payments domain (required)
- General-purpose RDBMS in Customer and Platform domains (preferred)

## Not Approved For
- Document-heavy workloads (use MongoDB)
- Caching/session (use Redis)

## Alternatives Considered
| Alternative | Verdict | Reason |
|------------|---------|--------|
| MySQL | Rejected | Weaker JSON support, licensing concerns |
| CockroachDB | Deferred | Evaluate when multi-region becomes a requirement |
```

**4. Onboarding Guides** (attached to key Components)

```markdown
# Getting Started with payment-gateway-api

## Prerequisites
- JDK 21+, Quarkus CLI
- Access to Kafka dev cluster

## Local Development
[Step-by-step setup...]

## Key Design Decisions
- Uses CQRS pattern (see ADR-003)
- All mutations produce Kafka events (see event-schema-conventions)
```

**5. Organization-wide Standards** (attached to architecture-board Group)

```markdown
# Meridian Engineering Standards

## API Design
- REST APIs must follow OpenAPI 3.0+
- Event APIs must use AsyncAPI 2.x with Avro schemas

## Observability
- All services must emit OpenTelemetry traces
- Structured JSON logging to stdout

## Security
- OAuth2/OIDC via Keycloak for all service-to-service auth
- No hardcoded credentials — use vault integration
```

### mkdocs.yml Convention

Every TechDocs site uses a minimal, consistent mkdocs configuration:

```yaml
site_name: <entity-name>
nav:
  - Overview: index.md
  - ADRs:
    - 'ADR-001: <title>': adr/001-<slug>.md
  - Standards:
    - '<title>': standards/<slug>.md
plugins:
  - techdocs-core
```

### Priority TechDocs Sites (initial implementation)

| # | Entity | Kind | Content |
|---|--------|------|---------|
| 1 | `payments` | Domain | Approved stack matrix, governance rules |
| 2 | `customer` | Domain | Approved stack matrix, governance rules |
| 3 | `platform` | Domain | Approved stack matrix, governance rules |
| 4 | `data-analytics` | Domain | Approved stack matrix, governance rules |
| 5 | `event-backbone` | System | Kafka ADR, event schema standards |
| 6 | `payment-processing` | System | CQRS ADR, settlement design |
| 7 | `identity-platform` | System | Keycloak ADR, auth patterns |
| 8 | `customer-onboarding` | System | MongoDB ADR, KYC flow |
| 9 | `observability-stack` | System | OpenTelemetry ADR, alerting standards |
| 10 | `data-lake` | System | ETL architecture ADR |
| 11 | `postgresql-primary` | Resource | Why-PostgreSQL rationale |
| 12 | `kafka-cluster` | Resource | Operational guide, topic naming |
| 13 | `mongodb-cluster` | Resource | Why-MongoDB rationale |
| 14 | `payment-gateway-api` | Component | Onboarding guide, API usage |
| 15 | `customer-profile-service` | Component | Onboarding guide |
| 16 | `notification-dispatcher` | Component | Channel routing design |
| 17 | `etl-pipeline` | Component | Pipeline configuration guide |
| 18 | `ml-model-server` | Component | Model deployment guide |
| 19 | `architecture-board` | Group | Org-wide engineering standards |

## APIs

No runtime APIs. The "API" is the mkdocs build:

```bash
# Build TechDocs locally (standard Backstage tooling)
npx @techdocs/cli generate --source-dir catalog/platform/event-backbone/docs --output-dir site/
npx @techdocs/cli serve
```

## Acceptance Criteria

- **Given** a Domain entity with TechDocs, **when** an agent reads the TechDocs content, **then** it finds an approved stack matrix with technology names, statuses (required/preferred/allowed), and rationale for each choice.
- **Given** a System entity with an ADR in TechDocs, **when** an agent reads the ADR, **then** it finds: context, decision, at least one alternative considered, and consequences (positive and negative).
- **Given** the `payments` domain handbook, **when** an agent queries what framework to use for a new Payments service, **then** the answer "Quarkus" is derivable from the document with the rationale "low memory, fast startup, GraalVM-ready."
- **Given** a Resource entity with TechDocs, **when** an agent reads the rationale doc, **then** it finds: approved use cases, explicitly not-approved use cases, and alternatives considered with reasons for rejection.
- **Given** any TechDocs site, **when** `mkdocs build` is run against its `mkdocs.yml`, **then** the build succeeds with no errors.

## Invariants

- Every entity with a `backstage.io/techdocs-ref` annotation has a valid `mkdocs.yml` at the referenced location.
- Every `mkdocs.yml` uses `techdocs-core` plugin and has a `nav` section.
- Every ADR follows the format: Status, Date, Context, Decision, Alternatives, Consequences.
- Every Domain handbook includes an Approved Stack table and Governance Rules section.
- No TechDocs content references fictional URLs or placeholder links.

## Technical Constraints

- **Upstream-native** (PRD): Standard Backstage TechDocs with `techdocs-core` plugin. No custom mkdocs plugins.
- **Agent-testable** (PRD): TechDocs content must be rich enough for an agent to derive concrete technology recommendations from prose.
- **Depth over breadth** (PRD): 19 well-written TechDocs sites, not 50 skeleton stubs.

## Out of Scope

- **TechDocs build infrastructure** — CI/CD for generating and publishing TechDocs sites is deployment scope.
- **Custom mkdocs themes or plugins** — Standard techdocs-core only.
- **API reference docs** — Auto-generated API docs from OpenAPI specs are separate from hand-written TechDocs.

## Validation

```bash
# Verify all techdocs-ref annotations point to existing mkdocs.yml
grep -r "techdocs-ref" catalog/ | while read line; do
  dir=$(echo "$line" | grep -o "dir:.*" | sed 's/dir://')
  file=$(dirname "$(echo "$line" | cut -d: -f1)")/$dir/mkdocs.yml
  [ -f "$file" ] && echo "OK: $file" || echo "MISSING: $file"
done

# Build each TechDocs site
find catalog/ -name 'mkdocs.yml' -exec npx @techdocs/cli generate --source-dir $(dirname {}) \;
```

Passing looks like: all `techdocs-ref` annotations resolve, all mkdocs builds succeed.

---

## Revision History

| Version | Date | Author | Summary |
|---------|------|--------|---------|
| 0.1 | 2026-04-16 | Architect Agent | Initial draft |
