# Fullsend Agents for RHDH

This document maps out the built-in fullsend agents and ideas for custom agents tailored to the RHDH team's workflows.

## Built-in agents

Fullsend ships 6 agent roles. Each has its own GitHub App, sandbox image, and harness config.

### Pipeline agents (automatic trigger)

| Agent | Trigger | What it does | Slash command |
|-------|---------|-------------|---------------|
| **Triage** | Issue opened/edited | Reads issue + comments, labels it (`ready-to-code`, `blocked`, `duplicate`, `not-ready`, `not-reproducible`), finds related issues/PRs | `/fs-triage` |
| **Coder** | Issue labeled `ready-to-code` | Clones repo into sandbox, writes code, runs tests, creates a PR | `/fs-code` |
| **Review** | PR opened/updated | Reviews code changes, posts inline diff comments, assigns severity, gives approve/request-changes verdict | `/fs-review` |
| **Fix** | Review requests changes | Re-reads review feedback, modifies the PR branch to address comments (reuses coder app) | `/fs-fix` |
| **Retro** | PR merged | Analyzes the full issue-to-merge lifecycle, files improvement issues for process/tooling gaps | `/fs-retro` |

### Standalone agents

| Agent | Trigger | What it does | Slash command |
|-------|---------|-------------|---------------|
| **Prioritize** | Manual | RICE scoring on backlog issues | `/fs-prioritize` |

### Pipeline flow

```
Issue filed
  --> Triage (auto)
        |
        +--> ready-to-code
        |      --> Coder (auto) --> PR opened
        |                            --> Review (auto)
        |                                  |
        |                                  +--> approved --> ready-for-merge --> human merges
        |                                  +--> changes requested --> Fix (auto) --> re-review
        |                                  +--> requires-manual-review --> human decides
        |
        +--> blocked / duplicate / not-ready / not-reproducible
```

## Customization system

Fullsend uses a **layered content resolution** model (ADR 0035). Customizations go in `.fullsend/customized/` and override upstream defaults by filename:

```
.fullsend/customized/
  agents/       --> Override agent prompt definitions (.md files)
  skills/       --> Add or override skills (.md files or directories)
  harness/      --> Override harness execution configs (.yaml)
  policies/     --> Override security policies (.yaml)
  schemas/      --> Override output JSON schemas
  scripts/      --> Override pre/post scripts (.sh)
  env/          --> Override environment files (.env)
```

**File-level replacement, not merge.** Placing `harness/code.yaml` in customized/ replaces the entire upstream harness. Copy the full upstream file first, then modify.

### Anatomy of a custom agent

A custom agent needs three things:

**1. Agent definition** (`.fullsend/customized/agents/my-agent.md`):

```markdown
---
name: my-agent
description: What this agent does.
skills:
  - my-skill
tools: Bash(gh,jq)
model: opus
---

You are a [role] agent. Your job is to [task].

## Inputs
- `ENV_VAR` -- description

## Procedure
1. Step one
2. Step two

## Output format
Write JSON to `${FULLSEND_OUTPUT_DIR}/agent-result.json`

## Constraints
- NEVER modify files outside your scope
- ALWAYS write output before finishing
```

**2. Harness config** (`.fullsend/customized/harness/my-agent.yaml`):

```yaml
agent: agents/my-agent.md
model: opus
image: ghcr.io/fullsend-ai/fullsend-sandbox:latest
policy: policies/triage.yaml    # reuse existing policy or create custom
timeout_minutes: 15

skills:
  - skills/my-skill

host_files:
  - src: env/gcp-vertex.env
    dest: /tmp/workspace/.env.d/gcp-vertex.env
    expand: true

runner_env:
  GH_TOKEN: "${GH_TOKEN}"
  MY_INPUT: "${MY_INPUT}"
```

**3. Skill** (`.fullsend/customized/skills/my-skill.md` or `skills/my-skill/`):

```markdown
# My Skill

Domain knowledge and step-by-step procedures the agent follows.
```

### Real example: gh-classify (from nonflux/integration-service)

The nonflux team built a custom `gh-classify` agent that categorizes GitHub issues into project workstreams. It reads a `categories.md` file, screens issues, and outputs classification JSON. See: <https://github.com/nonflux/integration-service/tree/main/.fullsend/customized>

## Custom agent ideas for RHDH

These are exploration candidates — agents we could build to address RHDH-specific workflows.

### 1. Workflow Doctor

**Problem:** Broken GitHub Actions workflows are a recurring pain point. Debugging them requires reading logs, understanding the workflow YAML, and correlating with recent changes.

**Agent behavior:**

- Triggered on workflow failure (or `/fs-workflow-doctor` on an issue)
- Reads the failed workflow run logs via `gh run view`
- Correlates with recent commits that touched `.github/workflows/`
- Posts a diagnosis comment with root cause and suggested fix

**Customization needed:**

- `agents/workflow-doctor.md` — agent prompt
- `skills/gh-actions-debugging/` — knowledge about common GH Actions failure patterns
- `harness/workflow-doctor.yaml` — harness config

### 2. Spec Reviewer

**Problem:** RHDH uses OpenSpec documents for feature proposals. Reviewing specs for completeness, consistency with existing specs, and alignment with architecture is manual work.

**Agent behavior:**

- Triggered when a PR touches `specifications/`
- Reads the spec and cross-references with existing specs and architecture docs
- Posts a structured review: completeness checklist, consistency issues, open questions

**Customization needed:**

- `agents/spec-reviewer.md` — agent prompt with RHDH spec conventions
- `skills/rhdh-spec-conventions/` — what a good spec looks like
- Override `harness/review.yaml` to add spec-review skill for PRs touching `specifications/`

### 3. Dependency Auditor

**Problem:** RHDH has multiple packages with shared dependencies. Version drift and security vulnerabilities need tracking.

**Agent behavior:**

- Triggered on Dependabot PRs or `/fs-audit-deps`
- Reads `package.json` / lock files across packages
- Checks for version conflicts, known CVEs, and upgrade paths
- Posts summary comment with risk assessment

### 4. Release Notes Generator

**Problem:** Gathering release notes from merged PRs across packages is tedious.

**Agent behavior:**

- Triggered via `/fs-release-notes` on a milestone or tag
- Reads all merged PRs since last release
- Categorizes changes (features, fixes, breaking changes, deps)
- Generates a structured release notes draft

### 5. CLAUDE.md Keeper

**Problem:** `CLAUDE.md` files go stale as the codebase evolves. Agent context quality degrades over time.

**Agent behavior:**

- Triggered by retro agent or periodically
- Compares `CLAUDE.md` content against actual repo structure and conventions
- Files an issue with suggested updates when drift is detected

## Rollout status

### Completed

- **Mint 403 resolved** — Fullsend installed on this repo in per-repo mode (May 2026).
- **Review agent validated** — First live reviews on PRs [#57](https://github.com/rhdh-parasol/rhdh-agentic/pull/57) and [#54](https://github.com/rhdh-parasol/rhdh-agentic/pull/54). The agent produces structured dimension-based reviews (correctness, intent alignment, security, injection defense) and correctly applies `requires-manual-review` for protected paths.
- **CODEOWNERS guardrails** — `.fullsend/` and `.github/workflows/` require human approval via CODEOWNERS (PR #57).

### Observations from first reviews

- Review quality is substantive, not boilerplate. On PR #57 the agent flagged that CODEOWNERS is purely documentary without branch protection and suggested adding `.github/instructions/` as an explicit protected path.
- The `requires-manual-review` label is applied automatically when the review agent detects it cannot approve alone (protected paths).
- Generic reviews on spec PRs (PR #54) work but lack spec-domain awareness — a spec-specific review skill could add value here.

### Next: validate remaining pipeline agents

1. **Test Triage agent** — File a real issue and verify it gets labeled (`ready-to-code`, `blocked`, etc.). This validates the front of the pipeline.
2. **Test Coder agent** — Either via a `ready-to-code` label from triage or manually with `/fs-code`. Evaluate the generated PR quality.
3. **Test Fix agent** — Request changes on an agent-generated PR and observe the fix loop.
4. **Test Retro agent** — Merge an agent-generated PR and check the retrospective output.

### Next: first custom agent

5. **Pick a candidate** — Workflow Doctor and CLAUDE.md Keeper are the simplest. Spec Reviewer has the most overlap with existing OpenSpec workflows (see observation above).
6. **Evaluate Spec Reviewer overlap** — Compare the generic review output on spec PRs against what a spec-aware agent could catch (completeness against OpenSpec template, cross-references to existing specs).
7. **Build the three artifacts** — Agent definition (`.md`), harness config (`.yaml`), and skill. Use `gh-classify` from nonflux/integration-service as the template.

### Housekeeping

- [ ] Verify branch protection on `main` has "Require review from Code Owners" enabled — without this, CODEOWNERS is documentary only (flagged by review agent on PR #57).
- [ ] Consider adding `.github/instructions/` to CODEOWNERS (also flagged by review agent).
