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
**so that** I can create new components that automatically conform to organizational standards (correct framework, database, messaging, observability).

## Data Model

### Template Inventory

Three templates covering the primary approved stack combinations from the domain handbooks:

| # | Template | Stack | Target Domain |
|---|----------|-------|---------------|
| 1 | `quarkus-postgresql-kafka` | Quarkus + PostgreSQL + Kafka | Payments (required), Platform (optional) |
| 2 | `springboot-mongodb-rabbitmq` | Spring Boot + MongoDB + RabbitMQ | Customer |
| 3 | `nodejs-express-react` | Node.js Express + React + PostgreSQL | Customer (frontend + BFF) |

### Template Entity Structure

Each template is a `scaffolder.backstage.io/v1beta3` entity:

```yaml
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: quarkus-postgresql-kafka
  title: Quarkus Service with PostgreSQL and Kafka
  description: >-
    Scaffold a new Quarkus microservice pre-configured with PostgreSQL
    for persistence and Kafka for event streaming. Follows Meridian's
    Payments domain standards. Includes OpenTelemetry instrumentation,
    Keycloak auth integration, and Dockerfile.
  tags:
    - quarkus
    - java
    - postgresql
    - kafka
    - payments
    - recommended
  annotations:
    backstage.io/techdocs-ref: dir:./docs
  links:
    - url: https://quarkus.io/guides/
      title: Quarkus Guides
      icon: docs
spec:
  owner: group:default/architecture-board
  type: service
  parameters: [...]   # see Parameters section below
  steps: [...]        # see Steps section below
  output: [...]       # see Output section below
```

### Template Parameters

Each template collects the same base parameters, plus stack-specific options:

```yaml
spec:
  parameters:
    - title: Service Identity
      required:
        - name
        - owner
        - system
        - domain
        - description
      properties:
        name:
          title: Service Name
          type: string
          pattern: '^[a-z][a-z0-9-]*$'
          description: Kebab-case name (becomes component name in catalog)
          ui:autofocus: true
        description:
          title: Description
          type: string
          description: What does this service do?
          ui:widget: textarea
        owner:
          title: Owner
          type: string
          description: Team that owns this service
          ui:field: OwnerPicker
          ui:options:
            catalogFilter:
              kind: Group
        domain:
          title: Domain
          type: string
          description: Business domain
          enum:
            - payments
            - customer
            - platform
            - data-analytics
        system:
          title: System
          type: string
          description: System this service belongs to
          ui:field: EntityPicker
          ui:options:
            catalogFilter:
              kind: System

    - title: Infrastructure Options
      properties:
        database_name:
          title: Database Name
          type: string
          description: Logical database name
          default: service_db
        kafka_topics:
          title: Kafka Topics
          type: array
          items:
            type: string
          description: Kafka topics this service produces to
          default: []
```

### Template Steps

Each template uses standard scaffolder actions:

```yaml
spec:
  steps:
    - id: fetch-skeleton
      name: Fetch Skeleton
      action: fetch:template
      input:
        url: ./skeleton
        values:
          name: ${{ parameters.name }}
          description: ${{ parameters.description }}
          owner: ${{ parameters.owner }}
          domain: ${{ parameters.domain }}
          system: ${{ parameters.system }}
          database_name: ${{ parameters.database_name }}

    - id: publish
      name: Publish to GitHub
      action: publish:github
      input:
        allowedHosts: ['github.com']
        repoUrl: github.com?owner=meridian-financial&repo=${{ parameters.name }}
        description: ${{ parameters.description }}
        defaultBranch: main

    - id: register
      name: Register in Catalog
      action: catalog:register
      input:
        repoContentsUrl: ${{ steps.publish.output.repoContentsUrl }}
        catalogInfoPath: /catalog-info.yaml
```

### Skeleton Contents

Each template includes a `skeleton/` directory with templated project files. The skeleton produces a working project that follows Meridian standards:

**`quarkus-postgresql-kafka` skeleton:**

```
skeleton/
  catalog-info.yaml.njk        # Pre-filled Backstage entity with correct metadata
  pom.xml.njk                  # Quarkus + PostgreSQL + Kafka dependencies
  src/main/java/.../
    Application.java.njk       # Main class with health check
    EventProducer.java.njk     # Kafka producer boilerplate
  src/main/resources/
    application.properties.njk # Quarkus config (DB, Kafka, OIDC, OTEL)
  Dockerfile                   # Multi-stage build
  mkdocs.yml                   # TechDocs site scaffold
  docs/
    index.md.njk               # Service overview with name/description
  README.md.njk
```

**Generated `catalog-info.yaml` includes:**

```yaml
# skeleton/catalog-info.yaml.njk
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: ${{ values.name }}
  description: ${{ values.description }}
  tags:
    - java
    - quarkus
    - ${{ values.domain }}
  annotations:
    backstage.io/techdocs-ref: dir:.
    github.com/project-slug: meridian-financial/${{ values.name }}
spec:
  type: service
  lifecycle: experimental
  owner: ${{ values.owner }}
  system: ${{ values.system }}
  dependsOn:
    - resource:default/postgresql-primary
    - resource:default/kafka-cluster
    - component:default/meridian-auth-sdk
```

### Template File Organization

```
catalog/
  templates/
    quarkus-postgresql-kafka/
      template.yaml            # Template entity definition
      skeleton/                # Nunjucks-templated project files
      docs/
        mkdocs.yml             # TechDocs for the template itself
        docs/
          index.md             # When to use this template, stack rationale
    springboot-mongodb-rabbitmq/
      template.yaml
      skeleton/
      docs/
    nodejs-express-react/
      template.yaml
      skeleton/
      docs/
```

## APIs

No runtime APIs. Templates are consumed via the Backstage Scaffolder UI or API:

```bash
# Agent can discover templates via catalog query
# (Backstage Agent CLI scope, not this FSD)
backstage-agent templates list
backstage-agent templates describe quarkus-postgresql-kafka
```

## Acceptance Criteria

- **Given** a loaded Backstage instance, **when** an agent lists available templates, **then** it finds 3 templates with descriptive titles, descriptions, and stack-indicating tags.
- **Given** the `quarkus-postgresql-kafka` template, **when** an agent reads its parameters, **then** it can determine: required inputs (name, owner, system, domain, description), optional inputs (database_name, kafka_topics), and valid values for `domain` (enum).
- **Given** a template execution with valid parameters, **when** the skeleton is rendered, **then** the generated `catalog-info.yaml` has correct `owner`, `system`, `dependsOn` references, and `backstage.io/techdocs-ref` annotation.
- **Given** any template skeleton, **when** rendered with sample values, **then** the resulting project is structurally valid (parseable YAML, valid pom.xml/package.json, Dockerfile present).
- **Given** the template TechDocs, **when** an agent reads the index page, **then** it finds: which domains this template is approved for, what stack it uses, and when to choose it over alternatives.

## Invariants

- Every template's `spec.owner` is `group:default/architecture-board`.
- Every template skeleton produces a `catalog-info.yaml` with valid entity references.
- Every template skeleton includes a `mkdocs.yml` and `docs/index.md` for TechDocs.
- Template `domain` enum values match exactly the Domain entity names from FSD 1.
- Generated `dependsOn` references point to Resource entities defined in FSD 1.

## Technical Constraints

- **Upstream-native** (PRD): Standard `scaffolder.backstage.io/v1beta3` template kind. Standard actions only (`fetch:template`, `publish:github`, `catalog:register`).
- **Agent-testable** (PRD): Template parameters and descriptions must be rich enough for an agent to select the correct template for a given domain and use case.
- **Opinionated** (PRD): Templates encode Meridian's approved stack — not generic "pick any database" scaffolders.

## Out of Scope

- **Template execution runtime** — Testing actual scaffolder execution requires a running Backstage instance. This FSD defines the template content, not the runtime.
- **CI/CD pipeline templates** — Generating GitHub Actions or Tekton pipelines is a future enhancement.
- **Custom scaffolder actions** — Only standard upstream actions. No custom plugins.
- **Template for data-analytics domain** — Python/Spark scaffolding is deferred; the three templates cover Payments, Customer, and Platform.

## Validation

```bash
# Validate all template YAML files
find catalog/templates/ -name 'template.yaml' -exec python3 -c "
import yaml, sys
doc = yaml.safe_load(open(sys.argv[1]))
assert doc['apiVersion'] == 'scaffolder.backstage.io/v1beta3'
assert doc['kind'] == 'Template'
assert 'parameters' in doc['spec']
assert 'steps' in doc['spec']
print(f'OK: {sys.argv[1]}')
" {} \;

# Verify skeleton directories exist
find catalog/templates/ -name 'template.yaml' -exec dirname {} \; | \
  while read dir; do
    [ -d "$dir/skeleton" ] && echo "OK: $dir/skeleton" || echo "MISSING: $dir/skeleton"
  done
```

Passing looks like: all template YAML files parse as valid `v1beta3` Templates, all skeleton directories exist with catalog-info.yaml template.

---

## Revision History

| Version | Date | Author | Summary |
|---------|------|--------|---------|
| 0.1 | 2026-04-16 | Architect Agent | Initial draft |
