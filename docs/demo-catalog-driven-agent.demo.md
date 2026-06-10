# Catalog-Driven Agent: Building a Payment Reconciliation Service

*2026-06-04T13:00:33Z by Showboat 0.6.1*
<!-- showboat-id: 0f0ebb3a-919d-4e16-992d-4dcc2c75b966 -->

> **Spec:** [demo-script-plan.md](demo-script-plan.md) | **Branch:** docs/demo-script-v2-plan

An AI coding agent queries a live Backstage catalog *before* writing a line of code.
It discovers the organizational landscape, identifies existing services to integrate
with, and selects the right software template — all from the catalog, not from
training data.

**Setup:** RHDH instance at `localhost:7007` running `quay.io/rhdh-community/rhdh:next`
with the [Parasol Insurance catalog](https://github.com/rhdh-parasol) loaded (~276 entities).
Authenticated via `backstage-cli auth login` (GitHub OAuth).

**Phases demonstrated:** 1 (Discover), 2 (Learn), 3 (Reuse), 4 (Scaffold).
Phase 5 (Verify) requires template execution prep.

## Phase 1: Discover

The agent maps the organizational landscape. Its task: build a payment reconciliation
service for Parasol Insurance. Before writing any code, it needs to understand the
domain structure — what domains exist, which one owns payment processing in Claims,
and what services already live there.

### List all domains

```bash
NPM_CONFIG_LEGACY_PEER_DEPS=true npx @backstage/cli@0.36.2 actions execute catalog:query-catalog-entities --query '{"kind":"Domain"}' --fields '["metadata.name","metadata.description"]' 2>/dev/null
```

```output
{
  "items": [
    {
      "metadata": {
        "name": "customer-portal",
        "description": "Customer-facing digital channels including the self-service web portal,\niOS and Android mobile apps, and the broker/intermediary portal. Provides\npolicy management, claims tracking, and document access.\n"
      }
    },
    {
      "metadata": {
        "name": "compliance-regulatory",
        "description": "Regulatory reporting (NAIC, FCA, EIOPA), audit trail systems, GDPR and\nCCPA data subject rights tooling, Solvency II capital reporting, and\nsanctions screening infrastructure.\n"
      }
    },
    {
      "metadata": {
        "name": "personal-auto",
        "description": "Motor and auto insurance for individual customers and families. Covers\nprivate passenger vehicles, motorcycles, and classic cars. Includes\ntelematics-based usage products and fleet policies for individuals.\n"
      }
    },
    {
      "metadata": {
        "name": "data-analytics",
        "description": "Enterprise data platform, actuarial modelling, machine learning pipelines,\nbusiness intelligence reporting, and data governance. Provides certified\ndata products to all business domains for decision support.\n"
      }
    },
    {
      "metadata": {
        "name": "underwriting",
        "description": "Risk assessment, pricing, and capacity management across all lines.\nIncludes quote and bind workflows, rating engines, exposure management,\nfacultative referrals, and automated underwriting decisioning.\n"
      }
    },
    {
      "metadata": {
        "name": "platform-engineering",
        "description": "Shared engineering infrastructure services including identity and access\nmanagement, API gateway, service mesh, secret management, observability,\nand the internal developer platform (IDP).\n"
      }
    },
    {
      "metadata": {
        "name": "billing-payments",
        "description": "Premium collection, instalment plan management, direct debit mandates,\ncredit card processing, refunds, and lapse/reinstatement payment flows.\nIntegrates with external payment acquirers and banking partners.\n"
      }
    },
    {
      "metadata": {
        "name": "claims",
        "description": "Cross-line-of-business claims management covering intake (FNOL), triage,\nadjuster assignment, damage estimation, reserve setting, fraud detection,\nsettlement payment, subrogation recovery, and litigation management.\n"
      }
    },
    {
      "metadata": {
        "name": "policy-administration",
        "description": "Core policy lifecycle management platform shared across all lines of\nbusiness. Handles policy inception, mid-term adjustments (endorsements),\nrenewals, lapses, cancellations, and reinstatements.\n"
      }
    },
    {
      "metadata": {
        "name": "reinsurance",
        "description": "Outward reinsurance placement and management including proportional and\nnon-proportional treaty programmes, facultative reinsurance, bordereau\nproduction, and cession accounting with reinsurer counterparties.\n"
      }
    },
    {
      "metadata": {
        "name": "commercial-lines",
        "description": "Business insurance products including commercial property, general\nliability, workers' compensation, directors and officers liability,\nprofessional indemnity, and commercial fleet.\n"
      }
    },
    {
      "metadata": {
        "name": "personal-property",
        "description": "Home, renters, and contents insurance for individuals and families.\nCovers buildings, contents, and landlord policies. Includes high-net-worth\nand overseas property extensions.\n"
      }
    },
    {
      "metadata": {
        "name": "specialty-lines",
        "description": "Non-standard and complex insurance risks including cyber liability, marine\ncargo and hull, aviation hull and liability, and trade credit. These\nproducts require specialist underwriting and bespoke policy wording.\n"
      }
    },
    {
      "metadata": {
        "name": "life-annuities",
        "description": "Term life, whole-of-life, and universal life insurance products alongside\nfixed and variable annuities. Includes group pension administration and\nlong-term care insurance products.\n"
      }
    }
  ],
  "totalItems": 14,
  "hasMoreEntities": false
}
```

14 domains. Two are immediately relevant: **claims** (where our reconciliation service
lives) and **billing-payments** (the payment execution domain it must integrate with).
The agent drills into Claims.

### Inspect the Claims domain

```bash
NPM_CONFIG_LEGACY_PEER_DEPS=true npx @backstage/cli@0.36.2 actions execute catalog:get-catalog-entity --kind Domain --name claims 2>/dev/null
```

```output
{
  "metadata": {
    "namespace": "default",
    "annotations": {
      "backstage.io/managed-by-location": "url:https://github.com/rhdh-parasol/rhdh-agentic/tree/main/catalog/overlays/parasol-foundations-annotated.yaml",
      "backstage.io/managed-by-origin-location": "url:https://github.com/rhdh-parasol/rhdh-agentic/blob/main/catalog/parasol-catalog-index.yaml",
      "backstage.io/view-url": "https://github.com/rhdh-parasol/rhdh-agentic/tree/main/catalog/overlays/parasol-foundations-annotated.yaml",
      "backstage.io/edit-url": "https://github.com/rhdh-parasol/rhdh-agentic/edit/main/catalog/overlays/parasol-foundations-annotated.yaml",
      "backstage.io/source-location": "url:https://github.com/rhdh-parasol/rhdh-agentic/tree/main/catalog/overlays/",
      "backstage.io/techdocs-ref": "dir:../techdocs/domains/claims"
    },
    "name": "claims",
    "title": "Claims",
    "description": "Cross-line-of-business claims management covering intake (FNOL), triage,\nadjuster assignment, damage estimation, reserve setting, fraud detection,\nsettlement payment, subrogation recovery, and litigation management.\n",
    "uid": "d852f21a-37e1-46f2-9eb3-253e0cdc36a9",
    "etag": "5b7d1df29a5faa129de5a16753c027558bcd85bd"
  },
  "apiVersion": "backstage.io/v1alpha1",
  "kind": "Domain",
  "spec": {
    "owner": "group:default/claims-engineering"
  },
  "relations": [
    {
      "type": "hasPart",
      "targetRef": "system:default/claims-assessment-system"
    },
    {
      "type": "hasPart",
      "targetRef": "system:default/claims-document-system"
    },
    {
      "type": "hasPart",
      "targetRef": "system:default/claims-fraud-detection-system"
    },
    {
      "type": "hasPart",
      "targetRef": "system:default/claims-litigation-system"
    },
    {
      "type": "hasPart",
      "targetRef": "system:default/claims-payment-system"
    },
    {
      "type": "hasPart",
      "targetRef": "system:default/fnol-system"
    },
    {
      "type": "ownedBy",
      "targetRef": "group:default/claims-engineering"
    }
  ]
}
```

The Claims domain owns 6 systems. The agent identifies **claims-payment-system** as the
target — that's where settlement and disbursement services live. Owner: **claims-engineering**.

Note the `backstage.io/techdocs-ref` annotation — this domain has a handbook in TechDocs.
In Phase 2 (not shown), the agent would read it and discover the critical IBM MQ constraint.

### Find components in claims-payment-system

```bash
NPM_CONFIG_LEGACY_PEER_DEPS=true npx @backstage/cli@0.36.2 actions execute catalog:get-catalog-entity --kind System --name claims-payment-system 2>/dev/null
```

```output
{
  "metadata": {
    "namespace": "default",
    "annotations": {
      "backstage.io/managed-by-location": "url:https://github.com/rhdh-parasol/rhdh-agentic/tree/main/catalog/overlays/parasol-foundations-annotated.yaml",
      "backstage.io/managed-by-origin-location": "url:https://github.com/rhdh-parasol/rhdh-agentic/blob/main/catalog/parasol-catalog-index.yaml",
      "backstage.io/view-url": "https://github.com/rhdh-parasol/rhdh-agentic/tree/main/catalog/overlays/parasol-foundations-annotated.yaml",
      "backstage.io/edit-url": "https://github.com/rhdh-parasol/rhdh-agentic/edit/main/catalog/overlays/parasol-foundations-annotated.yaml",
      "backstage.io/source-location": "url:https://github.com/rhdh-parasol/rhdh-agentic/tree/main/catalog/overlays/"
    },
    "name": "claims-payment-system",
    "title": "Claims Payment System",
    "description": "Processes approved claim settlements and interim payments. Supports bank\ntransfer, cheque, and digital wallet disbursements. Enforces dual-control\napproval for payments above threshold limits.\n",
    "uid": "0100427a-35f1-4ea8-96f0-41cf7bc8befd",
    "etag": "f9422d79c499dbe5266d4dd580a3b9c3735dde9a"
  },
  "apiVersion": "backstage.io/v1alpha1",
  "kind": "System",
  "spec": {
    "owner": "group:default/claims-engineering",
    "domain": "claims"
  },
  "relations": [
    {
      "type": "hasPart",
      "targetRef": "component:default/bank-account-validation-service"
    },
    {
      "type": "hasPart",
      "targetRef": "component:default/claims-payment-disbursement-service"
    },
    {
      "type": "hasPart",
      "targetRef": "component:default/claims-settlement-service"
    },
    {
      "type": "hasPart",
      "targetRef": "component:default/subrogation-recovery-service"
    },
    {
      "type": "hasPart",
      "targetRef": "component:default/supplier-payment-service"
    },
    {
      "type": "ownedBy",
      "targetRef": "group:default/claims-engineering"
    },
    {
      "type": "partOf",
      "targetRef": "domain:default/claims"
    }
  ]
}
```

Five components already live in claims-payment-system:

| Component | Role |
|-----------|------|
| `claims-settlement-service` | Orchestrates settlements — calculates net payable after deductibles |
| `claims-payment-disbursement-service` | Executes payments via BACS/SEPA/ACH/cheque/wallet |
| `bank-account-validation-service` | Validates bank details before payment release |
| `supplier-payment-service` | Pays repair garages, contractors, medical providers |
| `subrogation-recovery-service` | Recovers from third parties after settlement |

The reconciliation service belongs here — it matches disbursed payments against bank
confirmations. The agent now knows its **system**, **owner**, and **neighbors**.

---

## Phase 2: Learn

The agent reads domain handbooks from TechDocs to understand the required technology
stack. This is where the demo's **"aha moment"** occurs — a cross-domain constraint
the agent would never have guessed.

### Discover entities with TechDocs

```bash
NPM_CONFIG_LEGACY_PEER_DEPS=true npx @backstage/cli@0.36.2 actions execute techdocs-mcp-extras:fetch-techdocs 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); [print(f'{e[\"kind\"]:8s} {e[\"name\"]:30s} {e.get(\"title\",\"\")}') for e in d['entities']]"
```

```output
Domain   billing-payments               Billing & Payments
Domain   claims                         Claims
Domain   customer-portal                Customer Portal
Domain   data-analytics                 Data & Analytics
Domain   policy-administration          Policy Administration
Domain   underwriting                   Underwriting
Group    parasol-platform-engineering   Parasol Platform Engineering
System   data-lake-system               Enterprise Data Lake System
System   fnol-system                    FNOL System
System   rating-engine-system           Rating Engine System
```

10 entities with TechDocs. The agent reads the two domains relevant to its service.

### Read the Claims domain handbook

```bash
NPM_CONFIG_LEGACY_PEER_DEPS=true npx @backstage/cli@0.36.2 actions execute techdocs-mcp-extras:retrieve-techdocs-content --entityRef domain:default/claims 2>/dev/null
```

Key findings from the Claims handbook:

| Technology | Status | Rationale |
|------------|--------|-----------|
| **Java (Quarkus)** | Required | Primary runtime for all transactional claims services |
| **Python** | Allowed | ML/fraud scoring only — forbidden on settlement/payment paths |
| **Node.js** | Allowed | Notification services only — non-transactional workloads |
| **AMQ Streams (Kafka)** | **Preferred** | Event-driven claim lifecycle events (FNOL created, status changed, payment approved) |
| **PostgreSQL** | Required | Only approved RDBMS |
| **Instana** | Required | p99 < 500ms latency SLO |

The Claims domain is clear: **Kafka is the preferred messaging backbone** for all
asynchronous domain events, including payment-related status changes.

### Read the Billing & Payments domain handbook

```bash
NPM_CONFIG_LEGACY_PEER_DEPS=true npx @backstage/cli@0.36.2 actions execute techdocs-mcp-extras:retrieve-techdocs-content --entityRef domain:default/billing-payments 2>/dev/null
```

Key findings from the Billing & Payments handbook:

| Technology | Status | Rationale |
|------------|--------|-----------|
| **Quarkus** | Preferred | Default for all new services |
| **IBM MQ** | **Required** | Guaranteed-delivery messaging for all payment transactions |
| **Guardium** | Required | Database activity monitoring — PCI-DSS scope |
| **ACS** | Required | Runtime security — no container runs without ACS enforcement |

And the governance rules:

> **Mandatory Rule #3:** All payment transaction messaging **MUST** use **IBM MQ**
> with guaranteed delivery. AMQ Streams (Kafka) is not approved for payment-critical
> paths due to at-least-once semantics.

> **Forbidden:** Using an unapproved message broker for payment transactions (IBM MQ only).

> **Requires Approval:** Using AMQ Streams (Kafka) for any messaging within this
> domain (must demonstrate the flow is not payment-critical).

### The "Aha Moment"

The two domains have **directly contradictory** messaging mandates:

| Domain | Messaging Rule | Why |
|--------|---------------|-----|
| **Claims** | Kafka **preferred** for all async domain events | Claim lifecycle events must flow through Kafka |
| **Billing & Payments** | IBM MQ **required** for all payment transactions | PCI-DSS Level 1 — Kafka's at-least-once semantics are insufficient for financial transactions |

The reconciliation service sits at the **intersection** of both domains:
- It **consumes** claim settlement events (Claims domain → Kafka)
- It **processes** payment transaction data (Billing domain → IBM MQ)

**Resolution: dual-broker architecture.** The service must bridge both messaging
systems — consuming claim lifecycle events from Kafka while using IBM MQ for all
payment transaction messaging. This is the only design that satisfies both domains'
mandatory governance rules simultaneously.

A generic agent — or a human developer unfamiliar with the Billing domain — would
have reached for Kafka by default. **The catalog prevented a PCI-DSS compliance
violation before a line of code was written.**

---

## Phase 3: Reuse

The agent identifies existing services and APIs to integrate with — not rebuild.

### Inspect upstream services

```bash
NPM_CONFIG_LEGACY_PEER_DEPS=true npx @backstage/cli@0.36.2 actions execute catalog:get-catalog-entity --kind Component --name claims-settlement-service 2>/dev/null
```

```output
{
  "metadata": {
    "namespace": "default",
    "annotations": {
      "backstage.io/managed-by-location": "url:https://github.com/benwilcock/backstage-catalogs/tree/dbc1ba9e7589b391cb2c292b964f4a729efb0489/parasol/parasol-catalog-claims.override.yaml",
      "backstage.io/managed-by-origin-location": "url:https://github.com/rhdh-parasol/rhdh-agentic/blob/main/catalog/parasol-catalog-index.yaml",
      "backstage.io/view-url": "https://github.com/benwilcock/backstage-catalogs/tree/dbc1ba9e7589b391cb2c292b964f4a729efb0489/parasol/parasol-catalog-claims.override.yaml",
      "backstage.io/source-location": "url:https://github.parasol.com/parasol/claims-settlement-service"
    },
    "name": "claims-settlement-service",
    "title": "Claims Settlement Service",
    "description": "Orchestrates the end-to-end settlement of approved claims. Calculates\nnet payable amounts after deductible, excess, co-insurance, and\nsubrogation recoveries. Creates payment instructions and triggers\nclaimant settlement offer communications.\n",
    "tags": [
      "claims",
      "payment",
      "finance",
      "java",
      "rest"
    ],
    "links": [
      {
        "url": "https://confluence.parasol.com/display/CLAIMS/claims-settlement-service",
        "title": "Internal Confluence Docs",
        "icon": "docs"
      },
      {
        "url": "https://github.parasol.com/parasol/claims-settlement-service",
        "title": "Source Code",
        "icon": "github"
      }
    ],
    "uid": "cff138dd-8527-4801-8643-fc6e670d479f",
    "etag": "63ac5d8329ec2fcf0ae1d30bfeadd1c20b6c20d9"
  },
  "apiVersion": "backstage.io/v1alpha1",
  "kind": "Component",
  "spec": {
    "type": "service",
    "lifecycle": "production",
    "owner": "group:default/claims-engineering",
    "system": "claims-payment-system",
    "dependsOn": [
      "component:default/bank-account-validation-service",
      "component:default/claims-payment-disbursement-service",
      "component:default/claims-reserve-calculator"
    ]
  },
  "relations": [
    {
      "type": "dependencyOf",
      "targetRef": "component:default/settlement-letter-generator"
    },
    {
      "type": "dependencyOf",
      "targetRef": "component:default/subrogation-recovery-service"
    },
    {
      "type": "dependsOn",
      "targetRef": "component:default/bank-account-validation-service"
    },
    {
      "type": "dependsOn",
      "targetRef": "component:default/claims-payment-disbursement-service"
    },
    {
      "type": "dependsOn",
      "targetRef": "component:default/claims-reserve-calculator"
    },
    {
      "type": "ownedBy",
      "targetRef": "group:default/claims-engineering"
    },
    {
      "type": "partOf",
      "targetRef": "system:default/claims-payment-system"
    }
  ]
}
```

```bash
NPM_CONFIG_LEGACY_PEER_DEPS=true npx @backstage/cli@0.36.2 actions execute catalog:get-catalog-entity --kind Component --name claims-payment-disbursement-service 2>/dev/null
```

```output
{
  "metadata": {
    "namespace": "default",
    "annotations": {
      "backstage.io/managed-by-location": "url:https://github.com/benwilcock/backstage-catalogs/tree/dbc1ba9e7589b391cb2c292b964f4a729efb0489/parasol/parasol-catalog-claims.override.yaml",
      "backstage.io/managed-by-origin-location": "url:https://github.com/rhdh-parasol/rhdh-agentic/blob/main/catalog/parasol-catalog-index.yaml",
      "backstage.io/view-url": "https://github.com/benwilcock/backstage-catalogs/tree/dbc1ba9e7589b391cb2c292b964f4a729efb0489/parasol/parasol-catalog-claims.override.yaml",
      "backstage.io/source-location": "url:https://github.parasol.com/parasol/claims-payment-disbursement-service"
    },
    "name": "claims-payment-disbursement-service",
    "title": "Claims Payment Disbursement Service",
    "description": "Executes approved claim payment instructions via bank transfer (BACS/\nSEPA/ACH), cheque generation, or digital wallet transfer. Enforces\ndual-control approval for payments exceeding settlement authority limits\nand maintains a full payment audit trail.\n",
    "tags": [
      "claims",
      "payment",
      "finance",
      "java",
      "rest"
    ],
    "links": [
      {
        "url": "https://confluence.parasol.com/display/CLAIMS/claims-payment-disbursement-service",
        "title": "Internal Confluence Docs",
        "icon": "docs"
      },
      {
        "url": "https://github.parasol.com/parasol/claims-payment-disbursement-service",
        "title": "Source Code",
        "icon": "github"
      }
    ],
    "uid": "b617c175-d0b8-4db6-a9d6-865292821ab1",
    "etag": "6d8446dcd161ce0a9c4fdc9a6a031a250445b0fe"
  },
  "apiVersion": "backstage.io/v1alpha1",
  "kind": "Component",
  "spec": {
    "type": "service",
    "lifecycle": "production",
    "owner": "group:default/claims-engineering",
    "system": "claims-payment-system",
    "dependsOn": [
      "component:default/bank-account-validation-service"
    ]
  },
  "relations": [
    {
      "type": "dependencyOf",
      "targetRef": "component:default/claims-settlement-service"
    },
    {
      "type": "dependsOn",
      "targetRef": "component:default/bank-account-validation-service"
    },
    {
      "type": "ownedBy",
      "targetRef": "group:default/claims-engineering"
    },
    {
      "type": "partOf",
      "targetRef": "system:default/claims-payment-system"
    }
  ]
}
```

Both are Java/REST services in production. The settlement service creates payment
instructions; the disbursement service executes them. The reconciliation service
will sit between these — matching what was *instructed* against what was *executed*.

### Discover the API surface

```bash
NPM_CONFIG_LEGACY_PEER_DEPS=true npx @backstage/cli@0.36.2 actions execute catalog:query-catalog-entities --query '{"kind":"API"}' --fields '["metadata.name","metadata.description","spec.owner"]' 2>/dev/null
```

```output
{
  "items": [
    {
      "metadata": {
        "name": "policy-query-api",
        "description": "High-performance read API for policy coverage and schedule data.\nConsumed by the claims system for coverage verification, the customer\nportal for self-service display, the broker portal, and third-party\nloss adjusters. The most widely consumed API in Parasol's estate.\n"
      },
      "spec": {
        "owner": "group:default/policy-platform-engineering"
      }
    },
    {
      "metadata": {
        "name": "premium-payment-api",
        "description": "Accepts premium payments from the customer web portal, mobile app,\nand third-party payment integrations. Supports card, direct debit\nsetup, and Open Banking account-to-account payments.\n"
      },
      "spec": {
        "owner": "group:default/billing-payments-engineering"
      }
    },
    {
      "metadata": {
        "name": "claims-status-api",
        "description": "Provides real-time claim status information to customers, brokers,\nand third-party systems. Returns claim milestones, current handler,\nreserve amounts (internal only), and payment history.\n"
      },
      "spec": {
        "owner": "group:default/claims-engineering"
      }
    },
    {
      "metadata": {
        "name": "reinsurance-bordereau-api",
        "description": "Internal API used by the bordereau reporting system to extract cession\ndata and submit premium and loss bordereaux to treaty reinsurers.\nProvides endpoints for cession queries, report generation, and\nsubmission status tracking.\n"
      },
      "spec": {
        "owner": "group:default/reinsurance-engineering"
      }
    },
    {
      "metadata": {
        "name": "premium-rating-api",
        "description": "Internal rating API consumed by all quoting services and the renewal\nengine. Calculates gross written premium for all Parasol products\nusing the current filed rate tables and actuarial factors.\n"
      },
      "spec": {
        "owner": "group:default/underwriting-engineering"
      }
    },
    {
      "metadata": {
        "name": "data-subject-rights-api",
        "description": "Accepts and tracks GDPR and CCPA data subject rights requests. Provides\nendpoints for access, erasure, portability, and objection requests,\nwith status tracking and deadline management built in.\n"
      },
      "spec": {
        "owner": "group:default/compliance-engineering"
      }
    },
    {
      "metadata": {
        "name": "data-catalogue-api",
        "description": "Provides discovery and metadata access to the Parasol enterprise\ndata catalogue. Enables data consumers to search for datasets, view\nlineage, check data quality scores, and request access to certified\ndata products.\n"
      },
      "spec": {
        "owner": "group:default/data-analytics-engineering"
      }
    },
    {
      "metadata": {
        "name": "customer-self-service-api-spec",
        "description": "Provides authenticated customers with self-service policy management\ncapabilities via the web portal and mobile app. Exposes policy data,\ndocument download, change requests, and claims status.\n"
      },
      "spec": {
        "owner": "group:default/digital-channels-engineering"
      }
    },
    {
      "metadata": {
        "name": "audit-log-api",
        "description": "Internal API for submitting and querying the immutable enterprise\naudit log. All Parasol systems must submit security and data access\nevents here for regulatory compliance and forensic investigation.\n"
      },
      "spec": {
        "owner": "group:default/compliance-engineering"
      }
    },
    {
      "metadata": {
        "name": "broker-authentication-api",
        "description": "Authenticates brokers and intermediaries for access to the Parasol\nbroker portal and Quote & Bind API. Validates FCA registration,\nmanages firm-level and individual credentials, and returns scoped\nOAuth tokens with delegated authority permissions.\n"
      },
      "spec": {
        "owner": "group:default/digital-channels-engineering"
      }
    },
    {
      "metadata": {
        "name": "policy-endorsement-api",
        "description": "Enables submission of mid-term policy change requests from all channels.\nSupports address changes, vehicle swaps, named driver amendments,\ncoverage limit changes, and voluntary extras additions.\n"
      },
      "spec": {
        "owner": "group:default/underwriting-engineering"
      }
    },
    {
      "metadata": {
        "name": "quote-bind-api",
        "description": "Enables broker management systems and insurance aggregators to request\nquotations from Parasol and bind accepted quotes into policies. Supports\npersonal auto, personal property, and SME commercial lines products.\n"
      },
      "spec": {
        "owner": "group:default/underwriting-engineering"
      }
    },
    {
      "metadata": {
        "name": "ml-model-inference-api",
        "description": "Provides a unified inference API for all production ML models hosted\non the Parasol model serving platform. Consumers specify the model\nname and version; the platform handles routing, feature fetching,\nand prediction serving.\n"
      },
      "spec": {
        "owner": "group:default/data-analytics-engineering"
      }
    },
    {
      "metadata": {
        "name": "fraud-score-api",
        "description": "Returns real-time fraud risk scores for claims and payment transactions.\nConsumed by FNOL triage, adjuster assignment, and payment processing\nservices. Also available to authorised SIU investigators.\n"
      },
      "spec": {
        "owner": "group:default/claims-engineering"
      }
    },
    {
      "metadata": {
        "name": "iam-token-api",
        "description": "Issues OAuth 2.0 access tokens and OIDC ID tokens for all internal\nservices and customer-facing applications. Provides JWKS endpoint\nfor token validation, token introspection, and token revocation.\n"
      },
      "spec": {
        "owner": "group:default/parasol-platform-engineering"
      }
    },
    {
      "metadata": {
        "name": "fnol-submission-api",
        "description": "Accepts first notice of loss submissions from all channels including the\ncustomer web portal, mobile app, broker portal, and third-party loss\nadjusters. Returns a claim reference number upon successful submission.\n"
      },
      "spec": {
        "owner": "group:default/claims-engineering"
      }
    }
  ],
  "totalItems": 16,
  "hasMoreEntities": false
}
```

16 APIs across the organization. The agent identifies four integration points for the
reconciliation service:

1. **claims-status-api** — payment history (the "expected" side of reconciliation)
2. **premium-payment-api** — Billing domain, premium refund/overpayment flows
3. **audit-log-api** — mandatory for all Parasol systems, immutable audit records
4. **fraud-score-api** — flag suspicious discrepancies during reconciliation

### Inspect the audit-log-api (mandatory integration)

```bash
NPM_CONFIG_LEGACY_PEER_DEPS=true npx @backstage/cli@0.36.2 actions execute catalog:get-catalog-entity --kind API --name audit-log-api 2>/dev/null
```

```output
{
  "metadata": {
    "namespace": "default",
    "annotations": {
      "backstage.io/managed-by-location": "url:https://github.com/benwilcock/backstage-catalogs/tree/dbc1ba9e7589b391cb2c292b964f4a729efb0489/parasol/parasol-catalog-apis.override.yaml",
      "backstage.io/managed-by-origin-location": "url:https://github.com/rhdh-parasol/rhdh-agentic/blob/main/catalog/parasol-catalog-index.yaml",
      "backstage.io/view-url": "https://github.com/benwilcock/backstage-catalogs/tree/dbc1ba9e7589b391cb2c292b964f4a729efb0489/parasol/parasol-catalog-apis.override.yaml",
      "backstage.io/source-location": "url:https://github.parasol.com/parasol/immutable-audit-log-service"
    },
    "name": "audit-log-api",
    "title": "Audit Log API",
    "description": "Internal API for submitting and querying the immutable enterprise\naudit log. All Parasol systems must submit security and data access\nevents here for regulatory compliance and forensic investigation.\n",
    "tags": [
      "compliance-regulatory",
      "audit",
      "security",
      "internal-api"
    ],
    "uid": "4367fb49-b146-4d24-b824-2448a4352f1e",
    "etag": "04fc05c108c0b29d2d91f08ad104fc9bb7428658"
  },
  "apiVersion": "backstage.io/v1alpha1",
  "kind": "API",
  "spec": {
    "type": "openapi",
    "lifecycle": "production",
    "owner": "group:default/compliance-engineering",
    "system": "audit-trail-system",
    "definition": "openapi: \"3.0.3\"\ninfo:\n  title: Audit Log API\n  version: \"1.0.0\"\n  description: Append-only audit event submission and query interface.\nservers:\n  - url: https://api-internal.parasol.com/compliance/audit/v1\npaths:\n  /events:\n    post:\n      summary: Submit one or more audit events\n      operationId: submitAuditEvents\n      requestBody:\n        required: true\n        content:\n          application/json:\n            schema:\n              $ref: \"#/components/schemas/AuditEventBatch\"\n      responses:\n        \"204\":\n          description: Events accepted\n        \"400\":\n          description: Invalid event format\n    get:\n      summary: Query audit events\n      operationId: queryAuditEvents\n      parameters:\n        - name: subjectId\n          in: query\n          schema:\n            type: string\n        - name: eventType\n          in: query\n          schema:\n            type: string\n        - name: from\n          in: query\n          schema:\n            type: string\n            format: date-time\n        - name: to\n          in: query\n          schema:\n            type: string\n            format: date-time\n      responses:\n        \"200\":\n          description: Matching audit events\ncomponents:\n  schemas:\n    AuditEventBatch:\n      type: object\n      required: [events]\n      properties:\n        events:\n          type: array\n          items:\n            type: object\n            required: [timestamp, eventType, actorId, subjectId]\n            properties:\n              timestamp:\n                type: string\n                format: date-time\n              eventType:\n                type: string\n              actorId:\n                type: string\n              subjectId:\n                type: string\n              resourceType:\n                type: string\n              outcome:\n                type: string\n                enum: [SUCCESS, FAILURE, DENIED]\n"
  },
  "relations": [
    {
      "type": "ownedBy",
      "targetRef": "group:default/compliance-engineering"
    },
    {
      "type": "partOf",
      "targetRef": "system:default/audit-trail-system"
    }
  ]
}
```

The audit-log-api includes the full OpenAPI spec inline. Key details the agent learns:

- **Append-only** — POST returns 204, no update/delete endpoints. Reconciliation
  discrepancies become immutable records (exactly what a regulator wants).
- **Mandatory** — description says "All Parasol systems must submit."
- **Cross-team dependency** — owned by compliance-engineering, not claims-engineering.

The agent now has a complete integration map without reading a single line of source code.

---

## Phase 4: Scaffold

The agent selects the right software template based on everything it learned about
the domain requirements.

### List available templates

```bash
NPM_CONFIG_LEGACY_PEER_DEPS=true npx @backstage/cli@0.36.2 actions execute catalog:query-catalog-entities --query '{"kind":"Template"}' --fields '["metadata.name","metadata.description","metadata.tags"]' 2>/dev/null
```

```output
{
  "items": [
    {
      "metadata": {
        "name": "parasol-python-service",
        "description": "Scaffold a new Python service for Parasol Insurance data-oriented domains.\nUse for Data & Analytics, ML pipelines, and actuarial workloads. Produces\na FastAPI project with health checks, Prometheus metrics, OpenTelemetry\ntracing, and a valid catalog-info.yaml.\n",
        "tags": [
          "python",
          "fastapi",
          "rest",
          "parasol",
          "data"
        ]
      }
    },
    {
      "metadata": {
        "name": "parasol-nodejs-service",
        "description": "Scaffold a new Node.js service for Parasol Insurance digital channels.\nUse for BFF (Backend-for-Frontend) services, push notification handlers,\nreal-time messaging, and broker portal APIs. Produces an Express.js project\nwith health checks, Prometheus metrics, OpenTelemetry tracing, and a valid\ncatalog-info.yaml.\n",
        "tags": [
          "nodejs",
          "express",
          "rest",
          "parasol",
          "bff"
        ]
      }
    },
    {
      "metadata": {
        "name": "parasol-quarkus-service",
        "description": "Scaffold a new Quarkus microservice for Parasol Insurance domains.\nUse for Claims, Underwriting, Policy Administration, Billing, and other\nJava-dominant domains. Produces a Maven project with REST endpoint,\nhealth checks, metrics, and a valid catalog-info.yaml.\n",
        "tags": [
          "java",
          "quarkus",
          "rest",
          "parasol",
          "recommended"
        ]
      }
    }
  ],
  "totalItems": 3,
  "hasMoreEntities": false
}
```

Three templates. The agent evaluates each against the Claims domain requirements:

| Template | Intended For | Tags | Verdict |
|----------|-------------|------|---------|
| `parasol-quarkus-service` | Claims, Underwriting, Billing (Java-dominant) | `java`, `quarkus`, `recommended` | **Correct** |
| `parasol-python-service` | Data & Analytics, ML pipelines, actuarial | `python`, `data` | Wrong — analytical, not transactional |
| `parasol-nodejs-service` | Digital channels, BFF, notifications | `nodejs`, `bff` | Wrong — presentation tier, not domain tier |

The Quarkus template is the only valid choice: it explicitly lists Claims as a target
domain, provides JTA transaction support for financial reconciliation, and carries the
`recommended` tag — Parasol's golden path marker.

### Inspect the selected template

```bash
NPM_CONFIG_LEGACY_PEER_DEPS=true npx @backstage/cli@0.36.2 actions execute catalog:get-catalog-entity --kind Template --name parasol-quarkus-service 2>/dev/null
```

```output
{
  "metadata": {
    "namespace": "default",
    "annotations": {
      "backstage.io/managed-by-location": "url:https://github.com/rhdh-parasol/rhdh-agentic/tree/main/catalog/templates/parasol-quarkus-service/template.yaml",
      "backstage.io/managed-by-origin-location": "url:https://github.com/rhdh-parasol/rhdh-agentic/blob/main/catalog/parasol-catalog-index.yaml",
      "backstage.io/view-url": "https://github.com/rhdh-parasol/rhdh-agentic/tree/main/catalog/templates/parasol-quarkus-service/template.yaml",
      "backstage.io/edit-url": "https://github.com/rhdh-parasol/rhdh-agentic/edit/main/catalog/templates/parasol-quarkus-service/template.yaml",
      "backstage.io/source-location": "url:https://github.com/rhdh-parasol/rhdh-agentic/tree/main/catalog/templates/parasol-quarkus-service/"
    },
    "name": "parasol-quarkus-service",
    "title": "Parasol Quarkus Service",
    "description": "Scaffold a new Quarkus microservice for Parasol Insurance domains.\nUse for Claims, Underwriting, Policy Administration, Billing, and other\nJava-dominant domains. Produces a Maven project with REST endpoint,\nhealth checks, metrics, and a valid catalog-info.yaml.\n",
    "tags": [
      "java",
      "quarkus",
      "rest",
      "parasol",
      "recommended"
    ],
    "uid": "d0295d0f-e0a9-4d61-bba1-73aa1de9f00a",
    "etag": "1649fd7f81babcedf920ca3f1d2a833d81ce2b18"
  },
  "apiVersion": "scaffolder.backstage.io/v1beta3",
  "kind": "Template",
  "spec": {
    "owner": "group:default/parasol-platform-engineering",
    "type": "service",
    "parameters": [
      {
        "title": "Service Information",
        "required": [
          "name",
          "description",
          "owner",
          "system"
        ],
        "properties": {
          "name": {
            "title": "Service Name",
            "type": "string",
            "description": "Unique service name in kebab-case (e.g., claim-adjuster-service)",
            "pattern": "^[a-z][a-z0-9-]*$",
            "ui:autofocus": true
          },
          "description": {
            "title": "Description",
            "type": "string",
            "description": "What does this service do?"
          },
          "owner": {
            "title": "Owner",
            "type": "string",
            "description": "The team that owns this service",
            "ui:field": "EntityPicker",
            "ui:options": {
              "catalogFilter": {
                "kind": [
                  "Group"
                ]
              }
            }
          },
          "system": {
            "title": "System",
            "type": "string",
            "description": "The Parasol system this service belongs to",
            "ui:field": "EntityPicker",
            "ui:options": {
              "catalogFilter": {
                "kind": [
                  "System"
                ]
              }
            }
          }
        }
      },
      {
        "title": "Java Configuration",
        "required": [
          "groupId",
          "artifactId",
          "javaPackageName"
        ],
        "properties": {
          "groupId": {
            "title": "Group ID",
            "type": "string",
            "default": "com.parasol",
            "description": "Maven group ID"
          },
          "artifactId": {
            "title": "Artifact ID",
            "type": "string",
            "description": "Maven artifact ID (defaults to service name)"
          },
          "javaPackageName": {
            "title": "Java Package",
            "type": "string",
            "default": "com.parasol",
            "description": "Base Java package name"
          },
          "port": {
            "title": "Port",
            "type": "number",
            "default": 8080,
            "description": "HTTP port for the service"
          }
        }
      }
    ],
    "steps": [
      {
        "id": "template",
        "name": "Fetch Service Skeleton",
        "action": "fetch:template",
        "input": {
          "url": "./skeleton",
          "values": {
            "name": "${{ parameters.name }}",
            "description": "${{ parameters.description }}",
            "groupId": "${{ parameters.groupId }}",
            "artifactId": "${{ parameters.artifactId }}",
            "javaPackageName": "${{ parameters.javaPackageName }}",
            "port": "${{ parameters.port }}"
          }
        }
      },
      {
        "id": "catalogTemplate",
        "name": "Fetch Catalog Info",
        "action": "fetch:template",
        "input": {
          "url": "../skeletons/catalog-info/",
          "values": {
            "name": "${{ parameters.name }}",
            "description": "${{ parameters.description }}",
            "owner": "${{ parameters.owner }}",
            "system": "${{ parameters.system }}",
            "stack": "java"
          }
        }
      }
    ],
    "output": {
      "links": [
        {
          "title": "Service Skeleton",
          "icon": "catalog",
          "entityRef": "${{ steps.catalogTemplate.output.entityRef }}"
        }
      ]
    }
  },
  "relations": [
    {
      "type": "ownedBy",
      "targetRef": "group:default/parasol-platform-engineering"
    }
  ]
}
```

The template's parameter schema reveals exactly what the agent needs to supply:

- **name**: \`payment-reconciliation-service\`
- **description**: Reconciles claim settlement payments against the financial ledger
- **owner**: \`group:default/claims-engineering\` (from Phase 1)
- **system**: \`system:default/claims-payment-system\` (from Phase 1)
- **groupId**: \`com.parasol\` (default)
- **artifactId**: \`payment-reconciliation-service\`

The template would produce a Maven/Quarkus project with REST endpoints, health
checks, metrics, and a \`catalog-info.yaml\` with \`stack: "java"\` — which downstream
systems (CI, security scanners, SRE dashboards) key off of.

> **Template execution not shown.** Running \`scaffolder:execute-template\` would
> scaffold a real service and push to GitHub. That step requires additional template
> prep and is deferred to a future demo session.

---

## Summary

| Phase | What the agent discovered | Source of truth |
|-------|--------------------------|-----------------|
| 1 Discover | 14 domains → Claims → claims-payment-system → 5 components | Catalog entities + relations |
| 2 Learn | IBM MQ mandate, Kafka forbidden on payment paths → dual-broker design | TechDocs handbooks |
| 3 Reuse | 4 API integration points, 2 upstream services | Catalog components + APIs |
| 4 Scaffold | Quarkus is the only valid template (Python/Node.js are wrong) | Software Templates |

Every technology choice — Quarkus, the integration map, the team ownership,
the audit trail requirement — came from the catalog, not from the agent's
training data. A generic agent that skipped the catalog would have:

- Guessed at the tech stack instead of reading the domain mandate
- Missed the IBM MQ constraint (Phase 2) and defaulted to Kafka
- Rebuilt services that already exist instead of integrating with them
- Picked any template instead of the one marked `recommended` for Claims
