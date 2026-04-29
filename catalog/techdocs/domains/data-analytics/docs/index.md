# Data & Analytics Domain Handbook

The Data & Analytics domain owns the enterprise data platform, actuarial
modelling, machine learning pipelines, business intelligence reporting, and
data governance. It provides certified data products consumed by all business
domains for decision support.

**Owner**: `data-analytics-engineering` (team)
**Components**: 14 services across 4 systems (largest Python concentration in Parasol)
**APIs**: 2 (Data Catalogue API v2, ML Inference API v1 — both internal)

## Approved Stack Matrix

| Technology | Status | Count | Rationale |
|-----------|--------|-------|-----------|
| **Python** | Required | 14 components | 100% of data domain services are Python. Standard runtime for data engineering, ML, and actuarial workloads. |
| **Java** | Forbidden | 0 | Not used in this domain. Data pipelines and ML workloads have no need for JVM overhead. Use Python. |
| **REST (OpenAPI 3.0.3)** | Required | 10 components | Synchronous API interfaces for data catalogue, ML inference, and reporting endpoints. |
| **Kafka (AMQ Streams)** | Required | — | Data ingestion streaming. The data-ingestion-service and data-streaming-service consume events from all operational domains (policy, claims, billing) via Kafka. |
| **watsonx.ai** | Required for ML | — | Model training studio for all ML workloads: fraud detection, churn prediction, lifetime value, pricing optimization. |
| **watsonx.data** | Preferred | — | Data lakehouse for actuarial and analytics workloads. Preferred over raw object storage for governed data products. |
| **watsonx.governance** | Required for ML | — | Model governance: bias detection, drift monitoring, lineage tracking. All production ML models must be registered. |
| **OpenShift AI** | Trial | — | Model serving, GPU scheduling, Jupyter notebooks for data scientists. |
| **IBM Granite** | Trial | — | Foundation models for text analytics (claim narrative analysis, policy document extraction). |
| **Db2** | Preferred | — | Data warehouse for structured analytical workloads and regulatory reporting. |
| **OpenShift 4** | Required | All | Container orchestration for all data services. |
| **IBM Guardium** | Required | — | PII masking and database activity monitoring. Data domain handles PII from all business domains. |

### ML/AI Lifecycle

| Phase | Tool | Status |
|-------|------|--------|
| Experimentation | Jupyter on OpenShift AI | Trial |
| Feature Engineering | ml-feature-store (internal service) | Production |
| Training | watsonx.ai | Required |
| Validation | watsonx.governance (bias/fairness checks) | Required |
| Serving | OpenShift AI (model serving) | Trial |
| Monitoring | watsonx.governance (drift detection) | Required |

## Governance Rules

### Mandatory

- All new data services MUST be written in Python.
- All ML models MUST be registered with watsonx.governance before production
  deployment, including bias/fairness evaluation results.
- All data products MUST be registered in the Data Catalogue API with schema
  documentation, data classification level, and retention policy.
- Data ingestion from operational domains MUST use Kafka consumers — no direct
  database access to other domains' data stores.
- All services handling PII MUST have IBM Guardium monitoring enabled and
  field-level masking configured for non-production environments.
- Actuarial models MUST maintain version history and be reproducible — pin all
  library versions and random seeds.

### Requires Approval

- Introducing a new ML framework or library not in the approved Python stack.
- Creating a new data product that combines PII from multiple domains (requires
  Data Protection Officer review).
- Deploying GPU workloads (requires OpenShift AI capacity planning with Platform
  Engineering).
- Exposing a new internal API to other domains (must go through API Gateway).
- Changing the data retention period for any data product (regulatory impact
  assessment required).

### Forbidden

- Direct database access to operational domain data stores (claims, policy,
  billing databases). Consume events via Kafka or query via published APIs.
- Storing raw PII in the data lake without masking or pseudonymization.
- Training ML models on unmasked PII without Data Protection Officer approval.
- Using cloud-hosted ML services outside the approved watsonx/OpenShift AI stack
  (data residency and sovereignty requirements).
- Deploying models that make automated decisions affecting policyholders
  (pricing, claim denial) without actuarial sign-off and regulatory review.

## Key Systems

| System | Purpose | Key Components |
|--------|---------|---------------|
| `data-lake-system` | Central data platform | data-ingestion-service, data-streaming-service, data-catalogue-service, data-quality-service, data-governance-service, data-lineage-tracker |
| `actuarial-platform-system` | Actuarial modelling | reserve-modelling-service, pricing-actuarial-service, capital-model-service, actuarial-data-service |
| `ml-pipeline-system` | ML training and serving | ml-training-orchestrator, ml-model-registry, ml-inference-service, ml-feature-store |
| `reporting-system` | BI and regulatory reporting | bi-dashboard-service, regulatory-reporting-engine, data-export-service, report-scheduler-service |

## When to Deviate

If you need a technology not listed above:

1. **Justify the Python gap** — if the workload genuinely cannot be served by
   Python (extremely rare in data/ML), document why.
2. **Data governance first** — any new tool that touches data must be evaluated
   for data residency, PII handling, and Guardium compatibility.
3. **Propose to Data & Analytics Engineering tech lead** with a written ADR.
4. **GPU capacity** — if the workload requires GPUs, coordinate with Platform
   Engineering for OpenShift AI capacity planning before committing.

Exceptions granted in the past:

- Spark (PySpark) for large-scale batch processing of historical claims data
  — approved because single-node Python could not process the full 10-year
  claims history within the regulatory reporting window.
