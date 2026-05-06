# ADR-001: Kafka-First Ingestion over Batch ETL

**Status**: Accepted
**Date**: 2024-01-10

## Context

The Enterprise Data Lake must ingest data from all operational domains: policy
lifecycle events, claims state changes, billing transactions, underwriting
decisions, and customer interactions. Historically, this was done via nightly
batch ETL jobs pulling from operational databases.

The organization needs near-real-time analytics (fraud detection, claims triage
ML models, real-time dashboards) and faster regulatory reporting cycles.

## Decision

Adopt a **Kafka-first ingestion pattern** using AMQ Streams. Operational domains
publish domain events to Kafka topics as part of their normal operations (e.g.,
policy-created, claim-submitted, payment-processed). The Data Lake's
data-ingestion-service and data-streaming-service consume these events and land
them in the bronze layer.

Batch ETL is retained only for:

- Historical backfill (one-time migrations)
- External data sources that do not support event streaming (e.g., regulatory
  reference data files, third-party data enrichment feeds)

## Alternatives Considered

### Alternative 1: Continue with nightly batch ETL

Keep the existing pattern of scheduled database extracts.

**Rejected because**:

- **Latency**: Nightly batch means analytics are always 24 hours stale. The fraud
  detection ML models need claims data within minutes, not hours — stale fraud
  scoring misses patterns in same-day claim submissions.
- **Database coupling**: ETL jobs query operational databases directly, creating
  schema coupling. When the policy team changes a table, ETL jobs break.
- **Load impact**: Heavy ETL queries during batch windows compete with operational
  workloads, causing performance degradation.

### Alternative 2: Change Data Capture (CDC) from databases

Use Debezium/CDC to capture database changes and stream them to Kafka.

**Rejected because**:

- **Semantic gap**: CDC captures row-level changes, not business events. A policy
  endorsement might touch 5 tables — reconstructing the business event from row
  changes is complex and error-prone.
- **Schema coupling**: CDC still couples the data lake to operational database schemas.
  If the policy team refactors their schema, CDC connectors break.
- **Domain teams' buy-in**: Operational domain teams already publish Kafka events
  (policy-event-streaming-service, claims event topics). Duplicating these events
  via CDC adds infrastructure without business value.

The approach was not fully rejected — CDC is used as a fallback for legacy systems
that cannot publish events. But it is not the primary ingestion pattern.

## Consequences

**Positive**:

- Near-real-time data availability (seconds to minutes, not hours)
- No direct coupling to operational databases — data producers define their own
  event schemas
- Operational domains own their event contracts (schema registry with Avro schemas)
- Kafka topics serve as the system of record for the bronze layer — events are
  immutable and replayable
- ML models (fraud, churn, pricing) can retrain on fresh data daily instead of
  weekly

**Negative**:

- Operational domains must publish well-structured events — this is additional
  work for domain teams. Mitigated by providing event schema templates and
  a shared Kafka client library.
- Event ordering guarantees require careful partition key selection (e.g.,
  policy number, claim reference) — incorrect partitioning can cause out-of-order
  processing
- Kafka infrastructure costs (AMQ Streams cluster) are higher than batch ETL
  scheduling, but offset by eliminating ETL database load
- Historical backfill still requires batch mechanisms — the Kafka-first pattern
  only applies to ongoing operations, not historical data migration
