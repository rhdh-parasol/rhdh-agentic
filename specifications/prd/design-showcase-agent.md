# Design Showcase Agent

**Status:** Draft
**Date:** 2026-04-28
**Author:** Stephanie

> A remote coding agent that helps enterprise architects turn design ideas into runnable PoC applications — grounded in organizational context from a running RHDH instance — for showcasing to stakeholders and giving engineers a clear picture of expected outcomes.

---

## 1. Mission

Provide a remote coding agent that gives enterprise architects a fast path from design idea to runnable PoC — one that connects to a running RHDH instance, is grounded in the organization's own catalog, TechDocs, and templates, clearly documents the architecture and its enterprise trade-offs, and is simple enough to showcase to stakeholders and communicate expected outcomes to engineers.

## 2. The Problem

- **The gap between whiteboard and working demo is weeks, not hours.** An architect has a design idea — maybe a new composable application, a new integration pattern, a new service topology. Turning that into something stakeholders can see running requires deep knowledge of the full stack: RHDH setup, plugin configuration, backend services, frontend UI, deployment. Most PoCs die in this gap.
- **PoCs built without organizational context are unconvincing.** When an architect hand-builds a demo, they often use whatever technology is convenient rather than what the organization actually approves. The result doesn't reflect real enterprise constraints, making it hard to argue that the design will work in production.
- **The architecture rationale lives in the architect's head.** Even when a PoC gets built, the reasoning behind technology choices, the gaps between demo and production, and the path to productization are rarely documented. Stakeholders see a running app but can't evaluate the production viability of the design.
- **AI agents can build code fast but lack organizational awareness.** A coding agent can scaffold a service in minutes — but without access to the enterprise catalog, it picks arbitrary technologies, ignores existing services it could reuse, and produces something disconnected from organizational reality.

## 3. Target Users

| Persona | Profile | Key Need |
|---------|---------|----------|
| **Enterprise Architect** | Designs systems and integration patterns, needs to validate and communicate design ideas | Turn a design concept into a runnable PoC with architecture documentation — fast enough to keep pace with decision-making |
| **Engineer** | Implements the production version of designs that architects propose | A concrete PoC with documented architecture decisions, so they understand the expected outcome and the gap between demo and production |
| **Developer Advocate** | Demonstrates RHDH/Backstage capabilities at conferences, workshops, and customer meetings | Turnkey demo applications that tell a compelling enterprise story and can be rebuilt or adapted for different audiences |
| **Product Manager / Stakeholder** | Validates product ideas before committing engineering resources | A tangible artifact — beyond slides and diagrams — that they can see running and react to |

## 4. Product Direction

### Core Idea

A remote coding agent that connects to a running RHDH instance. The agent is not built into RHDH — it runs externally via any agent-capable tool (Claude Code, Claude CLI, Cursor, or similar) and accesses RHDH through authenticated APIs. An architect describes a design idea interactively; the agent queries the organization's catalog, TechDocs, and templates, proposes a grounded architecture, seeks approval at key decision points, builds a simple PoC, deploys it, and documents everything — including what shortcuts were taken and what production would require.

The PoC is intentionally simple — its purpose is to visualize a design for stakeholders and give engineers a concrete picture of expected outcomes. The architecture documentation is the enterprise-grade artifact: it explains what was built, why, what constraints apply in production, and what would need to change.

### Interface and Interaction Model

The agent operates through any tool that supports agent capabilities — Claude Code, Claude CLI GUI, Cursor IDE, or similar. The architect interacts conversationally: describing the design need, answering clarifying questions, and approving proposals before the agent acts. The agent does not operate autonomously — it presents plans and waits for approval at key steps.

### Authentication and Authorization

The agent requires proper authentication and authorization to access the RHDH instance. It operates under the architect's access permissions — if the architect cannot see a catalog component or use a template, neither can the agent. Only allowed CLIs and tools may be used by the agent; the set of permitted tools is an explicit security boundary.

### What the Agent Produces

| Artifact | Purpose |
|----------|---------|
| **Runnable PoC application** | Simple, working code deployed to RHDH/Backstage — stakeholders can see it running, engineers can inspect it |
| **Architecture Specification Document (ASD)** | Documents the design grounded in enterprise context: approved stacks, existing services, organizational constraints, and the rationale behind each choice |
| **Gap analysis** | Explicitly lists what the PoC does not fulfill (security, compliance, performance, enterprise standards), why those shortcuts were taken for demo purposes, and what production would require |
| **Production architecture path** | Documents the architecture that would fit enterprise needs at actual implementation — what changes, what stays, what new work is required |

### How the Agent Works

The agent connects to the RHDH instance remotely and works interactively with the architect:

1. **Authenticate** — The agent establishes authenticated access to the RHDH instance under the architect's permissions.
2. **Understand the design intent** — The architect describes what they want to showcase. The agent clarifies scope and identifies the key things the demo needs to demonstrate.
3. **Discover organizational context** — The agent queries the RHDH instance: catalog components, approved technology stacks, existing services, TechDocs with organizational standards and ADRs. This grounds the PoC in enterprise reality.
4. **Propose architecture and get approval** — The agent proposes an architecture that fits enterprise constraints, explains its choices by referencing catalog data and organizational standards, and identifies where the PoC will simplify for demo purposes. The architect reviews and approves before the agent proceeds.
5. **Build and deploy the PoC** — The agent produces a runnable application using a two-tier deployment strategy:
   - **Software templates first** — If RHDH has a software template that matches what the PoC needs (e.g., a Quarkus service, a React frontend), the agent uses it to scaffold and deploy the component.
   - **Code generation fallback** — If no suitable template exists, the agent generates code and pushes it to a GitHub repository.
   - **Best-effort deployment** — If the RHDH instance has CI/CD integrations available, the agent uses them to build and deploy. If not, it produces a deployable artifact with clear deployment instructions.
   - **Catalog registration** — The result is registered in the Backstage catalog so it is visible on the platform.
   Code is intentionally simple — clear enough for a showcase audience.
6. **Document everything** — The ASD, gap analysis, and production architecture path are all produced as part of the deliverable.

### Design Principles

| Principle | What It Means |
|-----------|---------------|
| **Interactive with approval gates** | The agent works conversationally with the architect and pauses for approval at key decision points. It does not act autonomously — the architect stays in control. |
| **Secure by default** | The agent authenticates as the architect, respects RHDH access controls, and only uses explicitly allowed CLIs and tools. |
| **Showcase over production** | Demo code optimizes for clarity and runnability, not for enterprise hardening. The documentation carries the enterprise story. |
| **Grounded in organizational context** | Every technology choice references what the catalog says — not what the agent guesses. If the catalog says PostgreSQL is approved for Payments, the PoC uses PostgreSQL. |
| **Honest about gaps** | The agent explicitly documents where the PoC cuts corners and what production would require. No pretending a demo is production-ready. |
| **Best-effort deployment** | If the RHDH instance has CI/CD integrations available, the agent uses them to build and deploy the PoC. If not, it produces a deployable artifact with clear instructions. The instance may run on Kubernetes, OpenShift, or locally — the agent works with whatever build and deploy access is available. |
| **Use what exists** | The agent uses whatever the RHDH instance already provides — software templates, catalog, TechDocs, CI/CD integrations — before generating from scratch. But it is not limited to what templates provide. |

### Scope and Assumptions

The agent assumes a **running, properly configured RHDH instance**. The agent does not set up RHDH, configure plugins, or build platform infrastructure. The architect must have valid credentials and appropriate access to the instance.

What the agent does:

- Queries the existing catalog, TechDocs, and templates on the RHDH instance
- Proposes architecture grounded in what the instance already knows
- Scaffolds PoC components via software templates when they match
- Generates application code when no template fits
- Deploys the PoC using available CI/CD integrations when the instance supports it — otherwise produces a deployable artifact with instructions
- Registers the result in the Backstage catalog
- Documents the architecture, gaps, and production path

## 5. Domain Context

### Relationship to Sibling Products

This product complements the other two projects in the RHDH Agentic repository:

| Product | Role | Relationship |
|---------|------|--------------|
| **[Backstage Agent CLI](./backstage-agent.md)** | Intent-based CLI for agent-catalog interaction | The Design Showcase Agent may use the CLI when available, but does not depend on it. It can use Backstage APIs, MCP Actions, or any available interface. |
| **[Simulated Enterprise Catalog](./simulated-enterprise-catalog.md)** | Realistic enterprise catalog content | Provides the organizational context the agent queries. The catalog is the validation environment — but the agent works with any Backstage catalog, not just the simulated one. |

### Backstage/RHDH Capabilities the Agent Uses

| Capability | How the Agent Uses It |
|------------|----------------------|
| **Software Catalog** | Discovers available components, services, APIs, ownership, and dependencies |
| **TechDocs** | Reads organizational standards, ADRs, compliance requirements |
| **Software Templates** | Scaffolds new components when a matching template exists |
| **CI/CD Integrations (if available)** | Uses whatever build and deployment capabilities the instance provides to deploy the PoC |
| **Catalog Registration** | Registers the PoC result in the catalog so it is visible in Backstage |
| **GitHub Integration** | Pushes generated code to repositories when software templates don't cover the need |

## 6. Business Direction

Enterprise architects are the key decision-makers for platform adoption. When an architect can go from design idea to running demo in hours instead of weeks — using AI that is grounded in their organization's actual catalog — it demonstrates the value of Backstage/RHDH as the organizational knowledge layer in a way that slides and diagrams cannot.

This product is the "so what?" for the entire RHDH Agentic project. The CLI and catalog are enabling infrastructure. The Design Showcase Agent is what stakeholders experience: an architect says "I want to build X," and a working demo appears — grounded in the enterprise context that only Backstage can provide.

For Red Hat, this positions RHDH as the platform that makes AI-assisted development enterprise-aware — not just another AI coding tool, but the layer that makes all AI tools better by providing organizational context.

## 7. What This Document Does NOT Define

- **Agent implementation architecture** — How the agent is built, what framework it uses, and how it connects to RHDH are Architect decisions.
- **Specific demo scenarios** — Which PoC scenarios are supported first (composable architecture, new service, integration pattern) is implementation scope.
- **RHDH instance setup** — The agent assumes a running, configured RHDH instance. How that instance is installed, configured, or managed is out of scope.
- **CI/CD pipeline specifics** — Which CI/CD tools are available depends on the instance. The agent discovers and uses what is there.
- **Allowed tool list** — The specific set of CLIs and tools the agent is permitted to use is a security/policy decision, not a product decision.
- **Backstage Agent CLI** — The CLI is a separate product. This agent may use it but does not require it.

## 8. Existing Codebase

### RHDH Software Templates

**Repo:** [red-hat-developer-hub-software-templates](https://github.com/redhat-developer/red-hat-developer-hub-software-templates)

RHDH-specific templates for ArgoCD, Quarkus, Spring Boot, Tekton, Ansible. Available templates the agent can use when they match the architect's design.

## 9. Success Outcomes

- An enterprise architect can describe a design idea to the agent and receive a PoC application within hours — not weeks of manual effort.
- The PoC is grounded in real organizational context: technology choices reference what the RHDH catalog says is approved, available, and standard.
- When the RHDH instance has CI/CD integrations and deployment targets available, the PoC is deployed and running. When it doesn't, the architect receives a deployable artifact with clear instructions.
- Every PoC ships with an Architecture Specification Document, gap analysis, and production path — stakeholders and engineers can evaluate both the demo and the production viability.
- The agent works with any running Backstage or RHDH instance — on Kubernetes, OpenShift, or local — using whatever catalog content, templates, and CI/CD integrations that instance provides.

---

## References

- [Backstage Agent CLI PRD](./backstage-agent.md)
- [Simulated Enterprise Catalog PRD](./simulated-enterprise-catalog.md)
- [RHDH Software Templates](https://github.com/redhat-developer/red-hat-developer-hub-software-templates)
