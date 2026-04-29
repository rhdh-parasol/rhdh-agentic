# Underwriting Domain Handbook

Domain handbook for the Underwriting domain at Parasol Insurance Group.
Owner: `underwriting-engineering`.

## Domain Overview

The Underwriting domain contains **22 components** across 5 systems:

| System | Purpose |
|---|---|
| `quote-bind-system` | End-to-end quote generation and policy binding |
| `rating-engine-system` | Premium calculation and actuarial rate application |
| `risk-assessment-system` | Risk scoring, ML-based retention prediction, rules evaluation |
| `policy-endorsement-system` | Mid-term policy amendments and endorsement processing |
| `renewal-management-system` | Renewal offer generation and retention workflows |

**Language breakdown:** Java (16), Python (5), Go (1).
**API style:** REST (21 of 22 components), gRPC (1 internal actuarial service).

### Published APIs

| API | Version | Visibility | Description |
|---|---|---|---|
| Quote & Bind API | v4 | Public | Quote creation, premium indication, policy binding |
| Premium Rating API | v5 | Internal | Rate table lookup, premium calculation, factor application |

### Notable Tags

`rules-engine` (2 components), `ML` (retention scoring), `actuarial`.

---

## Approved Stack Matrix

| Technology | Status | Count | Rationale |
|---|---|---|---|
| **Quarkus** | Preferred | 16 Java components | Default framework for all new Java services. Cloud-native, fast startup on OpenShift. |
| **JBoss EAP** | Allowed | Legacy only | Existing EAP workloads may remain; new services must not use EAP without exception. |
| **Python** | Allowed | 5 components | Permitted for actuarial models, ML pipelines, and data science workloads. |
| **OpenShift 4** | Required | All | Every component must deploy to OpenShift 4. No exceptions. |
| **AMQ Streams (Kafka)** | Preferred | Event-driven flows | Default async messaging for event sourcing, rating pipelines, and domain events. |
| **IBM MQ** | Allowed | Legacy integrations | Used for mainframe and legacy system integration. New point-to-point messaging should prefer AMQ Streams. |
| **Keycloak** | Required | All public-facing | OAuth 2.0 / OIDC identity provider for the Quote & Bind API and internal service-to-service auth. |
| **watsonx.ai** | Preferred | ML workloads | Production ML inference for retention scoring and risk models. |
| **Db2** | Required | Transactional data | Primary relational database for policy, quote, and rating data. |
| **RHDH** | Trial | Developer portal | Red Hat Developer Hub for service catalog and TechDocs. Not yet mandated. |
| **OpenShift AI** | Trial | ML training | Experimental use for model training pipelines. Production inference uses watsonx.ai. |

### Tech Radar Summary

- **ADOPT:** Quarkus, JBoss EAP, OpenShift 4, AMQ Streams (Kafka), IBM MQ, Keycloak, watsonx.ai, Db2
- **TRIAL:** RHDH, OpenShift AI

---

## Governance Rules

### Mandatory

1. All new services **MUST** use **Quarkus** unless the workload is actuarial or ML (use Python).
2. All services **MUST** deploy to **OpenShift 4** using standard Parasol Helm charts.
3. All public APIs **MUST** authenticate via **Keycloak** (OAuth 2.0 / OIDC).
4. All inter-service async communication **MUST** use **AMQ Streams** unless integrating with a mainframe system (IBM MQ permitted).
5. All transactional data **MUST** be stored in **Db2**. No alternative RDBMS without Platform Engineering approval.
6. Components tagged `rules-engine` **MUST** version their rule sets and publish change events to AMQ Streams.
7. ML models (retention scoring, risk assessment) **MUST** be deployed via **watsonx.ai** inference endpoints and registered in the model registry.

### Requires Approval

- Using **JBoss EAP** for a new service (requires `underwriting-engineering` lead + Platform Engineering sign-off).
- Introducing a new programming language beyond Java or Python.
- Using **IBM MQ** for a net-new integration that does not involve a mainframe system.
- Deploying ML training workloads to **OpenShift AI** (trial status; requires `underwriting-engineering` lead approval).

### Forbidden

- Running services outside OpenShift 4 (no VM-based deployments).
- Using an unapproved identity provider instead of Keycloak.
- Storing PII in non-Db2 datastores without Data Governance approval.
- Deploying ML models to production without watsonx.ai inference endpoints.

---

## When to Deviate

Deviations from this handbook require a written exception recorded as an ADR in the component's TechDocs.

### Exception Process

1. **Raise** an exception request in `#underwriting-engineering` Slack channel with:
   - The governance rule being deviated from.
   - The technical justification.
   - The proposed alternative and its trade-offs.
   - The expected duration (permanent or time-boxed).
2. **Review** by `underwriting-engineering` lead and at least one `parasol-platform-engineering` member.
3. **Record** the approved exception as an ADR in the affected component's `docs/adrs/` directory.
4. **Tag** the component with `governance-exception` in the Backstage catalog.

### Common Valid Exceptions

- **Prototype / spike workloads:** May use non-standard technologies for time-boxed experiments (max 90 days). Must not reach production without full governance review.
- **Vendor-mandated SDKs:** If a third-party vendor (e.g., reinsurer, credit bureau) provides an SDK in a language not on the approved stack, the integration service may use that language with approval.
- **Performance-critical paths:** If Quarkus cannot meet latency SLAs for a specific workload, an alternative JVM framework may be approved with benchmark evidence.

### Questions

Contact `underwriting-engineering` via the internal developer portal or `#underwriting-engineering` Slack channel.
