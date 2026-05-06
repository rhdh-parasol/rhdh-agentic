# API Design Conventions

Standards derived from Parasol's 16 production OpenAPI 3.0.3 specifications.

## Specification Format

All APIs must be documented using **OpenAPI 3.0.3**. Inline definitions within
Backstage API entities are acceptable for internal APIs. Public APIs should
additionally maintain a standalone spec file in the service repository.

## URL Structure

### Public APIs

Public APIs (accessible to customers, brokers, or third parties) use the
`api.parasol.com` host with domain-scoped paths:

```
https://api.parasol.com/<domain>/<resource>/v<major>
```

Examples from production:

| API | URL |
|-----|-----|
| FNOL Submission | `https://api.parasol.com/claims/fnol/v2` |
| Claims Status | `https://api.parasol.com/claims/status/v1` |
| Quote & Bind | `https://api.parasol.com/underwriting/quote/v4` |
| Policy Query | `https://api.parasol.com/policy/v3` |
| Policy Endorsement | `https://api.parasol.com/policy/endorsements/v2` |
| Premium Payment | `https://api.parasol.com/billing/payments/v2` |
| Customer Self-Service | `https://api.parasol.com/customer/self-service/v3` |
| Privacy DSR | `https://api.parasol.com/privacy/dsr/v1` |

### Internal APIs

Internal APIs (service-to-service only) use the `api-internal.parasol.com` host:

```
https://api-internal.parasol.com/<resource>/v<major>
```

Examples from production:

| API | URL |
|-----|-----|
| Fraud Score | `https://api-internal.parasol.com/fraud/v3` |
| Premium Rating | `https://api-internal.parasol.com/rating/v5` |
| ML Inference | `https://api-internal.parasol.com/ml/inference/v1` |
| Data Catalogue | `https://api-internal.parasol.com/data/catalogue/v2` |
| Bordereau Reporting | `https://api-internal.parasol.com/reinsurance/bordereau/v1` |
| Audit Trail | `https://api-internal.parasol.com/compliance/audit/v1` |

### Authentication Endpoints

OAuth2 and identity endpoints use the `auth.parasol.com` host:

```
https://auth.parasol.com/oauth2/v2
```

## Versioning

- **URL-based major versioning**: include the major version in the URL path (`/v1`, `/v2`).
- Breaking changes require a new major version.
- Non-breaking additions (new optional fields, new endpoints) do not require a version bump.
- The OpenAPI `info.version` field carries the full semantic version (e.g., `"5.0.0"`).

## Naming Conventions

### Operation IDs

Use **camelCase** for operation IDs. The pattern is `<verb><Resource>`:

- `submitFnol`, `getFnolStatus`
- `createQuote`, `getQuote`, `bindQuote`
- `calculatePremium`, `getRateTables`
- `searchPolicies`, `getPolicyByNumber`
- `scoreClaimFraud`, `scorePaymentFraud`

### Path Parameters

Use **camelCase** for path and query parameters:

- `submissionId`, `claimReference`, `quoteId`, `policyNumber`, `paymentId`

### Schema Names

Use **PascalCase** for schema/model names:

- `FnolSubmission`, `FnolAcknowledgement`, `ClaimStatus`, `FraudScoreResult`

## Response Codes

Use standard HTTP status codes consistently:

| Code | When to Use |
|------|------------|
| `200` | Successful retrieval or synchronous operation |
| `201` | Resource created |
| `202` | Accepted for asynchronous processing (e.g., FNOL submission) |
| `400` | Invalid request data |
| `403` | Not authorized to access this resource |
| `404` | Resource not found |

## API Classification

Tag every API entity with exactly one visibility tag:

- `public-api` — accessible to external consumers (customers, brokers, third parties)
- `internal-api` — service-to-service only, not exposed beyond Parasol's network

Additionally, tag APIs that handle sensitive data:

- `pci-dss` — APIs processing payment card data (e.g., Premium Payment API)

## Required Schema Patterns

### Enumerations

Use string enumerations with UPPER_SNAKE_CASE values:

```yaml
status:
  type: string
  enum: [OPEN, PENDING_INFORMATION, UNDER_ASSESSMENT, SETTLED, CLOSED, DENIED]
```

### Date Fields

Use ISO 8601 format strings with OpenAPI `format: date` or `format: date-time`:

```yaml
dateOfLoss:
  type: string
  format: date
estimatedContactTime:
  type: string
  format: date-time
```

### Risk and Score Responses

Numeric scores must declare `minimum` and `maximum` bounds:

```yaml
score:
  type: number
  minimum: 0
  maximum: 100
riskBand:
  type: string
  enum: [LOW, MEDIUM, HIGH, CRITICAL]
```
