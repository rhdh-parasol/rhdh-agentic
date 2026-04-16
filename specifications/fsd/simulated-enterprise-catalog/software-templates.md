# FSD: Software Templates

**Status:** Draft
**Date:** 2026-04-16
**Author:** Architect Agent
**Parent PRD:** [Simulated Enterprise Catalog](../../prd/simulated-enterprise-catalog.md)
**ADR Dependencies:** None

---

## Goal

Provide governed scaffolding templates that let agents create new components conforming to Meridian's approved stack combinations — so that an agent can *act* on catalog knowledge, not just read it.

## User Story

**As a** coding agent,
**I want** to discover and execute software templates that scaffold new services using approved stack combinations,
**so that** I can create new components that automatically conform to organizational standards.

## Template Inventory

Three templates covering the primary approved stack combinations from the domain handbooks (see Catalog Entities FSD, Approved Stack Matrix):

| # | Template | Stack | Target Domain |
|---|----------|-------|---------------|
| 1 | quarkus-postgresql-kafka | Quarkus + PostgreSQL + Kafka | Payments (required), Platform (optional) |
| 2 | springboot-mongodb-rabbitmq | Spring Boot + MongoDB + RabbitMQ | Customer |
| 3 | nodejs-express-react | Node.js Express + React + PostgreSQL | Customer (frontend + BFF) |

## Template Requirements

### Discoverability

Each template must have:

- A descriptive **title** and **description** that tells an agent what stack it provides and which domains it targets
- **Tags** indicating the technologies included (framework, database, messaging)
- Its own **TechDocs** explaining when to choose this template over alternatives

### Parameters

Every template collects at minimum:

- **Service name** — kebab-case, becomes the component name in the catalog
- **Description** — what the service does
- **Owner** — team that owns this service (Group picker)
- **Domain** — which business domain (constrained to the 4 defined domains)
- **System** — which system this belongs to (entity picker)

Stack-specific parameters (e.g., database name, Kafka topics) vary by template.

### Generated Output

Every template skeleton must produce:

- A valid **catalog-info.yaml** with correct owner, system, dependsOn references to the catalog's Resource entities, and a techdocs-ref annotation
- A **buildable project** using the template's framework (compilable/runnable with standard tooling)
- A **TechDocs site** scaffold (mkdocs.yml + index page)

### Ownership

All templates are owned by `architecture-board` — they represent governed, approved patterns, not ad-hoc scaffolding.

## Agent Discoverability

An agent must be able to:

1. **List** available templates and understand what each one provides from the title and description alone
2. **Select** the correct template for a given domain by matching the domain's approved stack to the template's stack
3. **Determine** required and optional parameters from the template's parameter schema

## Acceptance Criteria

- **Given** a loaded Backstage instance, **when** an agent lists available templates, **then** it finds 3 templates with descriptive titles, descriptions, and stack-indicating tags.
- **Given** the quarkus-postgresql-kafka template, **when** an agent reads its parameters, **then** it can determine: required inputs (name, owner, system, domain, description) and valid domain values.
- **Given** a template execution with valid parameters, **when** the skeleton is rendered, **then** the generated catalog-info.yaml has correct owner, system, and dependsOn references.
- **Given** the template TechDocs, **when** an agent reads it, **then** it finds: which domains this template is approved for, what stack it uses, and when to choose it over alternatives.

## Invariants

- Every template is owned by architecture-board.
- Every template skeleton produces a catalog-info.yaml with valid entity references matching entities from the Catalog Entities FSD.
- Template domain values match exactly the Domain entity names from the Catalog Entities FSD.

## Technical Constraints

- **Upstream-native** (PRD): Standard `scaffolder.backstage.io/v1beta3` template kind. Standard scaffolder actions only.
- **Agent-testable** (PRD): Template descriptions and parameters must be rich enough for an agent to select the correct template for a given use case.
- **Opinionated** (PRD): Templates encode Meridian's approved stack — not generic "pick any database" scaffolders.

## Out of Scope

- **Template execution runtime** — Testing actual scaffolder execution requires a running Backstage instance.
- **CI/CD pipeline templates** — Generating GitHub Actions or Tekton pipelines is a future enhancement.
- **Custom scaffolder actions** — Only standard upstream actions.
- **Data-analytics domain template** — Python/Spark scaffolding is deferred to a future FSD.
- **Skeleton file structure and Nunjucks templates** — The exact files in each skeleton directory are implementation decisions.

---

## Revision History

| Version | Date | Author | Summary |
|---------|------|--------|---------|
| 0.1 | 2026-04-16 | Architect Agent | Initial draft |
| 0.2 | 2026-04-16 | Architect Agent | Strip implementation details, raise to spec level |
