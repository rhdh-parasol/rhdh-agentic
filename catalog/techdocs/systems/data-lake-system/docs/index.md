# Enterprise Data Lake System

Central data lake ingesting raw data from all operational systems into a governed
data platform. Provides certified data products and curated datasets for analytics,
actuarial, and regulatory consumption.

**Domain**: Data & Analytics
**Owner**: `data-analytics-engineering`
**API**: Data Catalogue API (v2, internal)

## Architecture Overview

The Data Lake follows a medallion architecture:

1. **Bronze (raw)**: Raw event streams from operational domains ingested via Kafka.
   No transformation — append-only, schema-on-read.
2. **Silver (cleansed)**: Data quality rules applied, PII masked/pseudonymized,
   schema enforced. Most analytical queries run against silver.
3. **Gold (curated)**: Business-specific data products with SLAs, certified by
   data stewards. Published to the Data Catalogue API for discovery.

Key components: data-ingestion-service, data-streaming-service,
data-catalogue-service, data-quality-service, data-governance-service,
data-lineage-tracker.

## Key Decisions

- [ADR-001: Kafka-First Ingestion over Batch ETL](adrs/001-kafka-first-ingestion.md)
