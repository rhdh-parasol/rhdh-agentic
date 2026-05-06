# Architecture Decision Records

Key architectural decisions for the FNOL System.

| ADR | Status | Summary |
|-----|--------|---------|
| [001](001-channel-normalization.md) | Accepted | Use a dedicated channel adapter service to normalize all inbound FNOL formats into the canonical Claims Data Model |
| [002](002-triage-rules-engine.md) | Accepted | Use a configurable rules engine (Drools) for claim triage routing instead of hardcoded logic or ML-based routing |
