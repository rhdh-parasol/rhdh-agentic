# FSD: {{Feature Name}}

**Status:** Draft | Review | Approved | Superseded
**Date:** {{YYYY-MM-DD}}
**Author:** Architect Agent
**Parent PRD:** {{link to PRD}}
**GitHub Issue:** #{{issue-number}}
**ADR Dependencies:** #{{adr-numbers}}

---

## Goal

{{One sentence. Tie to a specific ADR decision or PRD goal.}}

## User Story

**As a** {{persona}},
**I want** {{specific capability}},
**so that** {{benefit tied to project success metric}}.

## Data Model

{{Entities, tables, or types with field names, types, keys, and constraints. Be concrete.}}

```
// Example type definition — use the project's language
type Example struct {
    ID   string
    Name string
}
```

## APIs

{{Entry points, function signatures, parameters, behavior, error conditions.}}

```
// Example API signature — use the project's language
func ExampleAction(ctx Context, param Type) (Result, error)
```

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

```bash
# Example validation command
{{test command}}
```

{{Description of what passing looks like.}}

## Open Questions

1. {{Question requiring human input, if any}}

---

## Revision History

| Version | Date | Author | Summary |
|---------|------|--------|---------|
| 0.1 | {{date}} | Architect Agent | Initial draft |
