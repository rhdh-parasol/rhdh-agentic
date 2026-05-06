# Customer Portal (Digital Channels) Domain Handbook

Domain handbook for the Customer Portal domain at Parasol Insurance Group.
Owner: `digital-channels-engineering`.

## Domain Overview

The Customer Portal domain contains **14 components** across 3 systems:

| System | Purpose |
|---|---|
| `web-portal-system` | Customer-facing web application, self-service policy management |
| `mobile-app-system` | Native mobile apps (iOS/Android), push notifications (APNs/FCM) |
| `broker-portal-system` | Broker-facing portal, quote comparison, policy administration |

**Language breakdown:** Java (8), Node.js (4), Python (1), Go (1).
**API style:** REST (all 14 components).

### Published APIs

| API | Version | Visibility | Tags | Description |
|---|---|---|---|---|
| Customer Self-Service API | v3 | Public | | Policy viewing, claims filing, document upload, payment history |
| Broker Authentication API | v1 | Public | `identity` | Broker identity federation, SSO, delegated access tokens |

### Notable Tags

`BFF` (Backend-for-Frontend pattern), `mobile` (APNs/FCM), `broker-portal`, `IAM`.

### Architecture Patterns

- **BFF (Backend-for-Frontend):** Node.js BFF services aggregate and shape data from downstream Java microservices for web and mobile clients. Each channel (web, mobile, broker) has a dedicated BFF.
- **Push notifications:** Node.js service manages APNs (iOS) and FCM (Android) push delivery.
- **Real-time messaging:** Node.js WebSocket service for live chat and notification streaming.

---

## Approved Stack Matrix

| Technology | Status | Count | Rationale |
|---|---|---|---|
| **Quarkus** | Preferred | 8 Java components | Default framework for backend microservices. |
| **Node.js** | Preferred (BFF only) | 4 components | Approved for BFF services, push notification delivery, and real-time messaging. Not permitted for backend business logic. |
| **Python** | Restricted | 1 component | Limited to analytics/reporting. Not permitted for request-path services. |
| **OpenShift 4** | Required | All | Every component must deploy to OpenShift 4. |
| **Keycloak** | Required | All public-facing | OAuth 2.0 / OIDC for customer and broker authentication. Powers the Broker Authentication API federation. |
| **ACS (Advanced Cluster Security)** | Required | All | Runtime security scanning and policy enforcement. |
| **Instana** | Required | All | APM, distributed tracing, and real-time alerting for customer-facing SLAs. |
| **Apache Camel** | Preferred | Integration routes | Integration framework for downstream system orchestration (policy, claims, billing). |
| **RHDH** | Trial | Developer portal | Red Hat Developer Hub for service catalog and onboarding. |
| **watsonx Code Assistant** | Trial | Developer tooling | AI-assisted code generation. Experimental use by `digital-channels-engineering`. |

### Tech Radar Summary

- **ADOPT:** Quarkus, OpenShift 4, Keycloak, ACS, Instana, Apache Camel
- **TRIAL:** RHDH, watsonx Code Assistant

---

## Governance Rules

### Mandatory

1. All new backend services **MUST** use **Quarkus** (Java). Node.js is only permitted for BFF, push notification, and real-time messaging services.
2. All services **MUST** deploy to **OpenShift 4** using Parasol Helm charts.
3. All public APIs **MUST** authenticate via **Keycloak** (OAuth 2.0 / OIDC).
4. Broker authentication **MUST** use the **Broker Authentication API** with Keycloak identity federation. Direct LDAP or custom auth is forbidden.
5. All components **MUST** have **ACS** runtime policies active.
6. All components **MUST** emit distributed traces to **Instana**. Customer-facing services must meet the 99.9% availability SLA.
7. BFF services **MUST** follow the Backend-for-Frontend pattern: one BFF per channel (web, mobile, broker). BFFs must not contain business logic; they aggregate and shape responses only.
8. Push notification services **MUST** support both **APNs** (iOS) and **FCM** (Android). Platform-specific push credentials must be stored in OpenShift Secrets, never in source code.
9. All downstream system integrations **MUST** use **Apache Camel** routes for orchestration and error handling.
10. All customer-facing components **MUST** implement rate limiting and circuit breakers at the BFF layer.

### Requires Approval

- Using Node.js for a service that is not a BFF, push notification, or real-time messaging service (requires `digital-channels-engineering` lead approval).
- Introducing a new frontend framework or UI toolkit.
- Using Python for any new component (must justify why Java or Node.js is insufficient).
- Any change to the Customer Self-Service API or Broker Authentication API contract (requires `digital-channels-engineering` lead + API governance review).
- Using watsonx Code Assistant for production code generation (trial status; requires team lead sign-off).

### Forbidden

- Running services outside OpenShift 4.
- Using Node.js for backend business logic (policy calculations, claims processing, etc.).
- Implementing custom authentication instead of Keycloak.
- Bypassing the BFF layer to call backend services directly from web or mobile clients.
- Storing push notification credentials (APNs keys, FCM tokens) in source code or config files.
- Deploying components without Instana instrumentation.

---

## When to Deviate

The Customer Portal domain is the primary customer-facing surface. Deviations must consider the impact on customer experience, availability SLAs, and security posture.

### Exception Process

1. **Raise** an exception request in `#digital-channels-engineering` Slack channel with:
   - The governance rule being deviated from.
   - The technical justification.
   - The customer impact assessment (availability, performance, security).
   - The proposed alternative and its trade-offs.
   - The expected duration (permanent or time-boxed).
2. **Review** by `digital-channels-engineering` lead and at least one `parasol-platform-engineering` member.
3. **Record** the approved exception as an ADR in the affected component's `docs/adrs/` directory.
4. **Tag** the component with `governance-exception` in the Backstage catalog.

### Common Valid Exceptions

- **Third-party widget SDKs:** If a third-party service (e.g., live chat vendor, analytics provider) provides a JavaScript SDK that must run server-side, a Node.js service outside the BFF pattern may be approved.
- **Performance-critical real-time features:** If a WebSocket or Server-Sent Events workload cannot meet latency requirements with Apache Camel, a direct integration may be approved with benchmark evidence.
- **Broker-specific integrations:** If a broker's existing system requires a non-standard protocol (e.g., SOAP, FTP), the integration service may use non-standard technologies with security review.
- **Mobile platform constraints:** If Apple or Google mandate a specific SDK version or API pattern for push notifications, the implementation may deviate from standard patterns with documentation.

### Questions

Contact `digital-channels-engineering` via the internal developer portal or `#digital-channels-engineering` Slack channel.
