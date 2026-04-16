# FSD: Catalog Entities

**Status:** Draft
**Date:** 2026-04-16
**Author:** Architect Agent
**Parent PRD:** [Simulated Enterprise Catalog](../../prd/simulated-enterprise-catalog.md)
**ADR Dependencies:** None — architectural constraints are embedded in the PRD design principles

---

## Goal

Define the fictional enterprise identity, organizational hierarchy, entity inventory, and relationship requirements for the Backstage catalog — so that an AI coding agent can discover what exists and how things connect.

## User Story

**As a** coding agent,
**I want** a richly connected catalog of enterprise entities with consistent metadata and real OSS references,
**so that** I can discover existing services, understand ownership and domain boundaries, and propose architectures grounded in organizational reality.

## Fictional Enterprise: Meridian Financial Services

A mid-size financial services company undergoing digital transformation. Meridian is large enough to need governance (approved stacks, domain ownership) but small enough that the full catalog is comprehensible (~50 deep entities rather than thousands of shallow ones).

Financial services was chosen because it naturally motivates governance constraints that agents must respect: approved technology stacks, compliance requirements (PCI-DSS), domain-specific rules, and architecture board oversight.

## Organizational Structure

### Teams (6 Groups)

| Group | Role | Owns |
|-------|------|------|
| platform-engineering | Infrastructure, runtime, observability | Platform domain |
| payments-team | Payment processing, settlement | Payments domain |
| customer-experience | Customer-facing applications | Customer domain |
| data-engineering | Data pipelines, analytics, ML | Data & Analytics domain |
| security-operations | Cross-cutting security | Security components |
| architecture-board | Governance, standards | Templates, org-wide standards |

### Business Domains (4)

| Domain | Scope |
|--------|-------|
| platform | Infrastructure, runtime, observability, enterprise messaging |
| payments | Payment processing, settlement, PCI-DSS compliance |
| customer | Customer-facing applications, onboarding, notifications |
| data-analytics | Data pipelines, analytics, reporting, ML |

### Systems (12)

| Domain | System | Purpose |
|--------|--------|---------|
| platform | identity-platform | Authentication, authorization (Keycloak) |
| platform | observability-stack | Monitoring, logging, tracing |
| platform | service-mesh | Service discovery, traffic management |
| platform | event-backbone | Enterprise messaging infrastructure |
| payments | payment-processing | Core payment flow |
| payments | payment-compliance | PCI-DSS audit, transaction monitoring |
| customer | customer-portal | Web application for customers |
| customer | customer-onboarding | KYC, account creation |
| customer | notification-service | Multi-channel notifications |
| data-analytics | data-lake | Centralized data storage and ETL |
| data-analytics | analytics-platform | BI dashboards, ad-hoc queries |
| data-analytics | ml-platform | Model training and serving |

## Entity Inventory

### Minimum Entity Counts

| Kind | Count | Notes |
|------|-------|-------|
| Group | 6 | Teams listed above |
| Domain | 4 | Business areas listed above |
| System | 12 | Systems listed above |
| Component | 20+ | Services, frontends, libraries (see categories below) |
| Resource | 7+ | Infrastructure: databases, message brokers, object stores |
| API | 3+ | OpenAPI definitions for key services |

### Component Categories

**Resources** — real OSS infrastructure projects (PostgreSQL, MongoDB, Redis, Kafka, RabbitMQ, Elasticsearch, MinIO) modeled as `kind: Resource` with accurate descriptions and links to the real project.

**Application Components** — fictional Meridian services built on real frameworks. Each service belongs to a system and uses the domain's approved stack. Must include services across all four domains using different frameworks (Quarkus, Spring Boot, Node.js, React, Spark, Grafana).

**Libraries** — shared cross-cutting components (Java commons, auth SDK, event schemas) owned by platform or security teams.

## Approved Stack Matrix

Each domain has explicit technology requirements. This matrix is the authoritative source — agents querying the catalog must be able to derive these constraints from entity metadata and relationships.

| Domain | Backend Framework | Database | Messaging | Frontend |
|--------|------------------|----------|-----------|----------|
| Payments | Quarkus (required) | PostgreSQL (required) | Kafka (required) | N/A |
| Customer | Spring Boot or Node.js | MongoDB or PostgreSQL | RabbitMQ or Kafka | React |
| Platform | Any approved | Any approved | Kafka | N/A |
| Data & Analytics | Python / Spark | PostgreSQL + MinIO | Kafka | Grafana |

## Relationship Requirements

The catalog must form a connected knowledge graph. An agent starting from any component must be able to traverse to related entities.

**Required for every entity:**

- Every Component and Resource declares an `owner` (Group reference)
- Every Component declares its `system`
- Every System declares its `domain`

**Required for service Components:**

- At least one `dependsOn` reference (Resource or Component dependency)
- `providesApi` and/or `consumesApi` where the service exposes or consumes APIs

**Graph traversal test:** Starting from any service component, an agent must be able to reach: its owning team, its domain, its infrastructure dependencies, and the APIs it provides/consumes — all through standard Backstage relationship traversal.

## Metadata Requirements

Every entity must include:

- A **description** of at least 50 characters explaining what this is and why it was chosen
- At least **2 tags** (technology/language + category or domain)
- A `backstage.io/techdocs-ref` annotation for entities that have TechDocs (see FSD 2)
- For real OSS components: `github.com/project-slug` annotation and links to project homepage and source code

## Catalog Entry Point

The entire catalog loads via a single Backstage catalog Location entry — one URL that references all entity files. No manual multi-step registration, no custom plugins.

## Acceptance Criteria

- **Given** a fresh Backstage instance, **when** the catalog Location is registered, **then** all entities load without errors.
- **Given** the loaded catalog, **when** an agent queries for components in the Payments domain, **then** it receives components with Quarkus framework tags, PostgreSQL dependencies, and Kafka relationships.
- **Given** any Component entity, **when** its metadata is inspected, **then** it has: description (>50 chars), at least 2 tags, owner ref, system ref, and at least 1 relationship.
- **Given** the catalog, **when** an agent traverses relationships from any service component, **then** it can reach: its owning team, its domain, its infrastructure dependencies, and related APIs.
- **Given** the catalog, **when** entity counts are tallied, **then** minimums are met: 6 Groups, 4 Domains, 12 Systems, 20 Components, 7 Resources, 3 APIs.
- **Given** an rhdh-local-setup instance, **when** the catalog Location URL is added to `app-config.local.yaml` and started with `rhdh local up`, **then** all entities load and are visible in the RHDH catalog UI.

## Invariants

- All entity references (`owner`, `system`, `domain`, `dependsOn`, `consumesApi`, `providesApi`) resolve to existing entities — no dangling references.
- No orphan entities: every entity is reachable from the root Location.
- All entity names use kebab-case and are unique within their kind.

## Technical Constraints

- **Upstream-native only** (PRD): Standard `backstage.io/v1alpha1` entity kinds and annotations. No custom kinds, no distribution-specific extensions.
- **Real OSS references** (PRD): Component descriptions and links reference real open-source projects with accurate information.
- **Single entry point** (PRD): One Location entity loads the entire catalog.
- **rhdh-local-setup compatible**: Loads via a single catalog location entry in `app-config.local.yaml`. No custom plugins required.

## Out of Scope

- **TechDocs content** — Covered by FSD 2. This FSD defines which entities get TechDocs, not the documentation content.
- **Software Template implementations** — Covered by FSD 3.
- **File organization and YAML structure** — How entity files are organized on disk (monolithic vs. per-domain vs. per-entity) is an implementation decision.
- **rhdh-local-setup customization files** — Providing ready-made overlay files is a convenience, not a requirement.
- **User entities** — The catalog models teams (Groups) but not individual users.

---

## Revision History

| Version | Date | Author | Summary |
|---------|------|--------|---------|
| 0.1 | 2026-04-16 | Architect Agent | Initial draft |
| 0.2 | 2026-04-16 | Architect Agent | Strip implementation details, raise to spec level |
