# Observability Requirements

All Parasol services must emit metrics, structured logs, and distributed traces
to the central Observability System (`observability-system`) owned by
Platform Engineering.

## Three Pillars

### Metrics

Every service must expose the following RED metrics:

| Metric | Format | Description |
|--------|--------|-------------|
| `http_requests_total` | Counter | Total HTTP requests by method, path, status code |
| `http_request_duration_seconds` | Histogram | Request latency distribution |
| `http_requests_in_flight` | Gauge | Current concurrent requests |

Domain-specific business metrics are encouraged (e.g., `claims_submitted_total`,
`quotes_generated_total`) and should use the domain name as a prefix.

**Format**: Prometheus exposition format. Services running on OpenShift must
expose a `/metrics` endpoint scraped by the platform monitoring stack.

### Structured Logging

All log output must be structured JSON with these required fields:

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | ISO 8601 | Event time |
| `level` | string | `DEBUG`, `INFO`, `WARN`, `ERROR` |
| `message` | string | Human-readable event description |
| `service` | string | Service name matching the Backstage component name |
| `traceId` | string | W3C Trace Context trace ID |
| `spanId` | string | W3C Trace Context span ID |

**Sensitive data**: Never log PII (names, policy numbers, payment details) in
plain text. Use field-level masking or tokenization. The Claims and Billing
domains have additional data classification requirements — see domain handbooks.

### Distributed Tracing

All services must propagate W3C Trace Context headers (`traceparent`,
`tracestate`) on all outbound HTTP calls and message publications.

**Instrumentation**:

- Java services: use OpenTelemetry Java agent (auto-instrumentation)
- Python services: use `opentelemetry-instrument` wrapper
- Node.js services: use `@opentelemetry/auto-instrumentations-node`

**Sampling**: Production services use tail-based sampling at 10% for normal
traffic, 100% for errors and high-latency requests (> p99).

## SLO Requirements

Every production service must define at least:

| SLO | Target | Measurement Window |
|-----|--------|-------------------|
| Availability | >= 99.9% | 30-day rolling |
| Latency (p99) | domain-specific | 30-day rolling |
| Error rate | < 0.1% of requests | 30-day rolling |

Latency targets vary by domain:

- **Claims, Policy, Billing**: p99 < 500ms (customer-facing)
- **Underwriting (Rating Engine)**: p99 < 200ms (real-time pricing)
- **Data Platform (batch)**: job completion within SLA window
- **Digital Channels (web/mobile APIs)**: p99 < 300ms

## Alerting

Critical alerts (paging) must fire for:

- Availability drops below SLO for 5 consecutive minutes
- Error rate exceeds 1% for 5 consecutive minutes
- Latency p99 exceeds 2x the SLO target for 10 consecutive minutes

Warning alerts (non-paging) for:

- Approaching SLO burn rate that would exhaust error budget within 72 hours
- Certificate expiry within 30 days
- Disk or memory usage above 80%

## Dashboards

Every service team must maintain a Grafana dashboard in the standard layout:

1. **Overview row**: request rate, error rate, latency percentiles
2. **Downstream row**: dependency health (calls to other Parasol services)
3. **Infrastructure row**: CPU, memory, pod count, JVM/runtime metrics
4. **Business row**: domain-specific business metrics
