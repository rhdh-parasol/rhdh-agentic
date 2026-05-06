# Policy Administration Domain Handbook

The Policy Administration domain manages the core policy lifecycle shared across
all lines of business: inception, mid-term adjustments (endorsements), renewals,
lapses, cancellations, and reinstatements.

**Owner**: `policy-platform-engineering` (team)
**Components**: 16 services across 4 systems
**APIs**: 2 (Policy Query API v3, Policy Endorsement API v2)

## Approved Stack Matrix

| Technology | Status | Count | Rationale |
|-----------|--------|-------|-----------|
| **Java (Quarkus)** | Required | 14 components | Primary runtime for all policy services. Quarkus preferred for new services. Event-driven capabilities (Reactive Messaging) align with the domain's CQRS and event-sourcing patterns. |
| **Python** | Restricted | 1 component | Used only for policy-analytics-service (actuarial analysis). Not approved for transactional policy services. |
| **Node.js** | Restricted | 1 component | Used only for policy-notification-service. Not approved for new services in this domain. |
| **REST (OpenAPI 3.0.3)** | Required | 15 components | Default synchronous interface. All policy query and mutation endpoints must be REST. |
| **Kafka (AMQ Streams)** | Required | — | Policy event streaming is a core architectural pattern. All policy state changes MUST emit events to the policy event stream. Explicit in the catalog: policy-event-streaming-service. |
| **Elasticsearch** | Preferred | — | Powers the Policy Search System for sub-second policy lookup across all lines (policy-search-index-service). |
| **OpenShift 4** | Required | All | Container platform. |
| **Keycloak** | Required | — | Service-to-service authentication. Policy data access requires authenticated service identity. |
| **Instana** | Required | — | APM. Policy query services must meet p99 < 500ms (customer-facing). |
| **Apache Camel** | Preferred | — | Integration patterns for policy document generation and external system connectors. |

### Architectural Patterns

| Pattern | Where Used | Rationale |
|---------|-----------|-----------|
| **CQRS** | Policy Lifecycle System | Separate read (query) and write (command) paths. Policy Search System is the optimized read model. |
| **Event Sourcing** | Policy Lifecycle System | Policy version history maintained as immutable event stream for regulatory audit (every change to a policy is an event). |
| **Event-Driven** | All systems | Policy state changes propagated via Kafka. Downstream consumers (billing, claims, underwriting) subscribe to policy events. |

## Governance Rules

### Mandatory

- All new policy services MUST be written in Java using Quarkus.
- All policy state changes MUST emit Kafka events (policy-created, policy-amended,
  policy-cancelled, policy-renewed, policy-lapsed, policy-reinstated).
- All services MUST maintain full audit trails — every policy mutation must be
  traceable to an authenticated identity and timestamp. The Audit Trail System
  (`audit-trail-system`) consumes policy events automatically.
- Policy data is classified as **Confidential** — encryption at rest and in transit
  is mandatory. See org-wide security standards.
- The Policy Query API (`policy-query-api`) is the only approved interface for
  cross-domain policy lookups. Other domains (claims, billing, underwriting) MUST
  NOT access policy databases directly.

### Requires Approval

- Adding a new policy event type to the Kafka schema.
- Introducing a new search index beyond Elasticsearch (e.g., graph-based policy search).
- Changing the policy document generation pipeline (regulatory notice templates
  require Compliance Engineering sign-off).
- Adding endorsement types that affect premium calculations (requires Underwriting
  Engineering coordination).

### Forbidden

- Direct database queries from services outside the Policy Administration domain.
  Use the Policy Query API or Policy Endorsement API.
- Deleting policy records. Cancelled and lapsed policies are retained indefinitely
  for regulatory compliance. Use status transitions, not deletion.
- Synchronous calls to external systems during policy inception or endorsement
  workflows. Use Kafka events and eventual consistency for downstream notifications.

## Key Systems

| System | Purpose | Key Components |
|--------|---------|---------------|
| `policy-lifecycle-system` | Policy record of truth, version history | policy-inception-service, policy-amendment-service, policy-event-streaming-service, policy-version-history-service |
| `policy-search-system` | High-performance policy lookup | policy-search-index-service, policy-coverage-query-service, policy-holder-search-service |
| `policy-document-system` | Document generation and distribution | policy-schedule-generator, policy-certificate-service, renewal-notice-service, policy-notification-service |
| `cancellation-reinstatement-system` | Policy lifecycle endpoints | cancellation-processing-service, reinstatement-service, lapse-management-service, statutory-notice-service |

## When to Deviate

If you need a technology not listed above:

1. **Explain the gap** — what does the approved stack lack for your use case?
2. **Propose to the Policy Platform Engineering tech lead** with a written ADR.
3. **Assess downstream impact** — policy is a shared platform consumed by every
   line of business. Changes to event schemas or API contracts affect claims,
   billing, and underwriting.
4. **Regulatory check** — policy changes may require Compliance Engineering review
   if they affect audit trail completeness or data retention.

The bar for exceptions is higher in this domain than in others because Policy
Administration is a shared platform. Changes ripple across the entire organization.
