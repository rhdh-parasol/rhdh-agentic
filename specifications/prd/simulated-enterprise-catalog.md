# Simulated Enterprise Catalog

**Status:** Draft | Review | **Approved** | Superseded
**Date:** 2026-04-07
**Author:** Marcel Hild

> A realistic, enterprise-scale software catalog for Backstage that provides the organizational context AI coding agents need to make grounded architecture decisions.

---

## 1. Mission

Provide a comprehensive, opinionated enterprise software catalog for Backstage — with real open-source components, organizational rationale, TechDocs, and software templates — so that AI coding agents have meaningful organizational context to reason about.

## 2. The Problem

- **No realistic enterprise catalog exists in the Backstage ecosystem.** The official Backstage examples contain ~30 entities (a fictional music company). Bulk generators produce `component-42` entries with no semantic depth. There is nothing between "toy example" and "build your own from scratch."
- **Existing catalog content lacks the narrative layer agents need.** The largest enterprise simulation in the ecosystem (~140 components in [backstage-catalogs](https://github.com/benwilcock/backstage-catalogs)) has rich entity metadata but no TechDocs, no domain-specific rationale ("PostgreSQL is approved because..."), and no software templates for scaffolding.
- **Catalog breadth without depth does not support agent reasoning.** A list of 140 components tells an agent *what exists*. It does not tell the agent *why* those components were chosen, *what alternatives were rejected*, or *how* to build a new service that conforms to organizational standards. Agents need prose, not just YAML.
- **Plugin developers and advocates lack a turnkey test fixture.** Every Backstage evaluator, plugin developer, and agent integration author faces the same cold-start problem: they need realistic catalog content to test against, and nothing usable exists out of the box.

## 3. Target Users

| Persona | Profile | Key Need |
|---------|---------|----------|
| **Coding Agent** | Claude Code, Cursor, GitHub Copilot — the primary catalog consumer | Rich, queryable catalog with enough depth (TechDocs, APIs, relationships) to make grounded architecture proposals |
| **Enterprise Architect** | Designs composable applications, directs agents, reviews proposals | A realistic enterprise landscape that mirrors real organizational constraints — approved stacks, team ownership, domain boundaries |
| **Backstage Contributor** | Builds and tests Backstage plugins, MCP Actions, or agent integrations | A non-trivial test fixture with realistic entity counts, relationship graphs, and TechDocs content |
| **Developer Advocate** | Demonstrates Backstage and agent integrations at conferences, workshops, customer meetings | A turnkey catalog that tells a compelling enterprise story out of the box |

The coding agent is the primary consumer. The catalog is optimized for machine queryability: consistent metadata, rich relationships, and prose content (TechDocs) that agents can search and reason about.

## 4. Product Direction

### Core Idea

A **fictional but realistic enterprise** with a coherent organizational story: teams, domains, approved technology stacks, rationale for those choices, existing services with real relationships, and software templates that let agents scaffold new applications within organizational constraints.

This is not a data dump of open-source projects. It is a curated enterprise narrative — the kind of organizational knowledge graph that a real enterprise would build over years, compressed into a ready-to-load Backstage catalog.

### Three Content Layers

| Layer | What It Provides | Agent Value |
|-------|-----------------|-------------|
| **Catalog Entities** | Components, APIs, systems, domains, groups — with rich metadata, tags, relationships, and lifecycle annotations | Agent discovers *what exists* and *how things connect* |
| **TechDocs** | ADRs, technology standards, compliance requirements, onboarding guides — attached to catalog entities | Agent understands *why* decisions were made and *what constraints apply* |
| **Software Templates** | Governed scaffolding templates for approved stack combinations | Agent can *act* — creating new components that conform to organizational standards |

### Design Principles

| Principle | What It Means |
|-----------|---------------|
| **Opinionated over exhaustive** | The catalog tells a specific enterprise story with clear technology preferences and rationale — not a neutral survey of all possible tools |
| **Depth over breadth** | The catalog may model a broader enterprise landscape, but the initial depth target is 50 well-documented components with full TechDocs, API, and relationship coverage — rather than hundreds of shallow skeleton entries |
| **Upstream-native** | Standard Backstage entity kinds, annotations, and relationships. No distribution-specific extensions. Loadable into any Backstage instance |
| **Agent-testable** | Rich enough to validate agent reasoning: an agent querying this catalog should be able to propose a grounded architecture, not just list entities |
| **Real open-source projects** | Components reference real OSS projects (PostgreSQL, Kafka, Quarkus) with accurate descriptions and links — not fictional `service-alpha` placeholders |

### Organizational Structure

The catalog models a fictional enterprise with:

- **Domains** — business areas (e.g., Payments, Customer, Platform) that own technology decisions
- **Teams** — cross-functional groups with ownership of systems and components
- **Approved Stacks** — explicit technology choices per domain, with rationale documented in TechDocs
- **Governance Constraints** — organizational rules (e.g., "all new services in the Payments domain must use PostgreSQL and Quarkus") that agents can discover and respect

### Content Scope

| Category | Target Coverage | Examples |
|----------|----------------|---------|
| **Databases** | 3+ approved choices with rationale | PostgreSQL, MongoDB, Redis |
| **Messaging** | 3+ systems with use-case guidance | Kafka, RabbitMQ, NATS |
| **Application Frameworks** | 3+ backend frameworks | Quarkus, Spring Boot, Node.js |
| **Frontend Frameworks** | 2+ frontend options | React, Angular |
| **Cross-cutting Concerns** | Authentication, logging, monitoring | Keycloak, OpenTelemetry |
| **Existing Services** | 5+ deployed services with dependencies | Payment API, Customer Service |
| **APIs** | OpenAPI definitions for existing services | REST and event-driven |
| **Templates** | Scaffolding for approved stack combinations | Quarkus + PostgreSQL, Spring Boot + Kafka |

### Long-Term Vision

The Simulated Enterprise Catalog becomes the standard test and demo fixture for agent-catalog interaction in the Backstage ecosystem — used by plugin developers testing catalog integrations, advocates demonstrating Backstage capabilities, and the [Backstage Agent CLI](./backstage-agent.md) as its primary validation environment.

## 5. Domain Context

### Backstage Catalog Model

The catalog uses standard Backstage entity kinds and relationships:

| Kind | Role |
|------|------|
| **Domain** | Business area (e.g., Finance, Platform) |
| **System** | Collection of related components serving a purpose |
| **Component** | Individual software component (service, library, website) |
| **API** | Interface definition (OpenAPI, AsyncAPI, gRPC) |
| **Resource** | Infrastructure (database instance, message broker) |
| **Group** | Team or organizational unit |

Relationships (`dependsOn`, `consumesApi`, `providesApi`, `partOf`, `ownedBy`) form the knowledge graph that agents traverse.

### Ecosystem Landscape

No realistic, enterprise-scale demo catalog exists in the Backstage ecosystem. The official Backstage examples contain ~30 entities. Bulk generators ([backstage-huge-catalog](https://github.com/codesandtags/backstage-huge-catalog)) produce thousands of synthetic entries with no semantic depth. The [backstage-catalogs](https://github.com/benwilcock/backstage-catalogs) repository is the most substantial enterprise simulation available — this product builds on that foundation by adding the TechDocs, templates, and domain narrative it currently lacks.

### Relationship to Backstage Agent CLI

The Simulated Enterprise Catalog is the primary validation environment for the [Backstage Agent CLI](./backstage-agent.md). The catalog must be rich enough that an agent using the CLI can:

1. Discover available components and their relationships
2. Read TechDocs to understand organizational rationale
3. Propose an architecture grounded in catalog constraints
4. Scaffold new components via software templates

The CLI and catalog are separate products with independent PRDs, but they are designed and validated together.

### Customer Validation

The composable architecture use case is rooted in a real customer request. A [prior implementation](https://github.com/rh-ita-ssa-devhub-org/rhdh-composable-plugin-experiment) (visual drag-and-drop architecture composition with scaffolder integration) received strong positive customer feedback. The catalog must support this workflow: browse approved components, compose an architecture, scaffold the result.

## 6. Business Direction

The catalog serves two strategic purposes:

1. **Validation environment for agent-catalog interaction.** The Backstage Agent CLI cannot be validated without realistic catalog content. The catalog is the "test data" that proves the thesis: agents produce better results when they have organizational context.

2. **Community contribution to the Backstage ecosystem.** There is no existing realistic demo catalog. Contributing one fills a gap that every Backstage evaluator, plugin developer, and advocate encounters. This positions the project as a community asset, not a vendor-specific artifact.

## 7. What This Document Does NOT Define

- **Catalog entity schemas and YAML structure** — Specific entity definitions, annotation conventions, and file organization are FSD scope.
- **TechDocs content** — Individual ADRs, standards documents, and onboarding guides are FSD scope.
- **Software template implementations** — Template parameters, scaffolder actions, and output structure are FSD scope.
- **Backstage Agent CLI** — The CLI is a separate product with its own [PRD](./backstage-agent.md).
- **Runtime environment** — How to run a Backstage instance loaded with this catalog (Docker, local dev, Kubernetes) is deployment scope.
- **Fictional company identity** — Company name, visual identity, and narrative details are creative decisions made during implementation.

## 8. Existing Codebase

### Ben Wilcock's Enterprise Catalog

**Repo:** [benwilcock/backstage-catalogs](https://github.com/benwilcock/backstage-catalogs)

The most substantial existing content — ~140 real OSS components organized into 7 overlay files:

- `enterprise-catalog-foundations.override.yaml` — Groups, Domains, Systems
- `enterprise-catalog-data.override.yaml` — Databases, messaging, search (40 components)
- `enterprise-catalog-platform.override.yaml` — Container orchestration, infrastructure
- `enterprise-catalog-devops-security.override.yaml` — CI/CD, GitOps, secrets
- `enterprise-catalog-ai-dataeng.override.yaml` — ML platforms, AI tooling
- `enterprise-catalog-frameworks.override.yaml` — Backend, frontend, low-code frameworks
- `enterprise-catalog-apis.override.yaml` — API definitions

Each entry includes rich descriptions, GitHub annotations, tags, links, and proper ownership. The catalog is loadable via a single index URL.

**Known gaps:** No TechDocs, no domain-specific rationale, no software templates, APIs need depth.

### Composable Architecture Plugin

**Repo:** [rh-ita-ssa-devhub-org/rhdh-composable-plugin-experiment](https://github.com/rh-ita-ssa-devhub-org/rhdh-composable-plugin-experiment)

A working Backstage dynamic plugin (v0.2.10) that implements visual composable architecture: drag-and-drop component selection, relationship drawing, and scaffolder integration. Includes a banking domain scenario with ~10 components and a scaffolder template.

Relevant as **prior art and customer validation** — demonstrates the composable architecture use case is real and wanted.

## 9. Success Outcomes

- An AI coding agent can query the catalog, read TechDocs, and propose a grounded architecture for a composable application — making technology choices that respect organizational constraints rather than guessing.
- The catalog loads into any standard Backstage instance via a single catalog location entry — no plugins, no custom configuration.
- Plugin developers and advocates can use the catalog as a turnkey test and demo fixture without building their own content.
- The catalog is rich enough to exercise all three Backstage pillars (catalog, TechDocs, templates) in a single end-to-end workflow.
- The organizational narrative is coherent: an enterprise architect reviewing the catalog would recognize it as a plausible (if simplified) enterprise landscape.

---

## References

- [Backstage Agent CLI PRD](./backstage-agent.md)
- [benwilcock/backstage-catalogs](https://github.com/benwilcock/backstage-catalogs) — Primary content source
- [Composable Architecture Plugin](https://github.com/rh-ita-ssa-devhub-org/rhdh-composable-plugin-experiment) — Customer-validated prior art
- [benwilcock/rhdh-lab](https://github.com/benwilcock/rhdh-lab) — Runtime environment
- [Backstage MCP Actions RFC #30218](https://github.com/backstage/backstage/issues/30218)
- [MCP Catalog Modeling RFC #32062](https://github.com/backstage/backstage/issues/32062)
