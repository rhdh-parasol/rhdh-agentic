# ADR-001: Centralized Rating Engine vs Per-Product Raters

**Status**: Accepted
**Date**: 2023-09-20

## Context

Parasol underwrites across multiple lines of business: personal auto, personal
property, commercial lines, specialty lines, and life & annuities. Each line has
different rating logic, rate table structures, and regulatory filing requirements.

The organization must decide whether to build a single centralized rating engine
that handles all products, or allow each line of business to build and maintain
its own rating service.

## Decision

Build a **single centralized Rating Engine System** (`rating-engine-system`)
that handles premium calculation for all product lines via the Premium Rating API.

The engine uses a plugin architecture where product-specific rating logic is
loaded as configuration (rate tables + factor definitions) rather than code.
The core engine provides:

- Rate table versioning and effective-dating
- Factor application (multiplicative relativities, additive surcharges)
- Minimum/maximum premium constraints
- Multi-state regulatory rate filing support
- Both real-time and batch rating modes

## Alternatives Considered

### Alternative 1: Per-product rating services

Each line of business builds its own rating microservice (auto-rater,
property-rater, commercial-rater, etc.).

**Rejected because**:

- **Duplicated infrastructure**: Each rater would need its own rate table
  management, versioning, effective-dating, and regulatory filing support —
  the same infrastructure problem solved 5+ times.
- **Inconsistent behavior**: Different teams would implement rounding,
  factor ordering, and minimum premium rules differently, leading to
  inconsistencies auditors would flag.
- **Actuarial team friction**: Actuaries work across lines. Having one rating
  platform with one rate table format reduces their cognitive overhead.
- **Regulatory risk**: State insurance departments require consistent
  rate filing processes. A fragmented rating landscape increases filing errors.

### Alternative 2: Third-party rating platform (vendor SaaS)

Use a commercial insurance rating platform (e.g., Guidewire RatingManager,
Duck Creek Rating).

**Rejected because**:

- **Latency**: SaaS rating introduces network latency that threatens the 200ms
  p99 SLO required for real-time quote/bind flows.
- **Customization limits**: Parasol's specialty lines (cyber, marine, trade credit)
  have bespoke rating structures that vendor platforms struggle to model without
  expensive customization.
- **Data sovereignty**: Rate tables contain proprietary actuarial IP. Hosting
  them on a third-party platform raises IP protection concerns.
- **Cost**: Per-transaction pricing at Parasol's volume (millions of ratings/day
  during renewal season) is prohibitively expensive.

## Consequences

**Positive**:

- Single point of rate table management for actuaries
- Consistent rating behavior across all product lines
- One service to optimize for the 200ms p99 latency SLO
- Regulatory rate filing uses a single, audited pipeline
- Batch re-rating of the entire renewal book runs through the same logic as
  real-time quotes, eliminating price-at-renewal discrepancies

**Negative**:

- The rating engine is a critical shared service — downtime affects all quoting.
  Mitigated by running multi-AZ replicas and a circuit-breaker pattern in the
  quote-bind-system.
- Product-specific rating complexity (e.g., cyber risk questionnaire scoring)
  must fit within the plugin/configuration model. Some edge cases require
  extending the core engine, creating coupling between lines of business.
- Rate table deployments for one product can theoretically affect another.
  Mitigated by product-scoped rate table namespaces and canary deployments.
