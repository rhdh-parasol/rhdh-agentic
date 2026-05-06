# ADR-001: Channel Normalization via Adapter Pattern

**Status**: Accepted
**Date**: 2024-03-15

## Context

The FNOL System accepts loss notifications from multiple channels: REST (web portal,
mobile app), SOAP/ACORD XML (third-party loss adjusters), flat-file (legacy batch
feeds), and EDI (broker integrations). Each channel uses a different payload format,
field naming convention, and validation approach.

Without normalization, every downstream service (triage, coverage verification,
fraud scoring) would need to understand all inbound formats, creating an N×M
integration problem.

## Decision

Introduce a dedicated **fnol-channel-adapter-service** that normalizes all inbound
FNOL payloads into the canonical Parasol Claims Data Model before forwarding to
the fnol-intake-service.

The adapter:

- Accepts all channel-specific formats
- Validates channel-specific fields (e.g., ACORD XML schema validation)
- Maps to the canonical Claims Data Model
- Forwards a single, uniform REST payload to the intake service

## Alternatives Considered

### Alternative 1: Per-channel intake endpoints on fnol-intake-service

Each channel gets its own endpoint on the intake service (e.g., `/fnol/rest`,
`/fnol/acord`, `/fnol/edi`).

**Rejected because**: This couples the intake service to channel-specific formats.
Adding a new channel format requires changes to the core intake service, increasing
deployment risk. The intake service already handles business logic (policy validation,
claim record creation) — adding format parsing to it violates single responsibility.

### Alternative 2: API Gateway transformation

Use the API Gateway's built-in request transformation to normalize payloads
before they reach the intake service.

**Rejected because**: ACORD XML-to-JSON transformation is complex (nested structures,
optional segments, industry-specific code lists). Gateway transformation rules would
become unmanageable. Debugging transformation failures in the gateway is harder than
in a dedicated service with its own logs and health checks.

## Consequences

**Positive**:

- Adding a new channel format requires changes only to the adapter, not to
  downstream services
- The canonical Claims Data Model is enforced at a single point
- Channel-specific validation logic is isolated and testable
- The adapter can be scaled independently based on channel volume

**Negative**:

- Adds one hop of latency (~10ms) to the FNOL pipeline
- The adapter is a single point of failure for all FNOL intake — mitigated by
  running multiple replicas behind the load balancer
- Maintaining ACORD XML compatibility requires ongoing effort as the ACORD
  standard evolves
