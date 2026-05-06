# TechDocs Demo

*2026-04-28T11:27:34Z by Showboat 0.6.1*
<!-- showboat-id: 8994fc95-c209-453c-828c-3f6f9e0199d5 -->

Spec: [techdocs/spec.md](spec.md)
Change: simulated-enterprise-catalog
Instance: rhdh-local-cookbook (<http://localhost:7007>)

## AC: TechDocs entities have buildable sites

Entities with backstage.io/techdocs-ref annotations have valid mkdocs.yml and docs/ directories. All 10 sites build successfully.

```bash
curl -s 'http://localhost:7007/api/catalog/entities' | jq '[.[] | select(.metadata.annotations["backstage.io/techdocs-ref"] != null) | {name: .metadata.name, kind: .kind, techdocs_ref: .metadata.annotations["backstage.io/techdocs-ref"]}]'
```

```output
[
  {
    "name": "parasol-platform-engineering",
    "kind": "Group",
    "techdocs_ref": "dir:../techdocs/org"
  },
  {
    "name": "data-lake-system",
    "kind": "System",
    "techdocs_ref": "dir:../techdocs/systems/data-lake-system"
  },
  {
    "name": "rating-engine-system",
    "kind": "System",
    "techdocs_ref": "dir:../techdocs/systems/rating-engine-system"
  },
  {
    "name": "claims",
    "kind": "Domain",
    "techdocs_ref": "dir:../techdocs/domains/claims"
  },
  {
    "name": "data-analytics",
    "kind": "Domain",
    "techdocs_ref": "dir:../techdocs/domains/data-analytics"
  },
  {
    "name": "customer-portal",
    "kind": "Domain",
    "techdocs_ref": "dir:../techdocs/domains/customer-portal"
  },
  {
    "name": "fnol-system",
    "kind": "System",
    "techdocs_ref": "dir:../techdocs/systems/fnol-system"
  },
  {
    "name": "underwriting",
    "kind": "Domain",
    "techdocs_ref": "dir:../techdocs/domains/underwriting"
  },
  {
    "name": "policy-administration",
    "kind": "Domain",
    "techdocs_ref": "dir:../techdocs/domains/policy-administration"
  },
  {
    "name": "billing-payments",
    "kind": "Domain",
    "techdocs_ref": "dir:../techdocs/domains/billing-payments"
  },
  {
    "name": "red-hat-developer-hub",
    "kind": "Component",
    "techdocs_ref": "url:https://github.com/redhat-developer/rhdh"
  }
]
```

10 Parasol entities have techdocs-ref annotations (6 Domains, 3 Systems, 1 Group). All 10 mkdocs.yml sites build:

```bash
MKDOCS=/tmp/mkdocs-venv/bin/mkdocs
for dir in   catalog/techdocs/org   catalog/techdocs/domains/claims   catalog/techdocs/domains/underwriting   catalog/techdocs/domains/policy-administration   catalog/techdocs/domains/billing-payments   catalog/techdocs/domains/customer-portal   catalog/techdocs/domains/data-analytics   catalog/techdocs/systems/fnol-system   catalog/techdocs/systems/rating-engine-system   catalog/techdocs/systems/data-lake-system; do
  name=$(basename "$dir")
  cd /workspace/rhdh-agentic/$dir && $MKDOCS build -d /tmp/mkdocs-build-demo-$name 2>&1 | grep -o 'Documentation built in [0-9.]* seconds' | sed "s/^/$name: /"
done
```

```output
org: Documentation built in 0.38 seconds
claims: Documentation built in 0.23 seconds
underwriting: Documentation built in 0.23 seconds
policy-administration: Documentation built in 0.22 seconds
billing-payments: Documentation built in 0.22 seconds
customer-portal: Documentation built in 0.22 seconds
data-analytics: Documentation built in 0.23 seconds
fnol-system: Documentation built in 0.25 seconds
rating-engine-system: Documentation built in 0.24 seconds
data-lake-system: Documentation built in 0.25 seconds
```

## AC: Approved Stack Matrix is agent-queryable

Reading the Claims domain handbook to answer: What framework should I use for a new service in Claims?

```bash
grep -A2 'Java (Quarkus)' /workspace/rhdh-agentic/catalog/techdocs/domains/claims/docs/index.md | head -1
```

```output
| **Java (Quarkus)** | Required | 17 components | Primary runtime for all transactional claims services. Quarkus preferred for new services; JBoss EAP acceptable for migration of existing services. |
```

## AC: Governance rules are explicit

Each handbook states mandatory, requires-approval, and forbidden rules.

```bash
grep -c '### Mandatory\|### Requires Approval\|### Forbidden' /workspace/rhdh-agentic/catalog/techdocs/domains/*/docs/index.md
```

```output
/workspace/rhdh-agentic/catalog/techdocs/domains/billing-payments/docs/index.md:3
/workspace/rhdh-agentic/catalog/techdocs/domains/claims/docs/index.md:3
/workspace/rhdh-agentic/catalog/techdocs/domains/customer-portal/docs/index.md:3
/workspace/rhdh-agentic/catalog/techdocs/domains/data-analytics/docs/index.md:3
/workspace/rhdh-agentic/catalog/techdocs/domains/policy-administration/docs/index.md:3
/workspace/rhdh-agentic/catalog/techdocs/domains/underwriting/docs/index.md:3
```

All 6 domain handbooks have all 3 governance sections (Mandatory, Requires Approval, Forbidden).

## AC: ADR completeness

Each ADR has Status, Date, Context, Decision, Alternatives Considered, and Consequences.

```bash
for adr in /workspace/rhdh-agentic/catalog/techdocs/systems/*/docs/adrs/0*.md; do
  name=$(basename $adr)
  system=$(echo $adr | grep -o 'systems/[^/]*' | cut -d/ -f2)
  sections=$(grep -c '## ' $adr)
  has_alternative=$(grep -c 'Alternative\|Rejected because' $adr)
  echo "$system/$name: $sections sections, $has_alternative alt/rejection mentions"
done
```

```output
data-lake-system/001-kafka-first-ingestion.md: 6 sections, 5 alt/rejection mentions
fnol-system/001-channel-normalization.md: 6 sections, 5 alt/rejection mentions
fnol-system/002-triage-rules-engine.md: 6 sections, 5 alt/rejection mentions
rating-engine-system/001-centralized-rating.md: 6 sections, 5 alt/rejection mentions
```

All 4 ADRs have 6 sections and multiple alternative/rejection mentions.

## AC: Org standards are discoverable

The parasol-platform-engineering group has a techdocs-ref pointing to org-level standards.

```bash
echo '=== Org standards topics ===' && grep '^  - ' /workspace/rhdh-agentic/catalog/techdocs/org/mkdocs.yml
```

```output
=== Org standards topics ===
  - techdocs-core
  - Home: index.md
  - API Design Conventions: api-conventions.md
  - Observability Requirements: observability.md
  - Security & Auth Patterns: security.md
```
