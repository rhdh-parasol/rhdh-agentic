# Demo Script: Agent-Driven Microservice Creation

## Overview

This script demonstrates how an AI coding agent (Claude Code) uses the `backstage-agent` CLI to query a live Backstage software catalog and use the organizational knowledge it finds there to create a new microservice — with the correct tech stack, correct dependencies, and correct governance — for Parasol Insurance.

**Setting:** Backstage is running locally at `http://localhost:7007` with the Parasol Insurance catalog loaded (271 entities: 175 components, 16 APIs, 53 systems, 13 groups, 14 domains).

**The developer:** A new engineer joining the Claims team, tasked with building a payment reconciliation service.

> **What makes this demo different from a generic scaffold:**
> The agent reads the software catalog *before* it writes a line of code. It discovers domain-specific rules, existing services to integrate with, and — crucially — a governance constraint it would never have found by guessing.

---

## The Task

The agent receives this brief:

```
We need a new service in the Claims domain that reconciles claim settlement
payments against our financial ledger to detect discrepancies, alert on
anomalies, and generate daily audit reports for the finance team.
```

**Agent's opening reasoning:**

> Before I start writing any code, I need to understand how Parasol organizes its services, what technology stack the Claims team uses, which existing services I should integrate with, and what governance rules apply. I'll query Backstage to find out.

---

## Scene 1 — Authenticate with Backstage

The first thing the agent does is connect to the Parasol Backstage instance and verify its identity.

```bash
backstage-agent auth login --backend-url http://localhost:7007
```

```
Opening browser for authentication...
Authenticated successfully. Instance saved as "localhost:7007".
```

```bash
backstage-agent auth status
```

```json
{
  "data": {
    "instances": [
      {
        "name": "localhost:7007",
        "backendUrl": "http://localhost:7007",
        "tokenExpiresAt": "2026-05-27T23:00:00.000Z",
        "selected": true
      }
    ]
  },
  "hints": [
    "Try: backstage-agent auth whoami",
    "Try: backstage-agent catalog list"
  ],
  "trustLevel": "read-only"
}
```

```bash
backstage-agent auth whoami
```

```json
{
  "data": {
    "instance": "localhost:7007",
    "userEntityRef": "user:development/guest",
    "ownershipEntityRefs": ["user:development/guest"]
  },
  "hints": [],
  "trustLevel": "read-only"
}
```

> **Presenter note:** The agent is now authenticated. Every subsequent query runs against the live catalog. The `trustLevel` field tells the agent what operations it is permitted to perform.

---

## Scene 2 — Domain Discovery

The task brief mentions "the Claims domain." The agent queries the catalog to understand how Claims is structured before making any assumptions.

```bash
backstage-agent catalog list --filter kind=Domain
```

```json
{
  "data": {
    "items": [
      { "ref": "domain:default/claims",                "title": "Claims",                "owner": "group:default/claims-engineering" },
      { "ref": "domain:default/underwriting",          "title": "Underwriting",          "owner": "group:default/underwriting-engineering" },
      { "ref": "domain:default/policy-administration", "title": "Policy Administration", "owner": "group:default/policy-platform-engineering" },
      { "ref": "domain:default/billing-payments",      "title": "Billing & Payments",    "owner": "group:default/billing-payments-engineering" },
      { "ref": "domain:default/customer-portal",       "title": "Customer Portal",       "owner": "group:default/digital-channels-engineering" },
      { "ref": "domain:default/data-analytics",        "title": "Data & Analytics",      "owner": "group:default/data-analytics-engineering" }
    ],
    "totalCount": 14
  },
  "hints": [
    "Try: backstage-agent catalog get domain:default/claims",
    "Try: backstage-agent catalog list --filter domain=claims,kind=System"
  ],
  "trustLevel": "read-only"
}
```

The agent drills into the Claims domain and its systems:

```bash
backstage-agent catalog get domain:default/claims
```

```json
{
  "data": {
    "entity": {
      "apiVersion": "backstage.io/v1alpha1",
      "kind": "Domain",
      "metadata": {
        "name": "claims",
        "description": "End-to-end claims lifecycle: FNOL intake, triage, assessment, fraud detection, settlement, and payment disbursement.",
        "annotations": {
          "backstage.io/techdocs-ref": "dir:./techdocs/domains/claims"
        }
      },
      "spec": {
        "owner": "group:default/claims-engineering"
      },
      "relations": [
        { "type": "hasPart", "targetRef": "system:default/fnol-system" },
        { "type": "hasPart", "targetRef": "system:default/claims-assessment-system" },
        { "type": "hasPart", "targetRef": "system:default/claims-payment-system" },
        { "type": "hasPart", "targetRef": "system:default/claims-fraud-detection-system" },
        { "type": "hasPart", "targetRef": "system:default/claims-document-system" },
        { "type": "hasPart", "targetRef": "system:default/claims-litigation-system" }
      ]
    }
  },
  "hints": [
    "Try: backstage-agent catalog list --filter domain=claims,kind=System",
    "Try: backstage-agent techdocs read domain:default/claims"
  ],
  "trustLevel": "read-only"
}
```

```bash
backstage-agent catalog get system:default/claims-payment-system
```

```json
{
  "data": {
    "entity": {
      "kind": "System",
      "metadata": {
        "name": "claims-payment-system",
        "description": "Claim settlement and payment disbursement — from approved settlement through to claimant bank transfer."
      },
      "spec": {
        "owner": "group:default/claims-engineering",
        "domain": "domain:default/claims"
      },
      "relations": [
        { "type": "hasPart", "targetRef": "component:default/claims-settlement-service" },
        { "type": "hasPart", "targetRef": "component:default/payment-disbursement-service" },
        { "type": "hasPart", "targetRef": "component:default/subrogation-recovery-service" }
      ]
    }
  },
  "hints": [
    "Try: backstage-agent catalog get component:default/claims-settlement-service",
    "Try: backstage-agent techdocs read system:default/claims-payment-system"
  ],
  "trustLevel": "read-only"
}
```

**Agent reasoning:**

> The Claims domain has 6 systems. My new reconciliation service sits naturally in `claims-payment-system` — that's where settlement and disbursement already live. The owning team is `claims-engineering`. I'll now learn their rules before going any further.

---

## Scene 3 — Learn the Domain Rules

The agent reads the Claims domain handbook from TechDocs to understand what technologies it must use.

```bash
backstage-agent techdocs read domain:default/claims
```

```json
{
  "data": {
    "entityRef": "domain:default/claims",
    "title": "Claims Domain Handbook",
    "sections": [
      {
        "heading": "Approved Stack Matrix",
        "content": "| Technology         | Status           | Count | Notes |\n|--------------------|------------------|-------|-------|\n| Java / Quarkus     | **Required**     | 17    | Primary runtime for all transactional claims services. Quarkus for new builds; JBoss EAP acceptable only for in-flight migrations. |\n| PostgreSQL         | **Required**     | 12    | Only approved RDBMS. No MySQL, Oracle, or MariaDB. |\n| Python             | Allowed          | 7     | ML/fraud scoring and damage estimation only. Not permitted on payment or settlement paths. |\n| Node.js            | Allowed          | 2     | Notification handlers and real-time event push only. |\n| Kafka / AMQ Streams| Preferred        | 5     | Domain-wide async events. Approval required for cross-domain use. |\n| Apache Camel       | Preferred        | —     | Integration routes and channel adapters. |\n| Keycloak           | **Required**     | all   | Authentication for all adjuster, claimant, and SIU-facing APIs. |\n| OpenTelemetry      | **Required**     | all   | Mandatory instrumentation. Java auto-instrumentation via Quarkus extension. |"
      },
      {
        "heading": "Mandatory Rules",
        "content": "1. All new transactional services MUST use Quarkus. No exceptions without architecture board sign-off.\n2. PostgreSQL is the only approved relational database in this domain.\n3. All services MUST expose RED metrics and structured JSON logs with W3C trace context.\n4. Service-to-service calls within the domain MUST use mTLS (Istio/SPIFFE). No plain HTTP between services.\n5. Database credentials MUST be injected from HashiCorp Vault. No hardcoded credentials. Rotation period: 90 days."
      },
      {
        "heading": "Requires Approval",
        "content": "- Using a message broker other than Kafka for domain-internal events\n- Cross-domain database access (use published APIs instead)\n- Any technology not in the Approved Stack Matrix above"
      },
      {
        "heading": "Forbidden",
        "content": "- Python on any settlement or payment code path\n- Direct cross-domain database queries (use published APIs)\n- Plaintext secrets in source code or environment variables\n- Any RDBMS other than PostgreSQL"
      }
    ]
  },
  "hints": [
    "Try: backstage-agent techdocs read domain:default/billing-payments",
    "Try: backstage-agent catalog list --filter domain=claims,kind=Component"
  ],
  "trustLevel": "read-only"
}
```

The reconciliation service touches payment data from the Billing domain. The agent reads that handbook too.

```bash
backstage-agent techdocs read domain:default/billing-payments
```

```json
{
  "data": {
    "entityRef": "domain:default/billing-payments",
    "title": "Billing & Payments Domain Handbook",
    "sections": [
      {
        "heading": "Approved Stack Matrix",
        "content": "| Technology    | Status           | Notes |\n|---------------|------------------|-------|\n| Java / Quarkus| Preferred        | New Java services. |\n| IBM MQ        | **Required**     | Guaranteed delivery for ALL payment transaction paths. No exceptions. |\n| Kafka         | **Forbidden**    | NOT approved for payment processing paths. Risk of message loss under broker failure. PCI-DSS requires guaranteed delivery. |\n| Keycloak      | **Required**     | All public-facing APIs. |\n| IBM Guardium  | **Required**     | PCI-DSS scope database monitoring. |\n| Python        | Restricted       | Batch analytics and reporting only. Never on the payment path. |"
      },
      {
        "heading": "Mandatory Rules",
        "content": "1. IBM MQ is mandatory for ALL payment transaction messaging. No substitutions.\n2. Kafka is explicitly forbidden on payment paths — this is a PCI-DSS Level 1 compliance requirement, not a preference.\n3. No plaintext PAN, CVV, or expiry dates. All payment card data must be tokenized before storage or transmission.\n4. All payment transactions require double-entry accounting with immutable audit logs.\n5. Dead-letter queues with retry logic are required for all direct-debit flows."
      },
      {
        "heading": "PCI-DSS Level 1 Compliance",
        "content": "Parasol Billing & Payments is certified PCI-DSS Level 1 — the highest compliance tier, requiring annual on-site audit by a Qualified Security Assessor. Any service that reads or writes payment transaction data becomes part of the PCI-DSS scope and must follow these rules. If your service integrates with the Premium Payment API, you are in scope."
      }
    ]
  },
  "hints": [
    "Try: backstage-agent catalog get api:default/premium-payment-api",
    "Try: backstage-agent catalog get api:default/audit-trail-api"
  ],
  "trustLevel": "read-only"
}
```

---

### The "Aha Moment"

> **Agent reasoning — stated explicitly for the audience:**
>
> This is where the catalog just prevented an architecture mistake.
>
> My first instinct for consuming payment events would have been Kafka — it's the standard async backbone for Claims domain services. But the Billing domain handbook is unambiguous: **Kafka is explicitly forbidden on payment transaction paths**. IBM MQ is required. This is not a preference; it's a PCI-DSS Level 1 compliance requirement.
>
> My new reconciliation service reads payment settlement data from the Billing domain. That integration must use IBM MQ — not Kafka. The catalog is the only place this constraint is documented. Without querying it, I would have built the wrong thing.
>
> **Presenter note:** Pause here. This is the central argument of the demo. A generic agent — or a human developer unfamiliar with the Billing domain — would have reached for Kafka by default. The catalog prevented a compliance violation before a line of code was written.

---

## Scene 4 — Identify Integration Points

Now the agent looks up the specific services and APIs it will integrate with.

```bash
backstage-agent catalog get component:default/claims-settlement-service
```

```json
{
  "data": {
    "entity": {
      "kind": "Component",
      "metadata": {
        "name": "claims-settlement-service",
        "description": "Manages claim settlement decisions: calculates final settlement amounts, issues settlement offers, and records accepted settlements for payment.",
        "tags": ["claims", "settlement", "java", "quarkus", "rest"]
      },
      "spec": {
        "type": "service",
        "lifecycle": "production",
        "owner": "group:default/claims-engineering",
        "system": "system:default/claims-payment-system"
      },
      "relations": [
        { "type": "dependsOn", "targetRef": "component:default/reserve-calculation-service" },
        { "type": "dependsOn", "targetRef": "component:default/claims-decision-service" },
        { "type": "dependencyOf", "targetRef": "component:default/payment-disbursement-service" }
      ]
    }
  },
  "hints": [
    "Try: backstage-agent catalog get component:default/payment-disbursement-service"
  ],
  "trustLevel": "read-only"
}
```

```bash
backstage-agent catalog get component:default/payment-disbursement-service
```

```json
{
  "data": {
    "entity": {
      "kind": "Component",
      "metadata": {
        "name": "payment-disbursement-service",
        "description": "Executes approved claim payments via bank transfer, cheque, and digital wallet. Integrates with the Billing domain via IBM MQ for payment instruction delivery.",
        "tags": ["claims", "payments", "java", "quarkus", "ibm-mq"]
      },
      "spec": {
        "type": "service",
        "lifecycle": "production",
        "owner": "group:default/claims-engineering",
        "system": "system:default/claims-payment-system"
      }
    }
  },
  "hints": [
    "Try: backstage-agent catalog get api:default/premium-payment-api"
  ],
  "trustLevel": "read-only"
}
```

```bash
backstage-agent catalog search "audit trail"
```

```json
{
  "data": {
    "items": [
      {
        "ref": "api:default/audit-trail-api",
        "kind": "API",
        "title": "Audit Trail API",
        "description": "Internal API for writing immutable compliance audit records. Used by all domains for regulatory audit trail.",
        "tags": ["compliance", "audit", "internal", "rest"]
      },
      {
        "ref": "component:default/audit-trail-service",
        "kind": "Component",
        "title": "Audit Trail Service",
        "description": "Owns and persists the immutable audit log. Operated by compliance-engineering.",
        "tags": ["compliance", "audit", "java"]
      }
    ],
    "totalCount": 2
  },
  "hints": [
    "Try: backstage-agent catalog get api:default/audit-trail-api"
  ],
  "trustLevel": "read-only"
}
```

```bash
backstage-agent catalog get api:default/audit-trail-api
```

```json
{
  "data": {
    "entity": {
      "kind": "API",
      "metadata": {
        "name": "audit-trail-api",
        "description": "Immutable compliance audit log — write-only for non-compliance services. All writes are cryptographically signed.",
        "tags": ["compliance", "audit", "internal", "pci-dss"]
      },
      "spec": {
        "type": "openapi",
        "lifecycle": "production",
        "owner": "group:default/compliance-engineering",
        "definition": "https://api-internal.parasol.com/compliance/audit/v1/openapi.yaml"
      }
    }
  },
  "hints": [],
  "trustLevel": "read-only"
}
```

**Agent reasoning:**

> I now have all four integration points:
>
> 1. **`claims-settlement-service`** — source of settlement decisions (upstream, same system, same domain, Kafka or direct API)
> 2. **`payment-disbursement-service`** — source of executed payment records (upstream, same system, IBM MQ for Billing-side messages)
> 3. **Premium Payment API v2** — Billing domain API for payment status; confirmed PCI-DSS scope
> 4. **Audit Trail API v1** — writes reconciliation audit records to compliance system

---

## Scene 5 — Check Org-Wide Standards

The agent reads the platform engineering handbook for cross-cutting requirements that apply to every service regardless of domain.

```bash
backstage-agent techdocs read group:default/parasol-platform-engineering
```

```json
{
  "data": {
    "entityRef": "group:default/parasol-platform-engineering",
    "title": "Parasol Platform Engineering — Org Standards",
    "sections": [
      {
        "heading": "Observability — Required for All Services",
        "content": "**RED Metrics (mandatory):**\n- `http_requests_total` (Counter) — labelled by method, route, status\n- `http_request_duration_seconds` (Histogram) — p50, p95, p99\n- `http_requests_in_flight` (Gauge)\n- Domain-specific counters must be prefixed with domain name (e.g. `claims_reconciliation_discrepancies_total`)\n\n**Structured JSON Logging (mandatory fields):**\n- `timestamp` (ISO 8601), `level`, `message`, `service`, `traceId`, `spanId`\n\n**Distributed Tracing:**\n- W3C Trace Context (`traceparent`, `tracestate`) on all outbound HTTP calls\n- Java: Quarkus OpenTelemetry extension (auto-instrumented)\n- Sampling: 10% normal traffic; 100% for errors and requests exceeding p99 latency"
      },
      {
        "heading": "SLO Targets",
        "content": "| Domain           | Latency SLO      | Availability  |\n|------------------|------------------|---------------|\n| Claims           | p99 < 500ms      | >= 99.9%      |\n| Underwriting     | p99 < 200ms      | >= 99.9%      |\n| Billing/Payments | p99 < 500ms      | >= 99.95%     |\n| Customer Portal  | p99 < 300ms      | >= 99.9%      |"
      },
      {
        "heading": "API Standards",
        "content": "- OpenAPI 3.0.3 specification required for all service interfaces\n- Operation IDs: camelCase (e.g. `getReconciliationReport`, `listDiscrepancies`)\n- Path parameters: camelCase (e.g. `claimId`, `reportDate`)\n- Schema names: PascalCase (e.g. `ReconciliationReport`, `PaymentDiscrepancy`)"
      },
      {
        "heading": "Security",
        "content": "- Service identity: mTLS via Istio/SPIFFE (all service-to-service traffic)\n- User-facing APIs: Keycloak JWT (RS256, 15-min access token)\n- Database credentials: HashiCorp Vault injection only. Rotation: 90 days.\n- Container: Non-root, read-only filesystem, no critical/high CVEs (Red Hat ACS enforcement)"
      }
    ]
  },
  "hints": [
    "Try: backstage-agent templates list"
  ],
  "trustLevel": "read-only"
}
```

**Agent reasoning:**

> I now know everything I need to make the right choices:
>
> - **Runtime:** Java / Quarkus (Claims domain mandate)
> - **Database:** PostgreSQL (only approved RDBMS)
> - **Payment messaging:** IBM MQ (Billing domain mandate, PCI-DSS)
> - **Domain events:** Kafka / AMQ Streams (for internal Claims notifications)
> - **Observability:** RED metrics + JSON logs + OpenTelemetry (org standard)
> - **SLO:** p99 < 500ms (Claims domain)
> - **Secrets:** HashiCorp Vault for DB credentials
>
> Now I'll find the right template.

---

## Scene 6 — Select a Template

```bash
backstage-agent templates list
```

```json
{
  "data": {
    "items": [
      {
        "ref": "template:default/parasol-quarkus-service",
        "title": "Parasol Quarkus Service",
        "description": "Scaffold a new Quarkus microservice for Claims, Underwriting, Policy Administration, Billing, and other Java-dominant domains. Produces a Maven project with REST endpoint, health checks, RED metrics, OpenTelemetry, and a valid catalog-info.yaml.",
        "tags": ["java", "quarkus", "rest", "parasol", "recommended"]
      },
      {
        "ref": "template:default/parasol-python-service",
        "title": "Parasol Python Service",
        "description": "Scaffold a new FastAPI service for Data & Analytics, ML pipelines, and actuarial workloads.",
        "tags": ["python", "fastapi", "rest", "parasol", "data"]
      },
      {
        "ref": "template:default/parasol-nodejs-service",
        "title": "Parasol Node.js Service",
        "description": "Scaffold a new Express.js service for BFF layers, push notification handlers, and real-time messaging.",
        "tags": ["nodejs", "express", "rest", "parasol", "bff"]
      }
    ],
    "totalCount": 3
  },
  "hints": [
    "Try: backstage-agent templates get template:default/parasol-quarkus-service"
  ],
  "trustLevel": "read-only"
}
```

**Agent reasoning:**

> The Claims domain requires Quarkus. This is a transactional service — not ML (Python) and not a BFF (Node.js). `parasol-quarkus-service` is the correct choice. The `recommended` tag confirms it's the default for Java services across most domains.

```bash
backstage-agent templates get template:default/parasol-quarkus-service
```

```json
{
  "data": {
    "ref": "template:default/parasol-quarkus-service",
    "title": "Parasol Quarkus Service",
    "parameters": [
      { "name": "name",        "type": "string",  "required": true,  "description": "Service name (kebab-case, becomes the component name in the catalog)" },
      { "name": "description", "type": "string",  "required": true,  "description": "Human-readable description of what the service does" },
      { "name": "owner",       "type": "string",  "required": true,  "description": "Backstage group ref (e.g. group:default/claims-engineering)" },
      { "name": "system",      "type": "string",  "required": true,  "description": "Backstage system ref (e.g. system:default/claims-payment-system)" },
      { "name": "groupId",     "type": "string",  "required": false, "default": "com.parasol", "description": "Maven groupId" },
      { "name": "artifactId",  "type": "string",  "required": false, "description": "Maven artifactId (defaults to service name)" },
      { "name": "port",        "type": "integer", "required": false, "default": 8080, "description": "HTTP port" }
    ],
    "produces": [
      "Maven project skeleton (pom.xml, src/main/java, src/test/java)",
      "REST endpoint stub with OpenAPI annotations",
      "Health check endpoint (/q/health)",
      "Prometheus metrics endpoint (/q/metrics) with RED metrics pre-configured",
      "OpenTelemetry auto-instrumentation via quarkus-opentelemetry extension",
      "application.properties with Vault secret stubs and OTLP endpoint config",
      "catalog-info.yaml registered as a new Component in Backstage"
    ]
  },
  "hints": [
    "Try: backstage-agent templates execute template:default/parasol-quarkus-service --name <name> --owner <owner> --system <system>"
  ],
  "trustLevel": "read-only"
}
```

---

## Scene 7 — Scaffold the Service

The agent executes the template with the parameters it has gathered from its catalog research.

```bash
backstage-agent templates execute template:default/parasol-quarkus-service \
  --name claims-payment-reconciliation-service \
  --description "Reconciles claim settlement payments against the financial ledger to detect discrepancies and generate audit reports for the finance team." \
  --owner group:default/claims-engineering \
  --system system:default/claims-payment-system \
  --group-id com.parasol.claims \
  --port 8080 \
  --no-dry-run
```

```json
{
  "data": {
    "name": "claims-payment-reconciliation-service",
    "template": "template:default/parasol-quarkus-service",
    "outputDirectory": "./claims-payment-reconciliation-service",
    "filesCreated": [
      "pom.xml",
      "src/main/java/com/parasol/claims/reconciliation/ReconciliationResource.java",
      "src/main/java/com/parasol/claims/reconciliation/ReconciliationReport.java",
      "src/main/java/com/parasol/claims/reconciliation/PaymentDiscrepancy.java",
      "src/main/resources/application.properties",
      "src/test/java/com/parasol/claims/reconciliation/ReconciliationResourceTest.java",
      "catalog-info.yaml"
    ],
    "catalogEntityRef": "component:default/claims-payment-reconciliation-service",
    "catalogRegistered": true
  },
  "hints": [
    "Try: backstage-agent catalog get component:default/claims-payment-reconciliation-service",
    "Next: cd claims-payment-reconciliation-service && mvn quarkus:dev"
  ],
  "trustLevel": "reversible"
}
```

> **Presenter note:** The template execution produces real files on disk. Walk through each generated artifact in the next section.

---

### Generated Artifact 1 — `catalog-info.yaml`

The catalog registration file reflects every architectural decision the agent made during its research: correct owner, correct system, correct tags, and explicit dependency edges to the services it will integrate with.

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: claims-payment-reconciliation-service
  description: >
    Reconciles claim settlement payments against the financial ledger to detect
    discrepancies and generate audit reports for the finance team.
  annotations:
    backstage.io/techdocs-ref: dir:.
  tags:
    - claims
    - java
    - quarkus
    - reconciliation
    - ibm-mq
    - pci-dss-scope
spec:
  type: service
  lifecycle: experimental
  owner: group:default/claims-engineering
  system: system:default/claims-payment-system
  dependsOn:
    - component:default/claims-settlement-service
    - component:default/payment-disbursement-service
    - api:default/audit-trail-api
    - api:default/premium-payment-api
```

> Note the `pci-dss-scope` tag. The agent added this because reading the Billing domain handbook confirmed that any service integrating with the Premium Payment API is in PCI-DSS scope.

---

### Generated Artifact 2 — `ReconciliationResource.java`

The stub reflects the architectural choices grounded in the catalog: IBM MQ injection (not Kafka), Audit Trail client, OpenTelemetry tracing, and a domain-specific Prometheus counter.

```java
package com.parasol.claims.reconciliation;

import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.jms.ConnectionFactory;
import io.opentelemetry.instrumentation.annotations.WithSpan;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.eclipse.microprofile.openapi.annotations.Operation;

@Path("/reconciliation")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ReconciliationResource {

    // IBM MQ — required for Billing domain payment paths (PCI-DSS Level 1).
    // Kafka is explicitly forbidden on payment transaction paths per billing-payments
    // domain handbook. See: backstage-agent techdocs read domain:default/billing-payments
    @Inject
    ConnectionFactory mqConnectionFactory;

    @Inject
    AuditTrailClient auditTrailClient;

    private final Counter discrepancyCounter;

    public ReconciliationResource(MeterRegistry registry) {
        // Domain-specific metric — prefix matches Claims domain convention
        this.discrepancyCounter = Counter.builder("claims_reconciliation_discrepancies_total")
            .description("Number of payment discrepancies detected during reconciliation")
            .register(registry);
    }

    @GET
    @Path("/reports/{reportDate}")
    @Operation(operationId = "getReconciliationReport", summary = "Get reconciliation report for a given date")
    @WithSpan
    public ReconciliationReport getReport(@PathParam("reportDate") String reportDate) {
        // TODO: query PostgreSQL ledger and compare against settlement records
        // TODO: write audit record via auditTrailClient for every reconciliation run
        throw new UnsupportedOperationException("Not yet implemented");
    }

    @POST
    @Path("/run")
    @Operation(operationId = "triggerReconciliation", summary = "Trigger an on-demand reconciliation run")
    @WithSpan
    public ReconciliationReport triggerReconciliation() {
        // TODO: consume payment messages from IBM MQ
        // TODO: cross-reference with claims-settlement-service records
        // TODO: increment discrepancyCounter for each mismatch found
        // TODO: write audit record via auditTrailClient
        throw new UnsupportedOperationException("Not yet implemented");
    }
}
```

---

### Generated Artifact 3 — `application.properties`

```properties
# Service identity
quarkus.application.name=claims-payment-reconciliation-service

# Server
quarkus.http.port=8080

# PostgreSQL — credentials injected from HashiCorp Vault (90-day rotation)
# Required by Claims domain standards. No hardcoded credentials.
quarkus.datasource.db-kind=postgresql
quarkus.datasource.jdbc.url=${vault.secret.claims-reconciliation.db-url:jdbc:postgresql://localhost:5432/claims_reconciliation}
quarkus.datasource.username=${vault.secret.claims-reconciliation.db-username:dev_user}
quarkus.datasource.password=${vault.secret.claims-reconciliation.db-password:dev_password}

# IBM MQ — required for Billing domain payment path integration (PCI-DSS Level 1)
# Kafka is explicitly forbidden for payment transaction paths. See billing-payments domain handbook.
quarkus.qpid-jms.url=amqps://${ibmmq.host:localhost}:${ibmmq.port:5671}
quarkus.qpid-jms.username=${ibmmq.username:dev}
quarkus.qpid-jms.password=${ibmmq.password:dev}
claims.reconciliation.payment-queue=CLAIMS.PAYMENT.EVENTS

# OpenTelemetry — mandatory per org standards
quarkus.otel.exporter.otlp.endpoint=http://${otel.collector.host:localhost}:4317
quarkus.otel.resource.attributes=service.name=claims-payment-reconciliation-service,domain=claims

# Health checks
quarkus.smallrye-health.root-path=/q/health

# OpenAPI
quarkus.smallrye-openapi.info-title=Claims Payment Reconciliation Service
quarkus.smallrye-openapi.info-version=1.0.0

# Logging — structured JSON (org standard)
quarkus.log.console.format=json
```

---

## Scene 8 — Verify Catalog Registration

The agent confirms the new service is now visible in the catalog with the correct relationships.

```bash
backstage-agent catalog get component:default/claims-payment-reconciliation-service
```

```json
{
  "data": {
    "entity": {
      "apiVersion": "backstage.io/v1alpha1",
      "kind": "Component",
      "metadata": {
        "name": "claims-payment-reconciliation-service",
        "description": "Reconciles claim settlement payments against the financial ledger to detect discrepancies and generate audit reports for the finance team.",
        "tags": ["claims", "java", "quarkus", "reconciliation", "ibm-mq", "pci-dss-scope"]
      },
      "spec": {
        "type": "service",
        "lifecycle": "experimental",
        "owner": "group:default/claims-engineering",
        "system": "system:default/claims-payment-system"
      },
      "relations": [
        { "type": "dependsOn",   "targetRef": "component:default/claims-settlement-service" },
        { "type": "dependsOn",   "targetRef": "component:default/payment-disbursement-service" },
        { "type": "dependsOn",   "targetRef": "api:default/audit-trail-api" },
        { "type": "dependsOn",   "targetRef": "api:default/premium-payment-api" },
        { "type": "ownedBy",     "targetRef": "group:default/claims-engineering" },
        { "type": "partOf",      "targetRef": "system:default/claims-payment-system" }
      ]
    }
  },
  "hints": [],
  "trustLevel": "read-only"
}
```

The new service is registered, correctly owned, placed in the right system, and its four dependency edges are visible to every other team in the organization.

---

## Scene 9 — Agent Summary

The agent produces a structured summary of everything it decided and why.

```
## New Service: claims-payment-reconciliation-service

Catalog ref:  component:default/claims-payment-reconciliation-service
Domain:       Claims
System:       claims-payment-system
Owner:        claims-engineering
Lifecycle:    experimental

TECHNOLOGY CHOICES
  Runtime:    Java / Quarkus
              Reason: Claims domain handbook — Quarkus is required for all new
              transactional services. (techdocs read domain:default/claims)

  Database:   PostgreSQL
              Reason: Only approved RDBMS in the Claims domain. No exceptions.

  Messaging:  IBM MQ (payment path), Kafka/AMQ Streams (domain events)
              Reason: Billing domain handbook requires IBM MQ for ALL payment
              transaction paths. Kafka is explicitly forbidden — PCI-DSS Level 1
              compliance requirement. (techdocs read domain:default/billing-payments)
              This was the non-obvious decision. A default Kafka implementation
              would have been a compliance violation.

INTEGRATIONS
  ↑ claims-settlement-service    (upstream — source of settlement decisions)
  ↑ payment-disbursement-service (upstream — source of executed payment records)
  → Premium Payment API v2       (Billing domain, IBM MQ, PCI-DSS scope)
  → Audit Trail API v1           (Compliance domain — immutable audit records)

OBSERVABILITY
  Metrics:    RED metrics + claims_reconciliation_discrepancies_total
              Endpoint: /q/metrics
  Logs:       Structured JSON with W3C traceId/spanId
  Tracing:    OpenTelemetry auto-instrumentation (quarkus-opentelemetry)
  SLO:        p99 < 500ms (Claims domain target)

PRODUCTION GAPS (not covered in this scaffold)
  ✗ GitHub repository and CI/CD pipeline
  ✗ HashiCorp Vault secret paths for DB credentials (coordinate with platform team)
  ✗ IBM MQ topic naming — must be agreed with billing-payments-engineering
  ✗ mTLS certificate issuance for Istio mesh enrollment
  ✗ IBM Guardium monitoring enrollment (PCI-DSS scope requirement)
  ✗ PCI-DSS scope documentation submitted to compliance-engineering
```

---

## Demo Summary

In this session, the agent:

| Step | Action | Source of Truth |
|------|--------|-----------------|
| 1 | Authenticated with Backstage | `backstage-agent auth login` |
| 2 | Located the Claims domain and claims-payment-system | Catalog — entity relationships |
| 3 | Learned Claims domain rules (Quarkus required, PostgreSQL only) | TechDocs — Claims handbook |
| 4 | Discovered Billing domain's IBM MQ mandate (critical constraint) | TechDocs — Billing handbook |
| 5 | Identified four concrete integration points and their API contracts | Catalog — component + API entities |
| 6 | Confirmed org-wide observability and security requirements | TechDocs — platform standards |
| 7 | Selected the Quarkus template (the domain-appropriate choice) | Backstage Software Templates |
| 8 | Scaffolded a service with catalog-grounded configuration | `backstage-agent templates execute` |
| 9 | Verified the new service is registered with correct relationships | `backstage-agent catalog get` |

Every technology choice — Quarkus, PostgreSQL, IBM MQ, OpenTelemetry, Vault — came from the catalog, not from the agent's training data or assumptions. The catalog is the organizational source of truth. The agent is just the interface.
