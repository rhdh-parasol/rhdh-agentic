## 1. Catalog Integration Setup

- [x] 1.1 Pin benwilcock/backstage-catalogs to a specific commit SHA and configure catalog location URLs (enterprise + Parasol) in app-config
- [x] 1.2 Validate Parasol entity counts match expected inventory (13 Groups, 14 Domains, 53 Systems, 175 Components, 16 APIs) by loading into rhdh-local
- [x] 1.3 Verify entity metadata completeness: every Component has description, at least 1 tag, owner ref, system ref, and at least 1 relationship
- [x] 1.4 Verify cross-layer entity graph: traverse from any Parasol service component to its owning team, domain, and dependencies

## 2. TechDocs Annotation Strategy

- [x] 2.1 Determine annotation approach: upstream PR to benwilcock or local annotation overlay mechanism
- [x] 2.2 Implement the chosen annotation strategy — add `backstage.io/techdocs-ref` annotations to priority Parasol entities (domains, key systems, org-level)
- [x] 2.3 Create mkdocs.yml skeleton and docs/ directory structure following the RHDH software-templates TechDocs pattern

## 3. Domain Handbooks (TechDocs)

- [x] 3.1 Analyze Parasol's tag distributions and Tech Radar data to derive the approved stack matrix per domain
- [x] 3.2 Write Claims domain handbook: Approved Stack Matrix, Governance Rules, When to Deviate sections — grounded in Claims components' tags and the 3 Claims API specs (FNOL, Claims Status, Fraud Score)
- [x] 3.3 Write Underwriting domain handbook: Approved Stack Matrix, Governance Rules, When to Deviate — grounded in Underwriting components and Premium Rating / Quote-Bind API specs
- [x] 3.4 Write Policy domain handbook: Approved Stack Matrix, Governance Rules, When to Deviate — grounded in Policy components and Policy Query / Endorsement API specs
- [x] 3.5 Write additional priority domain handbooks (Billing, Digital Channels, Data Platform) following the same pattern

## 4. System ADRs (TechDocs)

- [x] 4.1 Identify key Parasol systems with architectural decisions worth documenting (at least 3 systems across different domains)
- [x] 4.2 Write ADRs for each identified system: Status, Date, Context, Decision, at least one Alternative Considered with rejection reason, and Consequences (positive + negative)
- [x] 4.3 Verify ADR completeness: each ADR answers "why X over Y" with specific alternatives and trade-offs

## 5. Org-Wide Standards (TechDocs)

- [x] 5.1 Write Parasol org-level TechDocs: API design conventions (grounded in the 16 existing OpenAPI specs' patterns), observability requirements, and security/auth patterns
- [x] 5.2 Verify org standards are discoverable: agent can navigate from Parasol org entity to standards TechDocs

## 6. TechDocs Validation

- [x] 6.1 Verify `mkdocs build` succeeds for every TechDocs site
- [x] 6.2 Load into rhdh-local and verify TechDocs tab renders content for annotated entities
- [x] 6.3 Agent smoke test: prompt an LLM with spec scenarios ("What framework should I use for a new service in Claims?") and verify grounded answers from TechDocs content

## 7. Software Templates

- [x] 7.1 Adapt Quarkus backend template from RHDH software-templates repo for Parasol's Java-heavy domains (Claims, Underwriting, Policy)
- [x] 7.2 Adapt Spring Boot or Python backend template for Parasol's data-oriented domains (Data Platform)
- [x] 7.3 Adapt Node.js backend template for Parasol's digital channels domain
- [x] 7.4 Ensure each template collects required parameters: service name (kebab-case), description, owner (Group picker), system (entity picker), plus stack-specific parameters
- [x] 7.5 Verify each template skeleton produces valid `catalog-info.yaml` with correct Parasol entity references

## 8. Software Template Validation

- [x] 8.1 Load templates into rhdh-local and verify they appear in the Create section
- ~~8.2 Run each template with test parameters and verify scaffolded output compiles/runs~~ (out of scope — requires GitHub App integration)
- [x] 8.3 Verify scaffolded `catalog-info.yaml` has valid owner, system, and dependsOn references to Parasol entities

## 9. End-to-End Validation

- [x] 9.1 Load the complete catalog (enterprise + Parasol + TechDocs + Templates) into rhdh-local and verify zero processing errors
- [x] 9.2 Verify entity relations graph shows correct cross-layer dependency edges
- [x] 9.3 Run `just catalog-validate` to validate all entity YAML

## 10. Spec Sync and Demos

- [x] 10.1 Sync delta specs to `openspec/specs/catalog-entities/spec.md`, `openspec/specs/techdocs/spec.md`, and `openspec/specs/software-templates/spec.md`
- [x] 10.2 Create `openspec/specs/catalog-entities/demo.md` with a concrete scenario walkthrough
- [x] 10.3 Create `openspec/specs/techdocs/demo.md` with a concrete scenario walkthrough
- [x] 10.4 Create `openspec/specs/software-templates/demo.md` with a concrete scenario walkthrough

## 11. Deployment Documentation

- [x] 11.1 Add "Local deployment via rhdh-local" requirement to catalog-entities spec (delta + main)
- [x] 11.2 Create `catalog/README.md` with deployment prerequisites, steps, verification, and known limitations
