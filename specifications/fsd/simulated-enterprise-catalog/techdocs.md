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

## TechDocs Coverage

Not every entity needs TechDocs. The depth-over-breadth principle applies — roughly 19 well-written TechDocs sites rather than skeleton stubs for every entity.

| Entity Level | Gets TechDocs | Count |
|-------------|---------------|-------|
| Domain | All domains | 4 |
| System | Priority systems with key architectural decisions | ~6 |
| Resource | Key infrastructure with technology rationale | ~3 |
| Component | Components with non-obvious design or onboarding needs | ~5 |
| Group | Architecture board (org-wide standards) | 1 |

## Document Types

Each TechDocs site contains one or more of the following document types. The document type determines the required sections — not the exact content, which is an implementation decision.

### 1. Domain Handbooks

Attached to each Domain entity. The primary artifact agents use to understand what technologies are approved and why.

**Required sections:**

- **Approved Stack** — table with: category, technology, status (required/preferred/allowed), and rationale for each choice
- **Governance Rules** — what is mandatory, what requires approval, what is forbidden
- **When to Deviate** — criteria for requesting an exception to the approved stack

### 2. Architecture Decision Records (ADRs)

Attached to System entities for key technology decisions. Each ADR documents a specific decision with its trade-offs.

**Required sections:**

- Status, Date, Context
- Decision (what was decided)
- Alternatives Considered (at least one, with reason for rejection)
- Consequences (positive and negative)

### 3. Technology Rationale Docs

Attached to key Resource entities (databases, message brokers). Explains why this technology was selected over alternatives.

**Required sections:**

- Approved use cases (what this technology is for)
- Not-approved use cases (what to use instead)
- Alternatives considered with reasons for rejection

### 4. Component Onboarding Guides

Attached to key Components. Helps developers (and agents) understand how to work with or extend the component.

**Required sections:**

- Prerequisites
- Key design decisions (with cross-references to relevant ADRs)

### 5. Organization-wide Standards

Attached to the architecture-board Group. Cross-cutting engineering standards that apply across all domains.

**Required topics:** API design conventions, observability requirements, security/auth patterns.

## Agent Queryability

The TechDocs content must be rich enough for an agent to derive concrete answers. Specifically:

- An agent reading a Domain handbook must be able to answer: "What framework should I use for a new service in this domain?" with a specific technology and rationale.
- An agent reading an ADR must be able to answer: "Why was X chosen over Y?" with specific trade-offs.
- An agent reading a Resource rationale doc must be able to answer: "Should I use this technology for use case Z?" with a yes/no and reasoning.

## Acceptance Criteria

- **Given** a Domain entity with TechDocs, **when** an agent reads the content, **then** it finds an approved stack matrix with technology names, statuses, and rationale.
- **Given** a System entity with an ADR, **when** an agent reads it, **then** it finds: context, decision, at least one alternative considered, and consequences (positive and negative).
- **Given** the Payments domain handbook, **when** an agent queries what framework to use, **then** the answer "Quarkus" is derivable with rationale.
- **Given** a Resource with TechDocs, **when** an agent reads the rationale doc, **then** it finds: approved use cases, not-approved use cases, and alternatives considered.
- **Given** any TechDocs site, **when** built with standard Backstage TechDocs tooling, **then** the build succeeds with no errors.

## Invariants

- Every entity with a `backstage.io/techdocs-ref` annotation has a buildable TechDocs site at the referenced location.
- Every ADR follows the required sections: Status, Date, Context, Decision, Alternatives, Consequences.
- Every Domain handbook includes an Approved Stack table and Governance Rules section.
- No TechDocs content references fictional URLs or placeholder links.

## Technical Constraints

- **Upstream-native** (PRD): Standard Backstage TechDocs with `techdocs-core` plugin. No custom mkdocs plugins.
- **Agent-testable** (PRD): Content must be rich enough for an agent to derive concrete technology recommendations from prose.
- **Depth over breadth** (PRD): ~19 well-written sites, not 50 skeleton stubs.

## Out of Scope

- **TechDocs build infrastructure** — CI/CD for generating and publishing TechDocs sites is deployment scope.
- **Custom mkdocs themes or plugins** — Standard techdocs-core only.
- **API reference docs** — Auto-generated docs from OpenAPI specs are separate from hand-written TechDocs.
- **Directory structure and mkdocs.yml layout** — How TechDocs files are organized on disk is an implementation decision.

---

## Revision History

| Version | Date | Author | Summary |
|---------|------|--------|---------|
| 0.1 | 2026-04-16 | Architect Agent | Initial draft |
| 0.2 | 2026-04-16 | Architect Agent | Strip implementation details, raise to spec level |
