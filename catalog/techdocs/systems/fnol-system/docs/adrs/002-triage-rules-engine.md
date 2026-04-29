# ADR-002: Rules Engine for Triage Routing

**Status**: Accepted
**Date**: 2024-06-01

## Context

After FNOL intake, each claim must be routed to the correct assessment workflow:

- **Automated fast-track**: low-value claims (e.g., windshield replacement) that
  can be settled without adjuster involvement
- **Virtual desk adjustment**: medium-severity claims handled by desk-based adjusters
- **Field adjuster dispatch**: high-severity or complex claims requiring on-site
  inspection

The routing logic depends on: claim type, estimated value, policy type, geographic
location, fraud score, and adjuster workload. These rules change frequently —
the claims operations team adjusts thresholds and routing criteria quarterly
without code deployments.

## Decision

Implement triage routing in the **fnol-triage-router** using a configurable
rules engine (Drools on Quarkus) with rules defined in external decision tables
that the claims operations team can update without developer involvement.

Rules are versioned and stored in a Git-backed repository. Changes go through
a review process but do not require service redeployment.

## Alternatives Considered

### Alternative 1: Hardcoded routing logic in the triage service

Implement routing as if/else branches in Java code.

**Rejected because**: Routing criteria change quarterly. Each change would require
a code change, PR review, CI/CD pipeline, and production deployment — too slow
for operational agility. The claims operations team cannot self-serve.

### Alternative 2: ML-based routing model

Train a machine learning model on historical claims data to predict the optimal
routing queue.

**Rejected because**: Triage routing must be explainable and auditable. Regulators
can ask why a specific claim was fast-tracked or escalated. A rules engine produces
a deterministic, traceable decision path. An ML model's routing decisions are harder
to explain to regulators and adjusters. However, the fraud score (from the Fraud
Score API) is an ML-derived input to the rules — so ML influences routing indirectly
without replacing the auditable decision logic.

## Consequences

**Positive**:

- Claims operations team can adjust routing rules without developer involvement
- Every routing decision produces an auditable rule-trace (which rules fired, in
  what order, with what inputs)
- Rules are testable in isolation — decision table scenarios can be validated
  before publishing
- The fraud score (ML-derived) feeds into rules as a first-class input, combining
  ML intelligence with deterministic routing

**Negative**:

- Drools adds complexity to the Quarkus runtime — larger container image, more
  memory usage (~200MB additional)
- Decision tables have a learning curve for the operations team — initial training
  required
- Rule conflicts can cause unexpected routing — mitigated by conflict resolution
  priority ordering and pre-publish validation
