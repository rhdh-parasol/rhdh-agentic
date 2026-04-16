# FSD: {{Feature Name}}

**Status:** Draft | Review | Approved | Superseded
**Date:** {{YYYY-MM-DD}}
**Author:** Architect Agent
**Parent PRD:** {{link to PRD}}
**ADR Dependencies:** {{adr-slugs}}

---

## Goal

{{One sentence. Tie to a specific ADR decision or PRD goal.}}

## User Story

**As a** {{persona}},
**I want** {{specific capability}},
**so that** {{benefit tied to project success metric}}.

## What Exists

{{Inventories, categories, counts, and their purpose. Use tables and prose.
Define what the feature produces — not file layouts, code blocks, or YAML structures.
Leave implementation decisions (naming, organization, syntax) to epics.}}

## Requirements

{{Contracts, constraints, rules, and relationships that must hold.
What must connect to what? What must be queryable? What are the boundaries?}}

## Acceptance Criteria

- **Given** {{precondition}}, **when** {{action}}, **then** {{observable outcome}}.
- **Given** {{precondition}}, **when** {{action}}, **then** {{observable outcome}}.

## Invariants

{{Rules that must always hold. These become assertion checks in tests.}}

- {{Invariant 1}}
- {{Invariant 2}}

## Technical Constraints

- {{Constraint from ADR #N, decision D-X}}

## Out of Scope

- {{What is explicitly deferred and why}}

## Validation

{{How to verify the feature works. Describe what passing looks like in prose.
Do not write validation scripts — those are implementation artifacts.
The Acceptance Criteria above define what "done" means; this section describes
how a reviewer or agent would confirm it.}}

## Open Questions

1. {{Question requiring human input, if any}}

---

## Revision History

| Version | Date | Author | Summary |
|---------|------|--------|---------|
| 0.1 | {{date}} | Architect Agent | Initial draft |
