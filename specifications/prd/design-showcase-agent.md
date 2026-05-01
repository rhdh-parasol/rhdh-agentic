# Design Showcase Agent

**Status:** Draft
**Date:** 2026-04-28
**Author:** Stephanie

> A remote coding agent that helps enterprise architects design and scaffold composable applications — by discovering catalog components, reading TechDocs for organizational standards, identifying reusable services, and scaffolding governed services via approved templates on a running RHDH instance.

---

## 1. Mission

Provide a remote coding agent that gives enterprise architects a catalog-aware scaffolding workflow — one that connects to a running RHDH instance, discovers what exists, learns the organization's standards, identifies reusable components, and scaffolds new services using approved templates — so that architecture decisions are grounded in organizational reality rather than guesswork.

## 2. The Problem

- **The gap between whiteboard and working demo is weeks, not hours.** An architect has a design idea — maybe a new composable application, a new integration pattern, a new service topology. Turning that into something stakeholders can see running requires deep knowledge of the full stack: catalog content, organizational standards, available templates, and how they fit together. Most PoCs die in this gap.
- **PoCs built without organizational context are unconvincing.** When an architect hand-builds a demo, they often use whatever technology is convenient rather than what the organization actually approves. The result doesn't reflect real enterprise constraints, making it hard to argue that the design will work in production.
- **The architecture rationale lives in the architect's head.** Even when a PoC gets built, the reasoning behind technology choices, the gaps between demo and production, and the path to productization are rarely documented. Stakeholders see a running app but can't evaluate the production viability of the design.
- **AI agents can build code fast but lack organizational awareness.** A coding agent can scaffold a service in minutes — but without access to the enterprise catalog, it picks arbitrary technologies, ignores existing services it could reuse, and produces something disconnected from organizational reality.

## 3. Target Users

| Persona | Profile | Key Need |
|---------|---------|----------|
| **Enterprise Architect** | Designs systems and integration patterns, needs to validate and communicate design ideas | A fast, catalog-aware workflow to scaffold a composable application that respects organizational constraints |
| **Engineer** | Implements the production version of designs that architects propose | A concrete scaffolded service with documented architecture decisions, so they understand the expected outcome and the gap between demo and production |
| **Developer Advocate** | Demonstrates RHDH/Backstage capabilities at conferences, workshops, and customer meetings | A reproducible end-to-end demo that shows the full catalog → TechDocs → scaffold workflow |
| **Product Manager / Stakeholder** | Validates product ideas before committing engineering resources | A tangible artifact — beyond slides and diagrams — that shows how organizational context shapes architecture decisions |

## 4. Product Direction

### Core Idea

A remote coding agent that connects to a running RHDH instance via any agent-capable tool (Claude Code, Claude CLI, Cursor, or similar). The agent chains the three foundational Backstage pillars — Software Catalog, TechDocs, and Software Templates — into a single, interactive workflow. Any agent that can execute shell commands can participate.

The agent does not write application code. It discovers what exists, learns the organization's standards, identifies what can be reused, and scaffolds new services using the organization's own approved templates. The value is in the agent's ability to reason across catalog, documentation, and templates — making architecture decisions that respect organizational constraints.

### Interface and Interaction Model

The agent operates through any tool that supports agent capabilities — Claude Code, Claude CLI GUI, Cursor IDE, or similar. The architect interacts conversationally: describing the design need, answering clarifying questions, and approving proposals before the agent acts. The agent does not operate autonomously — it presents plans and waits for approval at key steps.

### Authentication and Authorization

The agent requires proper authentication and authorization to access the RHDH instance. It operates under the architect's access permissions — if the architect cannot see a catalog component or use a template, neither can the agent. Only allowed CLIs and tools may be used by the agent; the set of permitted tools is an explicit security boundary.

### The Agent Workflow

The agent follows a five-step catalog-aware scaffolding workflow:

1. **Authenticate** — Establish authenticated access to the RHDH instance under the architect's permissions. The agent must verify it has the necessary authorization before proceeding.
2. **Discover** — Query the catalog for the target domain and existing services. Understand what components, APIs, and systems already exist, who owns them, and how they connect.
3. **Learn** — Read TechDocs to find approved technology stacks, ADRs, and governance rules for the target domain. Understand why decisions were made and what constraints apply.
4. **Reuse** — Identify components that already exist and can be consumed rather than rebuilt. The agent proposes which existing services, APIs, and resources the new service should integrate with. The architect reviews and approves before proceeding.
5. **Scaffold** — Execute a software template that matches the domain's constraints (e.g., Quarkus + PostgreSQL + Kafka for a domain that mandates that stack). The new service is scaffolded according to organizational standards.

A future **Verify** step — confirming the new service appears in the catalog with correct ownership, dependencies, and metadata — is out of scope until templates can publish to a real GitHub org.

### What the Agent Produces

| Artifact | Purpose |
|----------|---------|
| **Scaffolded service** | A new component created via an approved software template, conforming to organizational standards |
| **Architecture rationale** | Documents why specific technology choices were made, which catalog components and TechDocs informed those decisions, and which existing services are reused |
| **Gap analysis** | Explicitly lists what the scaffolded result does not fulfill (security, compliance, performance, enterprise standards), why those gaps exist in the demo context, and what production would require |
| **Production architecture path** | Documents the architecture that would fit enterprise needs at actual implementation — what changes, what stays, what new work is required |

### Design Principles

| Principle | What It Means |
|-----------|---------------|
| **Interactive with approval gates** | The agent works conversationally with the architect and pauses for approval at key decision points. It does not act autonomously — the architect stays in control. |
| **Secure by default** | The agent authenticates as the architect, respects RHDH access controls, and only uses explicitly allowed CLIs and tools. |
| **Scaffold, don't write code** | The agent uses the organization's approved software templates to create new components. It does not generate custom application code. |
| **Grounded in organizational context** | Every technology choice references what the catalog and TechDocs say — not what the agent guesses. If the catalog says PostgreSQL is approved for a domain, the agent scaffolds with PostgreSQL. |
| **Honest about gaps** | The agent explicitly documents where the demo cuts corners and what production would require. No pretending a scaffolded demo is production-ready. |
| **Use what exists** | The agent uses whatever the RHDH instance already provides — catalog content, TechDocs, software templates. It discovers and works with what is there. |

### Scope and Assumptions

The agent assumes a **running, properly configured RHDH instance** with catalog entities, TechDocs content, and software templates already loaded. The agent does not set up RHDH, configure plugins, or build platform infrastructure. The architect must have valid credentials and appropriate access to the instance.

What the agent does:

- Queries the existing catalog for components, services, APIs, and their relationships
- Reads TechDocs for organizational standards, ADRs, and governance rules
- Identifies existing components that can be reused
- Scaffolds new services via approved software templates
- Documents architecture rationale, gaps, and the production path

What the agent does NOT do:

- Write application code
- Set up or configure the RHDH instance
- Create new software templates
- Deploy or run the scaffolded service (future scope, blocked by template publish capability)

## 5. Domain Context

### Relationship to Sibling Products

This product is the primary validation scenario for the other two projects in the RHDH Agentic repository:

| Product | Role | Relationship |
|---------|------|--------------|
| **[Backstage Agent CLI](./backstage-agent.md)** | Intent-based CLI for agent-catalog interaction | The Design Showcase Agent may use the CLI as one way to interact with Backstage. It can also use Backstage APIs, MCP Actions, or any available interface. |
| **[Simulated Enterprise Catalog](./simulated-enterprise-catalog.md)** | Realistic enterprise catalog content (Parasol Insurance) | Provides the catalog entities, TechDocs, and software templates that the agent queries. The primary validation environment — but the agent works with any Backstage catalog. |

### Three Foundational Layers

The end-to-end demo chains three layers that are already implemented:

| Layer | What It Provides |
|-------|-----------------|
| **Simulated Enterprise Catalog** | Catalog entities with domains, systems, components, APIs, ownership, and relationships |
| **TechDocs Content** | Organizational standards, ADRs, approved technology stacks, governance rules |
| **Software Templates** | Governed scaffolding templates for approved stack combinations |

### Backstage/RHDH Capabilities the Agent Uses

| Capability | How the Agent Uses It |
|------------|----------------------|
| **Software Catalog** | Discovers available components, services, APIs, ownership, and dependencies |
| **TechDocs** | Reads organizational standards, ADRs, compliance requirements |
| **Software Templates** | Scaffolds new components using approved templates |

## 6. Business Direction

Enterprise architects are the key decision-makers for platform adoption. When an architect can go from design idea to scaffolded, catalog-grounded service in hours instead of weeks — using AI that reasons across the organization's actual catalog, documentation, and templates — it demonstrates the value of Backstage/RHDH as the organizational knowledge layer in a way that slides and diagrams cannot.

This product is the "so what?" for the entire RHDH Agentic project. The CLI and catalog are enabling infrastructure. The Design Showcase Agent is what stakeholders experience: an architect says "I want to build a service in this domain," and a governed, catalog-aware scaffolding workflow produces the result — grounded in the enterprise context that only Backstage can provide.

For Red Hat, this positions RHDH as the platform that makes AI-assisted development enterprise-aware — not just another AI coding tool, but the layer that makes all AI tools better by providing organizational context.

## 7. What This Document Does NOT Define

- **Agent implementation architecture** — How the agent is built, what framework it uses, and how it connects to RHDH are Architect decisions.
- **Specific demo scenario** — Whether the first demo scaffolds a claims processing service in Parasol Insurance or another domain service is implementation scope.
- **RHDH instance setup** — The agent assumes a running, configured RHDH instance. How that instance is installed, configured, or managed is out of scope.
- **Allowed tool list** — The specific set of CLIs and tools the agent is permitted to use is a security/policy decision, not a product decision.
- **Verify step** — Confirming the scaffolded service appears in the catalog with correct metadata is future scope, blocked until templates can publish to a real GitHub org.
- **Backstage Agent CLI** — The CLI is a separate product. This agent may use it but does not require it.

## 8. Existing Codebase

### Simulated Enterprise Catalog (Parasol Insurance)

The three foundational layers are implemented and demo-proven:

| Layer | Demo |
|-------|------|
| Catalog Entities | `openspec/specs/catalog-entities/demo.md` |
| Software Templates | `openspec/specs/software-templates/demo.md` |
| TechDocs Content | `openspec/specs/techdocs/demo.md` |

### RHDH Software Templates

**Repo:** [red-hat-developer-hub-software-templates](https://github.com/redhat-developer/red-hat-developer-hub-software-templates)

RHDH-specific templates for ArgoCD, Quarkus, Spring Boot, Tekton, Ansible. Available templates the agent can use when they match the architect's design.

## 9. Success Outcomes

- An enterprise architect can describe a design need and the agent discovers relevant catalog components, reads organizational standards, identifies reusable services, and scaffolds a new service using an approved template — all in a single interactive session.
- Every technology choice the agent makes references specific catalog entries and TechDocs content — the architect can trace each decision back to organizational data.
- The scaffolded result ships with architecture rationale, gap analysis, and a production path — stakeholders and engineers can evaluate both the demo and the production viability.
- The agent works with any running Backstage or RHDH instance — on Kubernetes, OpenShift, or local — using whatever catalog content, TechDocs, and templates that instance provides.
- The demo is reproducible: another architect (or the same agent) can re-run the workflow and get a consistent result.

---

## Dependencies

- **Requires:** CLI Foundation (#31) — the agent needs commands to interact with the catalog, TechDocs, and templates
- **Blocked by:** Template publish/register (#35) — the Verify step cannot be demonstrated until templates can publish to a real GitHub org

## References

- [Backstage Agent CLI PRD](./backstage-agent.md)
- [Simulated Enterprise Catalog PRD](./simulated-enterprise-catalog.md)
- [RHDH Software Templates](https://github.com/redhat-developer/red-hat-developer-hub-software-templates)
- [End-to-End Demo Issue #39](https://github.com/rhdh-parasol/rhdh-agentic/issues/39)
