# FSD: Catalog Entities

**Status:** Draft
**Date:** 2026-04-16
**Author:** Architect Agent
**Parent PRD:** [Simulated Enterprise Catalog](../../prd/simulated-enterprise-catalog.md)
**ADR Dependencies:** None — architectural constraints are embedded in the PRD design principles

---

## Goal

Define the complete set of Backstage catalog entities — the fictional enterprise identity, organizational hierarchy, components, APIs, resources, and their relationships — so that an AI coding agent can discover what exists and how things connect.

## User Story

**As a** coding agent,
**I want** a richly connected catalog of enterprise entities with consistent metadata and real OSS references,
**so that** I can discover existing services, understand ownership and domain boundaries, and propose architectures grounded in organizational reality.

## Data Model

### Fictional Enterprise: Meridian Financial Services

A mid-size financial services company undergoing digital transformation. Meridian is large enough to need governance (approved stacks, domain ownership) but small enough that the full catalog is comprehensible (~50 deep entities rather than thousands of shallow ones).

### Organizational Hierarchy

```yaml
# Groups (teams) — 6 teams across 4 domains
- group:default/platform-engineering     # owns Platform domain
- group:default/payments-team            # owns Payments domain
- group:default/customer-experience      # owns Customer domain
- group:default/data-engineering         # owns Data & Analytics domain
- group:default/security-operations      # cross-cutting, owns security components
- group:default/architecture-board       # governance, owns standards & templates
```

### Domains (4 business areas)

```yaml
- domain:default/platform          # Infrastructure, runtime, observability
- domain:default/payments          # Payment processing, settlement, compliance
- domain:default/customer          # Customer-facing applications, onboarding, support
- domain:default/data-analytics    # Data pipelines, analytics, reporting
```

### Systems (12 systems across domains)

| Domain | System | Purpose |
|--------|--------|---------|
| platform | `identity-platform` | Authentication, authorization (Keycloak) |
| platform | `observability-stack` | Monitoring, logging, tracing (OpenTelemetry, Prometheus, Grafana) |
| platform | `service-mesh` | Service discovery, traffic management (Istio) |
| platform | `event-backbone` | Enterprise messaging infrastructure (Kafka, Schema Registry) |
| payments | `payment-processing` | Core payment flow (ingestion, validation, settlement) |
| payments | `payment-compliance` | PCI-DSS audit, transaction monitoring |
| customer | `customer-portal` | Web application for customers |
| customer | `customer-onboarding` | KYC, account creation |
| customer | `notification-service` | Email, SMS, push notifications |
| data-analytics | `data-lake` | Centralized data storage and ETL |
| data-analytics | `analytics-platform` | BI dashboards, ad-hoc queries |
| data-analytics | `ml-platform` | Model training and serving |

### Components (target: 50 entities)

Components fall into three categories:

**Infrastructure Components (Resources)** — real OSS projects as `kind: Resource`:

| Resource | Type | System | Description |
|----------|------|--------|-------------|
| `postgresql-primary` | database | payment-processing | Primary RDBMS — approved for all transactional workloads |
| `mongodb-cluster` | database | customer-onboarding | Document store — approved for customer profile data |
| `redis-cache` | database | customer-portal | In-memory cache — approved for session and hot data |
| `kafka-cluster` | message-broker | event-backbone | Event streaming — enterprise standard for async |
| `rabbitmq-broker` | message-broker | notification-service | Task queue — approved for command/notification patterns |
| `elasticsearch-cluster` | search-engine | analytics-platform | Full-text search and log aggregation |
| `minio-store` | object-store | data-lake | S3-compatible object storage |

**Application Components** — `kind: Component` with `type: service`:

| Component | System | Framework | Description |
|-----------|--------|-----------|-------------|
| `payment-gateway-api` | payment-processing | Quarkus | Ingests payment requests, validates, routes |
| `payment-settlement-worker` | payment-processing | Quarkus | Processes settlement batches async via Kafka |
| `payment-audit-service` | payment-compliance | Spring Boot | PCI-DSS transaction logging and audit trail |
| `customer-profile-service` | customer-onboarding | Spring Boot | CRUD for customer profiles (MongoDB) |
| `customer-portal-frontend` | customer-portal | React | SPA for customer self-service |
| `notification-dispatcher` | notification-service | Node.js | Multi-channel notification routing |
| `identity-service` | identity-platform | Keycloak | SSO and token management |
| `metrics-collector` | observability-stack | OpenTelemetry | Distributed tracing and metrics |
| `etl-pipeline` | data-lake | Apache Spark | Batch ETL from operational DBs to lake |
| `analytics-dashboard` | analytics-platform | Grafana | Business intelligence dashboards |
| `ml-model-server` | ml-platform | Seldon Core | Model serving endpoint |

**Libraries** — `type: library`, shared across teams:

| Component | Owner | Description |
|-----------|-------|-------------|
| `meridian-java-commons` | platform-engineering | Shared Java utilities (logging, error handling, config) |
| `meridian-auth-sdk` | security-operations | Auth client library wrapping Keycloak integration |
| `meridian-event-schemas` | platform-engineering | Avro schemas for Kafka topics |

### Entity File Organization

```
catalog/
  catalog-info.yaml              # Root Location entity — single entry point
  org/
    groups.yaml                  # All Group entities
    domains.yaml                 # All Domain entities
  platform/
    identity-platform.yaml       # System + its components and resources
    observability-stack.yaml
    service-mesh.yaml
    event-backbone.yaml
  payments/
    payment-processing.yaml      # System + its components and resources
    payment-compliance.yaml
  customer/
    customer-portal.yaml
    customer-onboarding.yaml
    notification-service.yaml
  data-analytics/
    data-lake.yaml
    analytics-platform.yaml
    ml-platform.yaml
  shared/
    libraries.yaml               # Cross-cutting libraries
  apis/
    payment-gateway-api.yaml     # OpenAPI definitions (one per API)
    customer-profile-api.yaml
    notification-api.yaml
  templates/                     # Software Templates (FSD 3 scope)
```

### Relationship Graph

Each component declares explicit relationships:

```yaml
# Example: payment-gateway-api
spec:
  type: service
  lifecycle: production
  owner: group:default/payments-team
  system: payment-processing
  dependsOn:
    - resource:default/postgresql-primary
    - resource:default/kafka-cluster
    - component:default/meridian-auth-sdk
  providesApi:
    - api:default/payment-gateway-api
  consumesApi:
    - api:default/identity-service-api
```

Minimum relationship coverage per component:

- `owner` — required (group ref)
- `system` — required (system ref)
- `dependsOn` — at least 1 resource or component dependency for services
- `providesApi` / `consumesApi` — for components that expose or consume APIs

### Metadata Conventions

Every entity must include:

```yaml
apiVersion: backstage.io/v1alpha1
metadata:
  name: kebab-case-name
  description: >-
    Multi-line description explaining what this is,
    why it was chosen, and key characteristics.
  tags:
    - language-or-tech        # e.g., java, typescript, python
    - category                # e.g., database, messaging, framework
    - domain                  # e.g., payments, customer, platform
  annotations:
    backstage.io/techdocs-ref: dir:./docs    # if TechDocs exist (FSD 2)
    github.com/project-slug: org/repo        # real OSS project
    backstage.io/source-location: url:https://github.com/org/repo
  links:
    - url: https://project-homepage.io
      title: Documentation
      icon: docs
    - url: https://github.com/org/repo
      title: Source Code
      icon: github
```

### Approved Stack Matrix

Encoded in component tags and documented in TechDocs (FSD 2):

| Domain | Backend Framework | Database | Messaging | Frontend |
|--------|------------------|----------|-----------|----------|
| Payments | Quarkus (required) | PostgreSQL (required) | Kafka (required) | N/A |
| Customer | Spring Boot or Node.js | MongoDB or PostgreSQL | RabbitMQ or Kafka | React |
| Platform | Any approved | Any approved | Kafka | N/A |
| Data & Analytics | Python / Spark | PostgreSQL + MinIO | Kafka | Grafana |

## APIs

This FSD defines content (YAML files), not runtime APIs. The "API" surface is the catalog entry point:

```yaml
# catalog/catalog-info.yaml — the single entry point
apiVersion: backstage.io/v1alpha1
kind: Location
metadata:
  name: meridian-catalog
  description: Meridian Financial Services — complete enterprise catalog
spec:
  type: url
  targets:
    - ./org/groups.yaml
    - ./org/domains.yaml
    - ./platform/*.yaml
    - ./payments/*.yaml
    - ./customer/*.yaml
    - ./data-analytics/*.yaml
    - ./shared/*.yaml
    - ./apis/*.yaml
    - ./templates/*.yaml
```

Register in Backstage via a single `app-config.yaml` entry:

```yaml
catalog:
  locations:
    - type: url
      target: https://github.com/rhdh-parasol/rhdh-agentic/blob/main/catalog/catalog-info.yaml
      rules:
        - allow: [Component, API, System, Domain, Resource, Location, Template, Group]
```

## Acceptance Criteria

- **Given** a fresh Backstage instance, **when** the catalog-info.yaml Location is registered, **then** all entities load without errors and are visible in the catalog.
- **Given** the loaded catalog, **when** an agent queries for components in the Payments domain, **then** it receives components with Quarkus framework tags, PostgreSQL dependencies, and Kafka relationships.
- **Given** any Component entity, **when** its YAML is inspected, **then** it has: description (>50 chars), at least 2 tags, owner ref, system ref, and at least 1 relationship (dependsOn, providesApi, or consumesApi).
- **Given** the catalog, **when** an agent traverses relationships from `payment-gateway-api`, **then** it can reach: its owning team, its domain, its database dependency, the Kafka cluster, and the APIs it provides/consumes.
- **Given** the catalog, **when** entity counts are tallied, **then** there are at least 6 Groups, 4 Domains, 12 Systems, 20 Components, 7 Resources, and 3 APIs.
- **Given** an rhdh-local-setup instance, **when** the catalog Location URL is added to `app-config.local.yaml` and the instance is started with `rhdh local up`, **then** all entities load and are visible in the RHDH catalog UI.

## Invariants

- Every Component and Resource has an `owner` reference that resolves to an existing Group entity.
- Every Component has a `system` reference that resolves to an existing System entity.
- Every System has a `domain` field that resolves to an existing Domain entity.
- No orphan entities: every entity is reachable from the root Location.
- All entity names use `kebab-case` and are unique within their kind.
- All `dependsOn`, `consumesApi`, `providesApi` references resolve to existing entities.

## Technical Constraints

- **Upstream-native only** (PRD Design Principle): Standard `backstage.io/v1alpha1` entity kinds and annotations. No custom kinds, no distribution-specific extensions.
- **Real OSS references** (PRD Design Principle): Component descriptions and links reference real open-source projects with accurate information.
- **Single entry point** (PRD Success Outcome): One Location entity loads the entire catalog. No manual multi-step registration.
- **rhdh-local-setup compatible**: The catalog must load in rhdh-local-setup via a single catalog location entry in `app-config.local.yaml`. No custom plugins, no additional configuration beyond the URL. Entity YAML files must be individually loadable (one entity per `kind` per document, no multi-document tricks that break local file-based loading).

## Out of Scope

- **TechDocs content** — Covered by FSD 2. This FSD only defines the `backstage.io/techdocs-ref` annotation on entities that will have docs.
- **Software Template implementations** — Covered by FSD 3. This FSD defines the `catalog/templates/` directory but not template content.
- **rhdh-local-setup customization files** — Providing ready-made `app-config.local.yaml` snippets or overlay files for rhdh-local is a convenience; the catalog itself must work with any standard Backstage instance including rhdh-local-setup.
- **User entities** — The catalog models teams (Groups) but not individual users. Users are deployment-specific.

## Validation

```bash
# Validate all YAML files parse correctly
find catalog/ -name '*.yaml' -exec python3 -c "
import yaml, sys
for doc in yaml.safe_load_all(open(sys.argv[1])):
    if doc:
        assert 'apiVersion' in doc, f'Missing apiVersion in {sys.argv[1]}'
        assert 'kind' in doc, f'Missing kind in {sys.argv[1]}'
        assert 'metadata' in doc, f'Missing metadata in {sys.argv[1]}'
        assert 'name' in doc['metadata'], f'Missing name in {sys.argv[1]}'
print(f'OK: {sys.argv[1]}')
" {} \;

# Count entities by kind
grep -r "^kind:" catalog/ | sort | uniq -c

# Verify all owner refs resolve
# (implementation: script that collects all Group names and checks owner fields)
```

Passing looks like: all YAML files parse, entity counts meet minimums, no dangling references.

---

## Revision History

| Version | Date | Author | Summary |
|---------|------|--------|---------|
| 0.1 | 2026-04-16 | Architect Agent | Initial draft |
