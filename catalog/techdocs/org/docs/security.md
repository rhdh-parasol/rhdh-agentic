# Security & Authentication Patterns

Security standards for all Parasol Insurance services, derived from the
platform engineering stack and regulatory requirements (FCA, NAIC, GDPR, PCI-DSS).

## Authentication

### Service Identity

All services authenticate to each other using **mTLS** managed by the
service mesh (Istio on OpenShift). Service identities are SPIFFE-based,
issued automatically by the platform.

No service-to-service calls should use shared secrets or API keys.

### User Identity

User-facing authentication uses **Keycloak** (ADOPT on Tech Radar) as the
central identity provider:

| Flow | Protocol | Use Case |
|------|----------|----------|
| Authorization Code + PKCE | OIDC | Web portal, mobile app |
| Client Credentials | OAuth2 | Broker-to-Parasol API integrations |
| Device Authorization | OAuth2 | Smart device / IoT (telematics) |

Token format: **JWT** signed with RS256. Access tokens are short-lived (15 min).
Refresh tokens are long-lived (8 hours) with rotation.

The Broker Authentication API (`https://auth.parasol.com/oauth2/v2`) provides
the OAuth2 endpoints for external integrations.

### API Gateway

The API Gateway System (`api-gateway-system`) enforces:

- JWT validation on all inbound requests
- Rate limiting per client identity
- API key management for legacy integrations
- mTLS termination for external partners

## Authorization

### Role-Based Access Control

Parasol uses domain-scoped RBAC:

| Role Pattern | Example | Description |
|-------------|---------|-------------|
| `<domain>:reader` | `claims:reader` | Read-only access to domain resources |
| `<domain>:writer` | `claims:writer` | Create and update domain resources |
| `<domain>:admin` | `claims:admin` | Full access including delete and config |
| `<domain>:auditor` | `compliance:auditor` | Read-only with full audit trail access |

Roles are assigned via Keycloak groups that map to Parasol's Backstage Group entities.

### Sensitive Operations

Operations involving financial transactions or PII require additional controls:

| Operation | Requirement |
|-----------|------------|
| Claims payment > threshold | Dual-approval (second authorized user) |
| Policy cancellation | Statutory notice period check |
| PII data export | Audit log entry + manager approval |
| Payment card processing | PCI-DSS Level 1 compliance |

## Data Protection

### Data Classification

| Level | Examples | Requirements |
|-------|----------|-------------|
| **Restricted** | Payment card data, SSN, medical records | Encryption at rest + in transit, field-level masking, PCI-DSS/HIPAA controls |
| **Confidential** | Policy details, claim records, personal data | Encryption at rest + in transit, RBAC, GDPR data subject rights |
| **Internal** | Service metrics, system logs, config | Encryption in transit, standard access controls |
| **Public** | Product descriptions, office locations | No special controls |

### Encryption

- **In transit**: TLS 1.3 minimum. mTLS for service-to-service.
- **At rest**: AES-256 for all data stores containing Confidential or Restricted data.
- **Key management**: HashiCorp Vault integrated with OpenShift.

### PII Handling

Services processing personal data must:

1. Register with the GDPR Compliance System (`gdpr-compliance-system`)
2. Support data subject access requests (DSAR) via the Privacy DSR API
3. Implement data retention policies (auto-delete after retention period)
4. Log all PII access to the Audit Trail System (`audit-trail-system`)

Services tagged with `pci-dss` (e.g., Premium Payment API) must additionally
comply with PCI-DSS Level 1 controls including network segmentation, quarterly
vulnerability scans, and annual penetration testing.

## Container Security

All container images must pass **Red Hat Advanced Cluster Security (ACS)**
(ADOPT on Tech Radar) scanning before deployment:

- No critical or high CVEs in base images
- No secrets embedded in images
- Read-only root filesystem enforced
- Non-root user execution

**IBM Guardium** (ADOPT on Tech Radar) provides database activity monitoring
for services handling Restricted or Confidential data.

## Secrets Management

- Application secrets stored in HashiCorp Vault, injected via OpenShift integration
- No secrets in environment variables, config files, or container images
- Database credentials rotated every 90 days
- API keys for external partners rotated annually with 30-day overlap period
