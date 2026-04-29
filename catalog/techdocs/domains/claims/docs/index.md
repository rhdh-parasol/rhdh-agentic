# Claims Domain Handbook

The Claims domain manages the full claims lifecycle across all lines of business:
intake (FNOL), triage, adjuster assignment, damage estimation, reserve setting,
fraud detection, settlement payment, subrogation recovery, and litigation management.

**Owner**: `claims-engineering` (13 engineers)
**Components**: 27 services across 6 systems
**APIs**: 3 (FNOL Submission, Claims Status, Fraud Score)

## Approved Stack Matrix

| Technology | Status | Count | Rationale |
|-----------|--------|-------|-----------|
| **Java (Quarkus)** | Required | 17 components | Primary runtime for all transactional claims services. Quarkus preferred for new services; JBoss EAP acceptable for migration of existing services. |
| **Python** | Allowed | 7 components | Used for estimation, valuation, and ML workloads (fraud scoring, damage estimation, coverage verification). Allowed only for analytical or ML components. |
| **Node.js** | Allowed | 2 components | Used for notification services (claimant-notification-service) and real-time event consumers. Allowed for I/O-bound, non-transactional workloads only. |
| **REST (OpenAPI 3.0.3)** | Required | 24 components | Default communication pattern. All synchronous service interfaces must use REST with OpenAPI specs following org-wide conventions. |
| **SOAP/ACORD XML** | Restricted | 1 component | Legacy only (fnol-channel-adapter-service). No new SOAP interfaces. Existing ACORD integrations maintained for third-party adjuster compatibility. |
| **OpenShift 4** | Required | All | Container orchestration platform. All claims services run on OpenShift. |
| **AMQ Streams (Kafka)** | Preferred | — | Event-driven claim lifecycle events (FNOL created, status changed, payment approved). Use for all asynchronous domain events. |
| **Apache Camel** | Preferred | — | Integration framework for channel adapters and external system connectors (ACORD, third-party adjusters). |
| **Keycloak** | Required | — | Authentication for adjusters, claimants, and SIU investigators. OIDC/OAuth2 flows. |
| **Red Hat ACS** | Required | — | Container security scanning. Mandatory for all images before production deployment. |
| **Instana** | Required | — | APM and distributed tracing. Claims services must meet p99 < 500ms latency SLO. |

### ML/AI Stack (Fraud Detection)

| Technology | Status | Rationale |
|-----------|--------|-----------|
| **watsonx.ai** | Preferred | Model training for fraud scoring and network graph analysis. |
| **OpenShift AI** | Trial | Model serving infrastructure for real-time fraud scoring (fraud-score-service). |
| **IBM Granite** | Trial | Foundation model for fraud text analysis (claim narrative screening). |
| **watsonx.governance** | Required for ML | Bias detection and model drift monitoring for all ML models in production. |

## Governance Rules

### Mandatory

- All new claims services MUST be written in Java using Quarkus, unless the workload
  is analytical/ML (use Python) or I/O-bound notification delivery (Node.js allowed).
- All services MUST expose REST APIs documented with OpenAPI 3.0.3.
- All claim state transitions MUST emit Kafka events to the claims event topic.
- All services processing PII (claimant names, addresses, policy details) MUST
  register with the GDPR Compliance System and implement DSAR support.
- Fraud scoring models MUST be registered with watsonx.governance before
  production deployment.
- All services MUST meet the p99 < 500ms latency SLO (customer-facing).

### Requires Approval

- Using a database technology other than the domain's standard PostgreSQL/Db2 stack.
- Introducing a new third-party integration (external adjuster, legal service provider).
- Deploying an ML model that makes automated claim decisions (fraud referral to SIU
  is allowed; automated denial is not without Claims Director approval).
- Adding a new ACORD message type to the channel adapter.

### Forbidden

- New SOAP interfaces. Use REST for all new integrations; wrap legacy SOAP
  endpoints in REST adapters if external systems require them.
- Storing unmasked PII in application logs.
- Direct database access from services outside the claims domain. Use the
  published APIs (FNOL Submission, Claims Status, Fraud Score).
- Running ML inference outside OpenShift AI / watsonx.ai managed infrastructure.

## Key Systems

| System | Purpose | Components |
|--------|---------|------------|
| `fnol-system` | First Notice of Loss intake and triage | fnol-intake-service, fnol-triage-router, fnol-channel-adapter-service, coverage-verification-service, claimant-notification-service |
| `claims-assessment-system` | Adjuster assignment and damage estimation | adjuster-assignment-service, damage-estimation-service, reserve-calculation-service, claims-decision-service, claim-status-tracker |
| `claims-payment-system` | Settlement and payment processing | claims-settlement-service, payment-disbursement-service, subrogation-recovery-service |
| `claims-fraud-detection-system` | ML-based fraud scoring | fraud-score-service, fraud-network-graph-service, siu-referral-service, fraud-rules-engine |
| `claims-document-system` | Document management | claims-document-ingestion, document-classification-service, claims-archive-service |
| `claims-litigation-system` | Legal proceedings management | litigation-tracking-service, panel-solicitor-gateway (legacy SOAP), recovery-accounting-service |

## When to Deviate

If you need to use a technology not listed above:

1. **Document the need** in a system ADR explaining why the approved stack
   does not meet the requirement.
2. **Get approval** from the Claims Engineering tech lead and Platform Engineering.
3. **Assess security impact** — any new runtime or framework must pass ACS
   scanning and Instana instrumentation requirements.
4. **Time-box the exception** — deviations are granted for a specific use case,
   not as blanket approvals. Re-evaluate at the next quarterly architecture review.

Exceptions granted in the past:

- Graph database (Neo4j) for fraud-network-graph-service — approved because
  relational databases cannot efficiently traverse the multi-hop fraud networks
  required for SIU investigations.
- ACORD XML in fnol-channel-adapter-service — maintained for backward
  compatibility with third-party loss adjusters who cannot migrate to REST.
