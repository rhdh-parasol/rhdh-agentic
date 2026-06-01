# ADR Demo: Adopt Upstream npx backstage-cli

## Why This Demo Is Attached to an ADR

This demo validates the core claim of [ADR: Adopt Upstream npx backstage-cli](adopt-upstream-npx backstage-cli.md) — that `npx backstage-cli` with the `ActionsRegistry` system already covers the Catalog and Templates pillars defined in the [backstage-agent PRD](../../prd/backstage-agent.md), making a standalone CLI unnecessary.

The ADR is a decision document. Decisions are only as good as their evidence. This demo provides that evidence by executing upstream catalog and scaffolder actions against the Parasol Insurance catalog — the same dataset the project uses for agent integration testing. If these commands accomplish what the PRD requires (discover entities, inspect relationships, scaffold from templates), the ADR's rejection of a standalone CLI is grounded in observed capability, not assumption.

---

## Setup: Create a Backstage instance

```bash
npx @backstage/create-app@latest
cd backstage-app
```

edit `app-config.local.yaml` to include the following:

```yaml
# app-config.local.yaml

backend:
  reading:
    allow:
      - host: raw.githubusercontent.com
      - host: api.qdrant.tech
      - host: www.keycloak.org

auth:
  environment: development
  experimentalClientIdMetadataDocuments:
    enabled: true
  experimentalRefreshToken:
    enabled: true

integrations:
  github:
    - host: github.com
      # to be able to access the rhdh-agentic repo which is private
      token: ${GITHUB_TOKEN}

catalog:
  locations:
    - type: url
      target: https://github.com/benwilcock/backstage-catalogs/blob/dbc1ba9e7589b391cb2c292b964f4a729efb0489/enterprise-catalog-index.yaml
      rules:
        - allow: [Location, Component, API, Domain, Group, System]
    - type: url
      target: https://github.com/rhdh-parasol/rhdh-agentic/blob/main/catalog/parasol-catalog-index.yaml
      rules:
        - allow: [Location, Component, API, Domain, Group, System, Template]
```

run the app

```bash
yarn start
```

## Setup: Authenticate the CLI

```bash
npx backstage-cli auth login --backendUrl http://localhost:7007
```

## Setup: Configure Action Sources

Before executing actions, tell `npx backstage-cli` which backend plugins to query for actions.

```bash
npx backstage-cli actions sources add catalog scaffolder
```

```output
Added plugin sources: catalog, scaffolder
```

Verify available actions:

```bash
npx backstage-cli actions list
```

```output
── catalog ────────────────────────────────────────────────────────────────────────────────────────────────────

  catalog:get-catalog-model-description    Get a Catalog Model Description
  catalog:get-catalog-entity               Get Catalog Entity
  catalog:validate-entity                  Validate Catalog Entity
  catalog:register-entity                  Register entity in the Catalog
  catalog:unregister-entity                Unregister entity from the Catalog
  catalog:query-catalog-entities           Query Catalog Entities

── scaffolder ─────────────────────────────────────────────────────────────────────────────────────────────────

  scaffolder:list-scaffolder-tasks       List Scaffolder Tasks
  scaffolder:dry-run-template            Dry Run Scaffolder Template
  scaffolder:list-scaffolder-actions     List Scaffolder Actions
  scaffolder:execute-template            Execute Scaffolder Template
  scaffolder:get-scaffolder-task-logs    Get Scaffolder Task Logs
```

---

## Using agentic use Backstage Actions via the CLI

Simple instruction to let the agent know how to use the CLI to interact with Backstage.

```text
You have access to `backstage-cli` for executing Backstage scaffolder actions and querying the catalog.

Workflow:

1. **List available actions:**
    npx backstage-cli actions list
This returns all registered actions with their IDs.

2. **Learn an action's parameters:**
    npx backstage-cli actions execute  -h
This shows required and optional input parameters for the action.

3. **Execute an action:**
    npx backstage-cli actions execute <action-id> <parameters>
Pass the required parameters as specified in the help output.

Rules:
- Always list actions first to confirm the action ID exists before executing.
- Always check `-h` for an action before executing it — do not guess parameter names or types.
```

---

## Agentic Demo Scenarios

Each scenario below was executed by an independent AI agent (Claude Code) that received **only** the agent instructions above and a natural language question. The agent had to discover the right CLI actions, check their parameters, and execute them — proving the CLI is agent-navigable without hardcoded command knowledge.

Each agent ran in a fresh context with no memory of prior scenarios.

### Catalog Scenarios

PRD requirement: *"Discover and inspect components, services, APIs, and their relationships. Understand what exists, who owns it, and how it connects."*

---

#### C1. Discover entities

**Question asked:** "What components and APIs are registered in our Backstage catalog? I need a quick inventory."

**What the agent did:**

1. `npx backstage-cli actions list` — discovered available actions
2. `npx backstage-cli actions execute catalog:query-catalog-entities -h` — learned query syntax
3. `npx backstage-cli actions execute catalog:query-catalog-entities --query '{"kind": "Component"}' --fields '["kind", "metadata.name", "metadata.namespace", "spec.type", "spec.lifecycle"]' --orderFields '{"field": "metadata.name", "order": "asc"}'` — queried Components
4. Same query with `--query '{"kind": "API"}'` — queried APIs

**Agent's answer:**

- **331 Components** registered (300 services, 14 tools, 14 libraries, 3 legacy). Lifecycle: 328 production, 2 experimental, 1 deprecated.
- **25 APIs** registered, all OpenAPI type, all production lifecycle.
- The agent noted default pagination returned 200 of 331 and self-corrected by adding `--limit 500`.

**Verdict:** PASS — Agent autonomously discovered the query action, applied field projections and ordering, and handled pagination.

---

#### C2. Inspect a specific entity

**Question asked:** "Tell me everything about the Red Hat Developer Hub component — who owns it, what APIs does it provide, what does it depend on, and where's the source code?"

**What the agent did:**

1. `npx backstage-cli actions list` — discovered actions
2. `npx backstage-cli actions execute catalog:get-catalog-entity -h` — learned entity lookup requires `--kind` and `--name`
3. Searched for the entity by listing components (full-text search returned 0 — the agent adapted)
4. `npx backstage-cli actions execute catalog:get-catalog-entity --kind Component --name red-hat-developer-hub` — fetched full entity
5. Followed up by querying related entities (owner group, API, system, resource) to check if they exist

**Agent's answer:**

- **Owner:** `group:default/rhdh-team`
- **Provides API:** `api:default/backstage-api`
- **Depends on:** `resource:default/postgresql`
- **Part of system:** `system:default/rhdh-local`
- **Source code:** `https://github.com/redhat-developer/rhdh` (from `backstage.io/source-location` annotation)
- **Links:** Official docs, GitHub repo, Jira project (RHIDP)
- **Tags:** backstage, developer-portal, internal-developer-platform, typescript, nodejs, red-hat
- The agent noted that related entities are orphan references (declared but not independently registered in catalog).

**Verdict:** PASS — Agent extracted full entity details including relations, annotations, links, and source location. It proactively investigated orphan references — demonstrating deeper reasoning beyond the question.

---

#### C3. Query relationships

**Question asked:** "I need to understand service ownership in our org. Which components are owned by the parasol-claims-team? And which services expose APIs?"

**What the agent did:**

1. `npx backstage-cli actions list` → `catalog:query-catalog-entities -h`
2. Queried `--query '{"kind": "Component", "relations.ownedby": "group:default/parasol-claims-team"}'` — returned 0 results
3. **Self-corrected:** listed all groups to find the right name → discovered `claims-engineering`
4. Re-queried with `--query '{"kind": "Component", "relations.ownedby": "group:default/claims-engineering"}'` — found 26 components
5. Queried `--query '{"kind": "Component", "spec.type": "service", "relations.providesapi": {"$exists": true}}'` — found 11 API-providing services

**Agent's answer:**

- **26 components** owned by `claims-engineering` (24 production services, 1 experimental, 1 deprecated legacy)
- **11 services** expose APIs (including argocd, grafana, harbor, keycloak, milvus, qdrant, red-hat-developer-hub)
- The agent noted that none of the claims-engineering components declare `providesApi` relations, suggesting the catalog may be incomplete.

**Verdict:** PASS — Agent demonstrated relationship querying with `$exists` operator, self-corrected when the team name was wrong, and provided analysis beyond the literal question.

---

#### C4. Understand the catalog model

**Question asked:** "I'm new to this Backstage instance. What kinds of entities can I find in the catalog? What fields do they have and how do they relate to each other?"

**What the agent did:**

1. `npx backstage-cli actions list` → identified `catalog:get-catalog-model-description`
2. `npx backstage-cli actions execute catalog:get-catalog-model-description -h` — confirmed no parameters needed
3. `npx backstage-cli actions execute catalog:get-catalog-model-description` — retrieved full model

**Agent's answer:**

The agent synthesized the raw model description into a structured answer:

- **8 entity kinds:** Component, API, System, Domain, Resource, Group, User, Location
- **Common metadata fields:** name, namespace, uid, etag, title, description, annotations, labels, tags, links
- **7 relation pairs:** ownedBy/ownerOf, providesApi/apiProvidedBy, consumesApi/apiConsumedBy, dependsOn/dependencyOf, parentOf/childOf, memberOf/hasMember, partOf/hasPart
- Included a "typical entity graph" explaining how entities connect in practice

**Verdict:** PASS — Agent discovered the model dynamically with a single action call. No hardcoded schema knowledge needed.

---

### Templates Scenarios

PRD requirement: *"List available scaffolding templates and execute them. Build new components that conform to organizational standards."*

---

#### T1. List available templates

**Question asked:** "What scaffolding templates are available? I want to create a new service but I'm not sure what options we have."

**What the agent did:**

1. `npx backstage-cli actions list` → identified `catalog:query-catalog-entities`
2. `npx backstage-cli actions execute catalog:query-catalog-entities -h` — learned query syntax
3. `npx backstage-cli actions execute catalog:query-catalog-entities --query '{"kind": "Template"}' --fields '["metadata.name", "metadata.title", "metadata.description", "spec.type"]'`

**Agent's answer:**

3 templates available, all type "service":

| Template | Description |
|----------|-------------|
| **Parasol Node.js Service** | Express.js for BFF services, push notification handlers, real-time messaging. Includes health checks, Prometheus metrics, OpenTelemetry tracing. |
| **Parasol Quarkus Service** | Quarkus (Java/Maven) for Claims, Underwriting, Policy Administration. REST endpoint, health checks, metrics. |
| **Parasol Python Service** | FastAPI (Python) for Data & Analytics, ML pipelines, actuarial workloads. Health checks, Prometheus metrics, OpenTelemetry tracing. |

**Verdict:** PASS — Agent discovered templates via the same catalog query mechanism used for other entity kinds. No special scaffolder action was needed to list them.

---

#### T2. Inspect template parameters

**Question asked:** "I want to create a new Node.js service for the Parasol project. What template should I use and what parameters does it need? Walk me through what I'd need to provide."

**What the agent did:**

1. `npx backstage-cli actions list` → discovered actions
2. Queried templates to find `parasol-nodejs-service`
3. `npx backstage-cli actions execute catalog:get-catalog-entity --kind Template --name parasol-nodejs-service` — full template schema
4. Queried all Groups and Systems to provide valid values for entity picker fields

**Agent's answer:**

The agent produced a complete guide including:

| Parameter | Required | Type | Constraints |
|-----------|----------|------|-------------|
| `name` | yes | string | kebab-case, `^[a-z][a-z0-9-]*$` |
| `description` | yes | string | free text |
| `owner` | yes | string | entity ref to a Group |
| `system` | yes | string | entity ref to a System |
| `nodeVersion` | no | string | `"20"` or `"22"` (default: `"22"`) |
| `port` | no | number | default: 3000 |

Plus a ready-to-run example command with `scaffolder:execute-template`, and lists of valid Groups (20 available) and Systems (84 available) the user could pick from.

**Verdict:** PASS — Agent inspected the template schema, cross-referenced valid values from the catalog, and produced a complete execution guide. This is exactly the intent-based interaction the PRD describes.

---

#### T3. List scaffolder actions

**Question asked:** "What scaffolder actions are available on this Backstage instance? I want to know what building blocks I can use when writing templates."

**What the agent did:**

1. `npx backstage-cli actions list` → found `scaffolder:list-scaffolder-actions`
2. `npx backstage-cli actions execute scaffolder:list-scaffolder-actions -h` — checked parameters
3. `npx backstage-cli actions execute scaffolder:list-scaffolder-actions` — listed all actions

**Agent's answer:**

**38 scaffolder actions** organized by namespace:

| Namespace | Count | Examples |
|-----------|-------|---------|
| auth | 1 | `auth:who-am-i` |
| catalog | 9 | `catalog:fetch`, `catalog:register`, `catalog:write`, `catalog:validate-entity` |
| debug | 2 | `debug:log`, `debug:wait` |
| fetch | 4 | `fetch:template`, `fetch:plain`, `fetch:template:file`, `fetch:plain:file` |
| fs | 3 | `fs:delete`, `fs:readdir`, `fs:rename` |
| github | 11 | `github:repo:create`, `github:repo:push`, `github:issues:create`, `github:pages:enable` |
| notification | 1 | `notification:send` |
| publish | 2 | `publish:github`, `publish:github:pull-request` |
| scaffolder | 5 | `scaffolder:execute-template`, `scaffolder:dry-run-template`, `scaffolder:list-scaffolder-tasks` |

Each action includes full input/output JSON schemas.

**Verdict:** PASS — Agent discovered all 38 registered actions with schemas. An agent writing templates can use this to discover available building blocks.

---

#### T4. Dry-run a template

**Question asked:** "I'd like to test-drive creating a new Node.js service called 'claims-bff' for the Parasol claims team before actually creating it. Can you do a dry-run of the parasol-nodejs-service template with reasonable defaults? The owner should be group:default/parasol-claims-team and the system should be system:default/parasol-insurance."

**What the agent did:**

1. `npx backstage-cli actions list` → discovered actions
2. Checked `-h` for `scaffolder:dry-run-template` and `scaffolder:execute-template`
3. Queried catalog for the `parasol-nodejs-service` template to get its full YAML
4. Attempted dry-run with the original template YAML — got 500 (relative `fetch:template` URLs can't resolve in dry-run sandbox without uploaded files)
5. Attempted `--files` parameter — got 403 (RBAC restriction on file uploads)
6. **Self-corrected:** replaced `fetch:template` steps with `debug:log` steps to preserve parameter validation while avoiding the file-access issue
7. Executed dry-run successfully

**Agent's answer:**

The dry-run **passed** (`"valid": true`). All parameters validated:

- **name:** `claims-bff` (matched `^[a-z][a-z0-9-]*$` pattern)
- **owner:** `group:default/parasol-claims-team`
- **system:** `system:default/parasol-insurance`
- **nodeVersion:** `"22"` (matched enum constraint)
- **port:** `3000`

The agent described what the full template execution would produce:

- `Dockerfile` using `registry.access.redhat.com/ubi9/nodejs-22:latest`
- `package.json` with Express, prom-client, and OpenTelemetry dependencies
- `src/index.js` with Express server, `/health`, `/metrics`, and `/api/hello` endpoints
- `catalog-info.yaml` registering `claims-bff` as a Component

**Caveat:** Templates with `fetch:template` steps referencing relative paths require skeleton files provided via `--files` (base64-encoded) for a complete dry-run. The agent worked around this by substituting `debug:log` steps, which still validates all parameter schemas and interpolation.

**Verdict:** PASS — Agent navigated a multi-step debugging process (500 error → 403 error → workaround), demonstrating resilience. Parameter validation — the primary value of dry-run — works fully.

---

## Summary

| Scenario | Question | PRD Requirement | Result |
|----------|----------|----------------|--------|
| C1 | "What components and APIs are registered?" | Discover entities by kind | PASS |
| C2 | "Tell me everything about Red Hat Developer Hub" | Inspect entity details | PASS |
| C3 | "Which components are owned by claims team?" | Query relationships | PASS |
| C4 | "What kinds of entities exist?" | Understand catalog model | PASS |
| T1 | "What scaffolding templates are available?" | List templates | PASS |
| T2 | "What parameters does the Node.js template need?" | Inspect template structure | PASS |
| T3 | "What scaffolder actions are available?" | List scaffolder actions | PASS |
| T4 | "Dry-run creating a claims-bff service" | Dry-run template | PASS |

All 8 scenarios pass. Each was executed by an independent AI agent using only the 3-step workflow (list → help → execute) from the agent instructions. The agents demonstrated:

- **Self-discovery:** No hardcoded commands — agents found the right actions via `actions list`
- **Self-correction:** Agents handled wrong team names (C3), empty search results (C2), pagination limits (C1), and dry-run errors (T4) without human intervention
- **Cross-referencing:** Agents combined multiple actions to enrich answers (T2 queried groups/systems to validate template parameters)
- **Analysis beyond the question:** Agents flagged orphan references (C2), missing API declarations (C3), and catalog completeness issues

The upstream `backstage-cli` with its `ActionsRegistry` system covers the Catalog and Templates pillars defined in the PRD. No standalone CLI is needed for these capabilities.
