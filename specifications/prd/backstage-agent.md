# Backstage Agent CLI

**Status:** Draft | Review | **Approved** | Superseded
**Date:** 2026-04-07
**Author:** Marcel Hild

> An intent-based command-line interface (`backstage-agent`) that gives AI coding agents organizational context from Backstage.

---

## 1. Mission

Give coding agents structured, intent-based access to the enterprise knowledge graph in Backstage — so they can make architecture decisions, discover existing services, read organizational standards, and scaffold applications within enterprise constraints.

## 2. The Problem

- AI coding agents (Claude Code, Cursor, GitHub Copilot) produce code without organizational context. They guess at technology choices, duplicate existing services, and bypass governance — because they cannot see the enterprise software landscape.
- Backstage already holds the knowledge graph that agents need: the software catalog (what exists), TechDocs (why decisions were made), software templates (how to build correctly), and scorecards (what "good" looks like). But there is no agent-accessible interface to this knowledge.
- Backstage REST APIs require agents to understand Backstage internals. MCP tools (RFC [#30218](https://github.com/backstage/backstage/issues/30218)) expose atomic operations (`get-entity`, `execute-template`) but are mechanism-level — they don't provide the intent abstraction agents need.
- Developers increasingly route around their internal developer portals to use AI tools directly. Those tools build their own context systems, fragmenting the developer experience Backstage was designed to unify.

## 3. Target Users

| Persona | Profile | Key Need |
|---------|---------|----------|
| **Coding Agent** | Claude Code, Cursor, GitHub Copilot — the primary CLI consumer | Structured, discoverable, non-interactive commands with predictable output and clear error recovery |
| **Enterprise Architect** | Designs composable applications, directs agents, reviews proposals | Agent makes architecture proposals grounded in organizational reality — approved stacks, existing services, team conventions |
| **Platform Engineer** | Operates Backstage (or a distribution like RHDH), deploys and configures the CLI | Simple setup, standard Backstage auth, no new infrastructure requirements |

The coding agent is the consumer; the enterprise architect is the beneficiary. The CLI is optimized for agent consumption: structured output, no interactive prompts, deterministic errors.

## 4. Product Direction

### Core Capabilities

The CLI provides intent-based access to the three pillars of Backstage:

- **Catalog** — Discover and inspect components, services, APIs, and their relationships. Understand what exists, who owns it, and how it connects.
- **TechDocs** — Search and read organizational standards, ADRs, compliance requirements, and technology rationale. Understand why decisions were made.
- **Templates** — List available scaffolding templates and execute them. Build new components that conform to organizational standards.

One CLI command may aggregate multiple API calls — focusing on what the agent needs to accomplish, not how the Backstage API works. Like `gh` for GitHub: a higher-level abstraction over the underlying APIs.

### Interface Category: Agentic User Interface (AUI)

The CLI represents a new interface category — an **Agentic User Interface (AUI)** — distinct from traditional CLIs, GUIs, or conversational UIs (CUIs):

| Interface | Control Model | Interaction Pattern |
|-----------|--------------|---------------------|
| **CLI** | Human types commands, reads output | Command → Response |
| **GUI** | Human clicks, system reacts | Action → Feedback |
| **CUI** | Human asks, system answers | Request → Response |
| **AUI** | Human states intent, agent acts autonomously | Intent → Autonomous Multi-Step Execution |

In an AUI, the agent decides intermediate steps, asks for clarification only when needed, and delivers results. The interface becomes an **oversight interface** — the human monitors, intervenes, and approves rather than steering each step. This shifts UX patterns from input fields to trust signals, auditability, and intervention points.

The `backstage-agent` CLI is the AUI that gives coding agents autonomous access to organizational context. Its design principles follow from this interface category.

### Agent-Native Design Principles

The CLI is designed for machine consumption first, human readability second:

| Principle | What It Means |
|-----------|---------------|
| **Non-interactive** | No stdin prompts, no confirmations. All input via flags and arguments. Agents cannot handle interactive prompts. |
| **`--help` as protocol contract** | Complete API surface: command signatures, output format, safety classification, gating requirements, and error recovery primitives. Agents discover the CLI cold from `--help` alone. |
| **Safe by default** | Read-only operations as defaults. Mutations require explicit flags. Destructive operations are documented in `--help` but clearly marked as high-risk and gated behind explicit opt-in or policy/config enablement. |
| **Next-step hints** | Every output suggests the logical next command. Agents navigate by running commands, not reading external docs. |
| **Structured output** | JSON default for agent consumption. Human-readable format available via flag. |
| **Informative errors** | What failed, why it likely failed, and what to try next — including concrete recovery commands. |
| **Trust level awareness** | Operations categorized as read-only, reversible, destructive, or external — enabling agent frameworks to make approval decisions. |

### Long-Term Vision

The CLI becomes a first-class Backstage interface alongside the web UI — the way agents and automation interact with the platform across the entire SDLC: from architecture and scaffolding through inner-loop development, CI/CD, and Day-2 operations.

## 5. Domain Context

### Backstage Ecosystem

- **MCP Actions** (RFC [#30218](https://github.com/backstage/backstage/issues/30218)) provide atomic tools that plugins register via `ActionsRegistryService`. 11 tools are merged (5 catalog, 5 scaffolder, 1 auth). The CLI sits above this as the intent layer — complementary, not competing.
- **BEP-0013 AI Skills** are orthogonal. They help agents code *on* Backstage (development tooling). This CLI helps agents *use* Backstage as a platform (runtime interaction).
- **MCP Catalog Modeling** ([#32062](https://github.com/backstage/backstage/issues/32062)) defines how MCP servers are represented in the catalog. Relevant for catalog content conventions.
- A Platform CLI for Backstage is being developed in the community with the same `gh` CLI inspiration and auth-first approach. It targets human developers and CI/CD. This CLI targets coding agents as the primary consumer.
- **Backstage CLI Module System** — The Backstage CLI (`@backstage/cli`) has a mature plugin architecture: packages with `backstage.role === 'cli-module'` in `package.json` are auto-discovered and loaded via `createCliModule()` from `@backstage/cli-node`. 11+ official modules exist (build, test, lint, auth, config, github, etc.) following the `@backstage/cli-module-{name}` naming convention. This creates a strategic packaging question: the agent CLI could ship as a standalone binary, as a Backstage CLI module (`@backstage/cli-module-agent`), or both. The packaging decision is FSD/Architect scope — the PRD defines the capability, not the delivery mechanism.

### Backstage Three Pillars

| Pillar | Role | Agent Interaction |
|--------|------|-------------------|
| **Software Catalog** (the map) | Current snapshot of the IT landscape | Agent queries available services, databases, frameworks |
| **Software Templates** (placement) | Governed scaffolding for new components | Agent scaffolds chosen architecture via templates |
| **TechDocs / Plugins** (inspection) | Standards, ADRs, monitoring, CI/CD | Agent reads organizational standards and checks health |

### Key Constraint

The CLI authenticates as a regular Backstage user — same backend, same RBAC. No special agent infrastructure. This means agents inherit existing governance: if a user can't see a component, neither can their agent.

### Distributions

The CLI targets upstream Backstage and works with distributions like Red Hat Developer Hub (RHDH). Distribution-specific features (RHDH dynamic plugins, RHDH RBAC) are future scope and would be additive — the core CLI is distribution-agnostic.

## 6. Business Direction

Backstage-based developer portals are at a strategic inflection point. 90% of developers now use AI coding tools daily (DORA 2025). These tools build their own context systems — fragmenting the developer experience that internal developer portals were designed to unify.

The CLI establishes Backstage as the orchestration layer for AI-assisted software development in enterprise environments. The strategic position: **Backstage makes AI tools better by providing the organizational context they lack** — rather than building AI features into Backstage itself.

This is a foundation for:

- Context APIs — programmatic access to the enterprise knowledge graph
- Governance hooks — ensuring agents respect organizational constraints
- The CLI as a first-class interface alongside the web UI

Customer validation exists: a composable architecture use case rooted in a real customer request has been prototyped and received strong positive feedback.

## 7. What This Document Does NOT Define

- **CLI backend architecture** — Whether the CLI talks to REST APIs, MCP Actions, or both is an Architect decision, not a product decision.
- **Authentication implementation** — Auth mechanism (static tokens, OIDC Device Auth, etc.) is FSD scope.
- **Command-level specifications** — Individual command signatures, input/output schemas, and acceptance criteria are FSD scope.
- **Simulated enterprise catalog** — The demo catalog content is a separate product with its own PRD.
- **Technology stack and packaging** — Implementation language, framework choices, and delivery mechanism (standalone binary, Backstage CLI module, or both) are Architect decisions.
- **Distribution-specific features** — RHDH dynamic plugin management, RHDH RBAC administration, and other distribution-specific operations are future scope.

## 8. Success Outcomes

- Agents using the CLI make architecture decisions that respect organizational constraints — approved stacks, existing services, team conventions — rather than guessing.
- The CLI is the preferred agent interface over direct API calls because it provides context enrichment and intent abstraction that raw APIs cannot.
- Platform engineers can deploy and configure the CLI without new infrastructure — it works with any Backstage instance and standard Backstage auth.
- The CLI works with upstream Backstage and distributions like RHDH without modification.
- New capability areas (beyond catalog, templates, TechDocs) can be added without redesigning the core CLI architecture.
- The architecture must allow the agent functionality to be packaged as a Backstage CLI module (`@backstage/cli-module-agent`) in the future — even if the initial delivery is a standalone binary. This ensures upstream integration remains possible without a rewrite.

---

## References

- [Backstage MCP Actions RFC #30218](https://github.com/backstage/backstage/issues/30218)
- [BEP-0013: AI Skills](https://github.com/backstage/backstage/pull/33173)
- [MCP Catalog Modeling RFC #32062](https://github.com/backstage/backstage/issues/32062)
- [Backstage CLI Module System](https://backstage.io/docs/tooling/cli/overview/) — `createCliModule()` API for CLI extensions
- [BEP-0009: Plugin Metadata](https://github.com/backstage/backstage/blob/master/beps/0009-plugin-metadata/README.md) — Package role discovery (`backstage.role`)
- [Composable Architecture Plugin](https://github.com/rh-ita-ssa-devhub-org/rhdh-composable-plugin-experiment) — Customer-validated prior art
