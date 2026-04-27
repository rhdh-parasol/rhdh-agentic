# RHDH Agentic

Tooling that connects AI coding agents to [Backstage](https://backstage.io) and its distributions like [Red Hat Developer Hub](https://developers.redhat.com/rhdh) (RHDH).

## The Problem

AI coding agents (Claude Code, Cursor, GitHub Copilot) are transforming how developers build software. These tools excel at individual coding tasks — but they lack organizational context. They don't know your approved technology stacks, architectural standards, service dependencies, or compliance requirements.

The result: AI-generated code that ignores organizational conventions, duplicates existing services, and bypasses governance.

## The Idea

Backstage already holds the enterprise knowledge graph — the software catalog, TechDocs, software templates, and scorecards. AI tools produce dramatically better results when they can access this context. **RHDH Agentic** bridges the gap between AI coding agents and the platform that knows what the organization has, what it allows, and how things should be built.

## What This Project Provides

1. **[Backstage Agent CLI](specifications/prd/backstage-agent.md)** (`backstage-agent`) — Intent-based commands (inspired by [GitHub CLI](https://cli.github.com/)) that agents use to interact with the Backstage backend. A single command may aggregate multiple API calls, focusing on *what needs to be done* rather than how the API works. Works with upstream Backstage and distributions like RHDH.

2. **[A Simulated Enterprise Catalog](specifications/prd/simulated-enterprise-catalog.md)** — Sample content representing a realistic enterprise with multiple databases, messaging systems, application frameworks, and existing services — complete with ownership, dependencies, and documentation. This gives agents something meaningful to reason about.

3. **An End-to-End Demo** — A coding agent helps an architect design and bootstrap a composable application: querying the catalog for available components, reading TechDocs for organizational standards, proposing an architecture that fits enterprise constraints, and scaffolding the solution via software templates.

## Use Case: Composable Architecture

An enterprise architect wants to build composable applications by assembling approved components from the catalog.

**Without Backstage integration:** The agent knows only the local codebase. It guesses at technology choices and ignores organizational patterns.

**With Backstage integration:** The agent discovers that PostgreSQL is the approved database for the payments domain, reads the ADR explaining why, finds three existing services it can reuse, and scaffolds a Quarkus service using the team's standard template — all governed and visible in the catalog.

## Built with Agents, for Agents

This project serves a dual purpose. It provides tooling for agents to interact with Backstage — and it is itself built primarily using AI coding agents.

We use this project to develop and validate **agentic SDLC practices** in an enterprise context: each SDLC persona (product manager, architect, developer) is backed by a dedicated agent skill, version-controlled alongside the code. Skills and patterns proven here are designed to be adopted by other teams building on RHDH and Backstage.

We use **[OpenSpec](https://openspec.dev/)** to manage changes through a structured artifact workflow (proposal → specs → design → tasks). Run `/opsx:onboard` to walk through a complete cycle.

See **[Agentic Development](docs/agentic-development.md)** for the full walkthrough.

## Upstream Alignment

This project builds on and complements upstream Backstage work:

- **[MCP Actions](https://github.com/backstage/backstage/issues/30218)** — Backstage exposes plugin functionality as MCP tools. This project adds an intent layer on top: multi-step workflows, context enrichment, and domain-aware defaults.
- **[BEP-0013 AI Skills](https://github.com/backstage/backstage/pull/33173)** — Shared AI skills for Backstage development. Orthogonal — BEP-0013 helps agents code *on* Backstage; this project helps agents *use* Backstage as a platform.

## Status

Early stage — architecture and design in progress.

## License

Apache-2.0
