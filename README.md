# RHDH Agentic

Tooling that connects AI coding agents to [Red Hat Developer Hub](https://developers.redhat.com/rhdh) (RHDH), the enterprise distribution of [Backstage](https://backstage.io).

## The Problem

AI coding agents (Claude Code, Cursor, GitHub Copilot) are transforming how developers build software. These tools excel at individual coding tasks — but they lack organizational context. They don't know your approved technology stacks, architectural standards, service dependencies, or compliance requirements.

The result: AI-generated code that ignores organizational conventions, duplicates existing services, and bypasses governance.

## The Idea

RHDH already holds the enterprise knowledge graph — the software catalog, TechDocs, software templates, and scorecards. AI tools produce dramatically better results when they can access this context. **RHDH Agentic** bridges the gap between AI coding agents and the platform that knows what the organization has, what it allows, and how things should be built.

## What This Project Provides

1. **A CLI for Agents** — Intent-based commands (inspired by [GitHub CLI](https://cli.github.com/)) that agents use to interact with the Backstage backend. A single command may aggregate multiple API calls, focusing on *what needs to be done* rather than how the API works.

2. **A Simulated Enterprise Catalog** — Sample content representing a realistic enterprise with multiple databases, messaging systems, application frameworks, and existing services — complete with ownership, dependencies, and documentation. This gives agents something meaningful to reason about.

3. **An End-to-End Demo** — A coding agent helps an architect design and bootstrap a composable application: querying the catalog for available components, reading TechDocs for organizational standards, proposing an architecture that fits enterprise constraints, and scaffolding the solution via software templates.

## Use Case: Composable Architecture

An enterprise architect wants to build composable applications by assembling approved components from the catalog.

**Without RHDH integration:** The agent knows only the local codebase. It guesses at technology choices and ignores organizational patterns.

**With RHDH integration:** The agent discovers that PostgreSQL is the approved database for the payments domain, reads the ADR explaining why, finds three existing services it can reuse, and scaffolds a Quarkus service using the team's standard template — all governed and visible in the catalog.

## Built with Agents, for Agents

This project serves a dual purpose. It provides tooling for agents to interact with RHDH — and it is itself built primarily using AI coding agents.

We use this project to develop and validate **agentic SDLC practices** in an enterprise context: reusable agent skills, AI-assisted workflows, and patterns that scale across teams. Every stage of the software development lifecycle — from architecture and scaffolding through inner-loop development, CI/CD, and Day-2 operations — is an opportunity to test how agents and humans collaborate effectively.

Skills and patterns proven here are designed to be adopted by other teams building on RHDH and Backstage.

## Upstream Alignment

This project builds on and complements upstream Backstage work:

- **[MCP Actions](https://github.com/backstage/backstage/issues/30218)** — Backstage exposes plugin functionality as MCP tools. This project adds an intent layer on top: multi-step workflows, context enrichment, and domain-aware defaults.
- **[BEP-0013 AI Skills](https://github.com/backstage/backstage/pull/33173)** — Shared AI skills for Backstage development. Orthogonal — BEP-0013 helps agents code *on* Backstage; this project helps agents *use* RHDH as a platform.

## Status

Early stage — architecture and design in progress.

## License

Apache-2.0
