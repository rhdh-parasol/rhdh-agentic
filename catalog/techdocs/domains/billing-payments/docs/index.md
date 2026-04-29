# Billing & Payments Domain Handbook

Domain handbook for the Billing & Payments domain at Parasol Insurance Group.
Owner: `billing-payments-engineering`.

## Domain Overview

The Billing & Payments domain contains **14 components** across 4 systems:

| System | Purpose |
|---|---|
| `premium-collection-system` | Scheduled premium collection, direct debit mandates, payment retry logic |
| `payment-processing-system` | Real-time payment authorization, PCI-DSS cardholder data handling |
| `refunds-adjustments-system` | Refund processing, premium adjustments, credit note generation |
| `billing-account-system` | Billing account lifecycle, ledger management, statement generation |

**Language breakdown:** Java (13), Python (1).
**API style:** REST (all 14 components).

### Published APIs

| API | Version | Visibility | Tags | Description |
|---|---|---|---|---|
| Premium Payment API | v2 | Public | `pci-dss` | Payment submission, status inquiry, refund initiation |

### Notable Tags

`ledger`, `open-banking`, `direct-debit`, `reconciliation`, `pci-dss`.

### Compliance Requirements

**PCI-DSS Level 1** compliance is mandatory for all components in `payment-processing-system` and any component that handles, transmits, or stores cardholder data. This is the highest PCI compliance level and requires annual on-site audit.

---

## Approved Stack Matrix

| Technology | Status | Count | Rationale |
|---|---|---|---|
| **Quarkus** | Preferred | New Java services | Default framework for all new services. Fast startup, low memory footprint on OpenShift. |
| **JBoss EAP** | Allowed | Legacy services | Existing EAP workloads may remain. New services must use Quarkus. |
| **Python** | Restricted | 1 component | Limited to reconciliation batch jobs. Not permitted for payment-path services. |
| **OpenShift 4** | Required | All | Every component must deploy to OpenShift 4. |
| **IBM MQ** | Required | Payment flows | Guaranteed-delivery messaging for all payment transactions. Ensures no payment message is lost. |
| **Keycloak** | Required | All public-facing | OAuth 2.0 / OIDC for Premium Payment API and internal service auth. |
| **ACS (Advanced Cluster Security)** | Required | All | Runtime security scanning, vulnerability detection, and compliance enforcement. |
| **Guardium** | Required | PCI-DSS scope | Database activity monitoring for all datastores in PCI-DSS scope. Required for audit trail. |
| **Instana** | Required | All | APM, distributed tracing, and real-time alerting. PCI-DSS requires full transaction traceability. |

### Tech Radar Summary

- **ADOPT:** Quarkus, JBoss EAP, OpenShift 4, IBM MQ, Keycloak, ACS, Guardium, Instana

---

## Governance Rules

### Mandatory

1. All new services **MUST** use **Quarkus**. Python is restricted to non-payment batch workloads only.
2. All services **MUST** deploy to **OpenShift 4** using Parasol Helm charts with PCI-hardened base images.
3. All payment transaction messaging **MUST** use **IBM MQ** with guaranteed delivery. AMQ Streams (Kafka) is not approved for payment-critical paths due to at-least-once semantics.
4. All public APIs **MUST** authenticate via **Keycloak** (OAuth 2.0 / OIDC).
5. All components in PCI-DSS scope **MUST** have **Guardium** database activity monitoring enabled.
6. All components **MUST** have **ACS** runtime policies active. No container may run without ACS enforcement.
7. All components **MUST** emit distributed traces to **Instana**. Trace context propagation is mandatory across all service boundaries.
8. Components tagged `pci-dss` **MUST NOT** log, cache, or persist cardholder data (PAN, CVV, expiry) in plaintext. Tokenization is required before any storage.
9. Components tagged `ledger` **MUST** implement double-entry accounting with immutable audit logs.
10. Components tagged `direct-debit` **MUST** implement retry logic with configurable backoff and dead-letter queue processing via IBM MQ.

### Requires Approval

- Introducing any new datastore (requires `billing-payments-engineering` lead + Data Governance + PCI QSA review).
- Using AMQ Streams (Kafka) for any messaging within this domain (must demonstrate the flow is not payment-critical).
- Any change to the Premium Payment API contract (requires `billing-payments-engineering` lead + API governance review).
- Using Python for any new component (must justify why Java/Quarkus is insufficient).
- Storing any data outside the EU (data residency requirement for payment data).

### Forbidden

- Running services outside OpenShift 4.
- Using an unapproved message broker for payment transactions (IBM MQ only).
- Logging or caching cardholder data in plaintext.
- Disabling ACS or Guardium on any component.
- Using non-tokenized PAN in any inter-service communication.
- Deploying components without Instana instrumentation.

---

## When to Deviate

Deviations in the Billing & Payments domain carry elevated risk due to PCI-DSS compliance obligations. The exception process is stricter than other domains.

### Exception Process

1. **Raise** an exception request in `#billing-payments-engineering` Slack channel with:
   - The governance rule being deviated from.
   - The technical justification.
   - The PCI-DSS impact assessment (if the deviation affects components in PCI scope).
   - The proposed alternative and its trade-offs.
   - The expected duration (permanent or time-boxed).
2. **Review** by:
   - `billing-payments-engineering` lead (required).
   - `parasol-platform-engineering` member (required).
   - PCI Qualified Security Assessor (required if deviation affects PCI-DSS scope).
3. **Record** the approved exception as an ADR in the affected component's `docs/adrs/` directory.
4. **Tag** the component with `governance-exception` in the Backstage catalog.
5. **Re-validate** the exception at every PCI-DSS audit cycle (annual).

### Common Valid Exceptions

- **Open Banking integrations:** Third-party open-banking APIs may require non-standard authentication flows. These must be approved by the PCI QSA and documented in an ADR.
- **Reconciliation batch jobs:** Python-based reconciliation jobs that do not handle cardholder data may use relaxed messaging requirements (AMQ Streams instead of IBM MQ) with approval.
- **Vendor payment gateways:** If a payment gateway vendor requires a specific SDK or protocol (e.g., ISO 8583), the integration service may use non-standard technologies with full security review.

### Questions

Contact `billing-payments-engineering` via the internal developer portal or `#billing-payments-engineering` Slack channel.
For PCI-DSS-specific questions, contact `parasol-security-engineering`.
