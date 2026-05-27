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

### Pipeline walkthrough: Issue Templates scenario

We chose "Add GitHub issue templates" as the end-to-end test scenario because it is bounded (only touches `.github/ISSUE_TEMPLATE/`), produces real value, and exercises every pipeline agent.

**The issue to file:**

> **Title:** Add GitHub issue templates for bug reports and feature requests
>
> We have no issue templates. Contributors file unstructured issues that are hard to triage.
>
> Add two templates using YAML frontmatter format (`.github/ISSUE_TEMPLATE/*.yml`):
>
> - **Bug report** — steps to reproduce, expected vs. actual behavior, environment info
> - **Feature request** — problem statement, proposed solution, alternatives considered
>
> Also add a `config.yml` with blank-issue opt-out.

**Expected pipeline flow:**

| Step | Agent | What we expect | What to watch for |
|------|-------|----------------|-------------------|
| 1 | **Triage** | Labels issue `ready-to-code` (clear scope, no blockers) | Does it correctly identify this as a bounded, actionable task? |
| 2 | **Coder** | Creates PR with `.github/ISSUE_TEMPLATE/bug_report.yml`, `feature_request.yml`, `config.yml` | Quality of generated YAML, field choices, whether it follows GitHub's template schema |
| 3 | **Review** | Reviews the generated PR, posts findings | Does it validate YAML syntax? Does it catch missing fields or bad defaults? |
| 4 | **Fix** | We manually request a small change on the PR to trigger Fix | Does it correctly interpret the feedback and apply targeted changes? |
| 5 | **Retro** | After merge, analyzes the full lifecycle | What process improvements does it identify? Is the retro useful or generic? |

**Observation log:**

**Step 1 — Triage (Issue [#60](https://github.com/rhdh-parasol/rhdh-agentic/issues/60))**

- Issue filed 2026-05-27.
- **Auto-trigger did not fire.** The shim workflow ran (run `26507172941`, `issues/opened`, `success`) but the upstream dispatcher (`reusable-dispatch.yml`) does not route `issues/opened` to the triage stage. The `issues)` case block only handles `labeled` actions (for `ready-to-code` and `ready-for-review` labels). `opened` and `edited` fall through to "No stage matched — skipping dispatch."
- **Root cause:** The dispatcher's routing table does not implement auto-triage on issue creation. Triage is only reachable via the `/fs-triage` slash command (routed through the `issue_comment` handler). The pipeline docs describe auto-triage as the intended behavior, but the dispatch code does not implement it yet.
- **Workaround:** Posted `/fs-triage` as a comment on issue #60 to trigger triage manually.
- **Manual trigger worked** — dispatcher routed `/fs-triage` to the triage stage correctly (run `26508587149`). Sandbox infrastructure came up (Podman, OpenShell Gateway, security scans all passed).
- **Agent crashed immediately** — exit code 1 after 0-1 seconds, both iterations. No `agent-result.json` produced. Post-script (label application) was skipped.
- **Root cause: missing Vertex AI IAM binding.** The transcript shows: `Permission 'aiplatform.endpoints.predict' denied on resource '//aiplatform.googleapis.com/projects/rhdh-sidekick-167988/locations/global/publishers/anthropic/models/claude-opus-4-6'`. The WIF pool and provider are correctly configured, but the WIF principal is missing the `roles/aiplatform.user` binding on the GCP project. Per the Fullsend installation guide, this binding is required:

  ```bash
  WIF_PRINCIPAL="principalSet://iam.googleapis.com/projects/189673402608/locations/global/workloadIdentityPools/fullsend-pool/attribute.repository_owner/redhat-developer"
  gcloud projects add-iam-policy-binding rhdh-sidekick-167988 \
    --role="roles/aiplatform.user" \
    --member="$WIF_PRINCIPAL" \
    --condition=None
  ```

- **This same root cause explains all agent failures** — triage, review, and coder all fail with the same 403 because none of them can call Vertex AI.
- [x] **IAM fix applied** — granted `roles/aiplatform.user` to the WIF `principalSet` for `redhat-developer`. Re-triggered `/fs-triage`.
- [x] **Triage succeeded** (run `26511100971`). Labels applied: `good first issue`, `feature`, `triaged`. Agent posted a structured triage comment with category (Feature), severity (Low), recommended implementation, and a proposed test case. Quality is good — it correctly identified the scope, suggested YAML frontmatter format, and even flagged it as suitable for first-time contributors. Did **not** apply `ready-to-code` — used `triaged` instead, so the Coder agent won't auto-trigger.

**Step 2 — Coder (Issue [#60](https://github.com/rhdh-parasol/rhdh-agentic/issues/60))**

- Triggered manually via `/fs-code` comment. Dispatcher routed correctly to `code` stage.
- **Sandbox creation timed out** (run `26514769886`): `sandbox "agent-code-3288-1779889260" not ready after 1m0s`. The gateway logged `Creating sandbox container` → then nothing for 60 seconds → timeout.
- **Root cause: heavy image + old timeout.** The Coder uses `ghcr.io/fullsend-ai/fullsend-code:latest` (includes Go toolchain, gopls, lychee) which is much larger than the Triage image (`fullsend-sandbox:latest`). Pulling it exceeds the 60-second sandbox ready timeout.
- **Fix exists but not released.** Fullsend commit `1bf016d9` adds pre-pull, retry with exponential backoff, and increases the default timeout to 120 seconds. However, the fix is in the **Go binary** (`fullsend run`), not in the reusable workflow YAML. The binary is downloaded separately from the latest GitHub Release tag — pinning the shim to a newer workflow SHA does not help (confirmed: pinning to `@1bf016d9` still downloaded the old binary, same 60s timeout).
- **No workaround from our side.** The sandbox timeout is hardcoded in the released `fullsend` binary. We need the Fullsend team to cut a new release that includes commit `1bf016d9`.
- [ ] Request new Fullsend release from the team (or ask for a pre-release binary).

**Step 3 — Review:** blocked by Coder.

**Step 4 — Fix:** blocked by Review.

**Step 5 — Retro:** blocked by merge.

### How to debug a Fullsend agent run

When an agent fails (or you want to understand what it did), there are three layers of logs to examine.

**Layer 1 — Workflow run logs (GitHub Actions UI or CLI)**

Find the run, then scan for the routing decision and agent outcome:

```bash
# List recent fullsend runs
gh run list --repo rhdh-parasol/rhdh-agentic --workflow=fullsend --limit 5

# View the full log for a specific run
gh run view <RUN_ID> --repo rhdh-parasol/rhdh-agentic --log

# Filter for key events (routing, agent exit, errors)
gh run view <RUN_ID> --repo rhdh-parasol/rhdh-agentic --log 2>/dev/null \
  | grep -iE "Routed to stage|Agent completed|exit code|error|validation|No stage matched"
```

Key lines to look for:

- `Routed to stage: triage` — dispatcher matched an agent
- `No stage matched — skipping dispatch` — event didn't trigger any agent
- `Agent completed (Xs)` — how long the agent ran
- `! Agent exited with code 1` — agent crashed
- `✗ Validation failed` — agent ran but didn't produce valid output
- `✓ Sandbox created` / `✓ Sandbox bootstrapped` — infrastructure is working

**Layer 2 — Agent transcripts (download artifact)**

Every run uploads an artifact (`fullsend-<agent>`) containing the Claude conversation transcript. This is where you find the actual LLM interaction — prompts, tool calls, and error messages.

```bash
# Download the artifact
gh run download <RUN_ID> --repo rhdh-parasol/rhdh-agentic \
  --name fullsend-triage --dir /tmp/fullsend-debug

# Find the transcript files
find /tmp/fullsend-debug -name '*.jsonl'

# Pretty-print a transcript (each line is a JSON object)
cat /tmp/fullsend-debug/agent-*/iteration-1/transcripts/*.jsonl \
  | python3 -c "import sys,json; [print(json.dumps(json.loads(l), indent=2)) for l in sys.stdin if l.strip()]"

# Quick search for errors in transcripts
cat /tmp/fullsend-debug/agent-*/iteration-*/transcripts/*.jsonl \
  | grep -o '"text":"[^"]*"' | head -5
```

The transcript JSONL contains message objects with `type: "user"` or `type: "assistant"`. The assistant messages include the full API response, including error messages. For example, a Vertex AI 403 shows up as:

```json
{"type": "assistant", "error": "authentication_failed", "message": {"content": [{"text": "Permission denied..."}]}}
```

**Layer 3 — Sandbox logs (in the same artifact)**

The artifact also contains OpenShell sandbox and gateway logs, useful for infrastructure issues:

```bash
# Sandbox security events (network, filesystem sandboxing)
cat /tmp/fullsend-debug/agent-*/logs/openshell-sandbox.log | tail -20

# Gateway logs (container orchestration)
cat /tmp/fullsend-debug/agent-*/logs/openshell-gateway.log | tail -20
# or
cat /tmp/fullsend-debug/openshell-gateway.log | tail -20
```

**Quick triage flowchart:**

```
Run failed
  → Check workflow log for "Routed to stage"
     → "No stage matched" → event/action not handled by dispatcher
     → Stage matched → check "Agent completed (Xs)"
        → 0-1s exit code 1 → likely auth/config error → check transcript
        → >1s exit code 1 → agent ran but failed → check transcript for tool errors
        → exit code 0, validation failed → agent ran but output schema wrong
```

### Next: first custom agent

5. **Pick a candidate** — Workflow Doctor and CLAUDE.md Keeper are the simplest. Spec Reviewer has the most overlap with existing OpenSpec workflows (see observation above).
6. **Evaluate Spec Reviewer overlap** — Compare the generic review output on spec PRs against what a spec-aware agent could catch (completeness against OpenSpec template, cross-references to existing specs).
7. **Build the three artifacts** — Agent definition (`.md`), harness config (`.yaml`), and skill. Use `gh-classify` from nonflux/integration-service as the template.

### Housekeeping

- [x] ~~**BLOCKER: Grant `roles/aiplatform.user` to the WIF principal**~~ — fixed 2026-05-27. Triage agent now working.
- [ ] Verify branch protection on `main` has "Require review from Code Owners" enabled — without this, CODEOWNERS is documentary only (flagged by review agent on PR #57).
- [ ] Consider adding `.github/instructions/` to CODEOWNERS (also flagged by review agent).
