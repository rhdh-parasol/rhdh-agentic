# Rating Engine System

Centralised actuarial rating engine that calculates premiums for all products
using filed rate tables, relativities, and surcharges. Supports both real-time
API calls and batch re-rating of renewal books.

**Domain**: Underwriting
**Owner**: `underwriting-engineering`
**API**: Premium Rating API (v5, internal)

## Architecture Overview

The Rating Engine is a compute-intensive service that evaluates rate tables
against risk profiles. It supports two modes:

1. **Real-time rating** via the Premium Rating API — used during quote/bind flows.
   Must respond within 200ms (p99 SLO).
2. **Batch re-rating** — used for renewal book re-pricing. Processes millions of
   policies overnight using rate table updates filed with state regulators.

Rate tables are versioned and maintained by the actuarial team. Each product line
has its own rate table structure with base rates, relativities (factors), surcharges,
discounts, and minimum/maximum premium constraints.

## Key Decisions

- [ADR-001: Centralized Rating Engine vs Per-Product Raters](adrs/001-centralized-rating.md)
