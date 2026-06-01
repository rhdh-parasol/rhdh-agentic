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

### Auto-trigger reality (tested 2026-05-27)

The table above describes the *designed* pipeline. In practice, auto-triggers have gaps:

| Agent | Documented trigger | What actually happens | Workaround |
|-------|--------------------|----------------------|------------|
| **Triage** | `issues/opened` | Dispatcher only handles `issues/labeled`, not `opened`. No stage matched. | `/fs-triage` as issue comment |
| **Coder** | `issues/labeled` with `ready-to-code` | Would work, but Triage never labels `ready-to-code` — it uses `triaged` instead. | `/fs-code` as issue comment |
| **Review** | `pull_request_target/opened` | **Works.** Only agent with reliable auto-trigger. | — |
| **Fix** | `pull_request_review/changes_requested` | Only triggers when the **review bot** requests changes, not humans. Human reviews are ignored even with `fullsend-fix` label (label check is nested inside bot check). | `/fs-fix` as PR comment |
| **Retro** | `pull_request_target/closed` | Concurrency group collision: merge and approval events share the same group key (`fullsend-dispatch-{PR#}`). If both fire simultaneously, the `closed` event gets dropped. | `/fs-retro` as PR comment |

**Net effect:** Only Review auto-triggers reliably. The rest need slash commands. This means the "autonomous pipeline" from issue to merge is currently manual-trigger-driven, not event-driven.

### Pipeline flow (designed vs. actual)

```
Designed:                              Actual:
Issue filed                            Issue filed
  --> Triage (auto)                      --> (nothing happens)
        |                                      --> human posts /fs-triage
        +--> ready-to-code                     --> labels "triaged" (not ready-to-code)
               --> Coder (auto)                --> human posts /fs-code
                    --> PR opened                    --> PR opened
                         --> Review (auto)                --> Review (auto) ✅
                         --> changes requested            --> human posts /fs-fix
                              --> Fix (auto)              --> Fix runs, pushes
                              --> re-review               --> re-review ✅
                    --> human merges                  --> human merges
                         --> Retro (auto)                  --> (dropped by concurrency)
                                                           --> human posts /fs-retro
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

### Customization limitations in per-repo mode

Two significant limitations discovered during our adoption:

**1. No custom agent stages.** In per-repo mode, the upstream `reusable-dispatch.yml` has stages hardcoded (triage, code, review, fix, retro, prioritize). The org-mode dispatcher scans workflow files for `# fullsend-stage:` markers and can discover custom agents — the per-repo reusable workflow cannot. This means custom agents cannot register their own slash command (e.g., `/fs-spec-review`). Workaround: extend an existing agent with a custom skill instead of building a standalone agent.

**2. Harness overrides drift from upstream.** Because overrides are file-level replacement (not field-level merge), any upstream change to a harness file (new skill, timeout adjustment, new `host_files` entry) is silently lost when we override. There is no built-in mechanism to detect drift. Workaround: manually diff against upstream on each Fullsend release. A CI check that compares our override against the upstream scaffold would catch this automatically.

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
- **Root cause: heavy image + 60s timeout in v0.10.0.** The Coder uses `ghcr.io/fullsend-ai/fullsend-code:latest` (Go toolchain, gopls, lychee) — much larger than the Triage image (`fullsend-sandbox:latest`). The v0.10.0 binary has a hardcoded 60-second sandbox ready timeout (`readyTimeout = 60 * time.Second`). Pulling the code image on a cold runner exceeds this.
- **Fix is exactly 1 commit after v0.10.0.** Commit `1bf016d9` (directly after v0.10.0) adds pre-pull, retry with backoff, and increases the timeout to 120s. The fix is in the **Go binary**, not the workflow YAML — pinning the shim workflow to a newer SHA does not help (confirmed: the binary is downloaded separately from the latest Release tag).
- **Attempted workaround:** Pinned shim to `@1bf016d9` — no effect, binary still came from v0.10.0 release. Reverted.
- [x] **Fullsend v0.11.0 released** — sandbox creation now takes 4.8s (pre-pull + 120s timeout). Filed and closed [fullsend#1601](https://github.com/fullsend-ai/fullsend/issues/1601).
- **First run with v0.11.0 failed** with `policy_denied` — OpenShell blocked `sts.googleapis.com` due to "ambiguous shared socket ownership" between PIDs. Second run succeeded — this is a **transient race condition** in OpenShell's socket ownership tracker, not a persistent blocker.
- [x] **Coder succeeded on retry** — created PR [#61](https://github.com/rhdh-parasol/rhdh-agentic/pull/61) with `bug_report.yml`, `feature_request.yml`, and `config.yml` (107 lines added).

**Step 3 — Review (PR [#61](https://github.com/rhdh-parasol/rhdh-agentic/pull/61))**

- [x] Review agent triggered automatically on PR creation.
- [x] Review posted: flagged all files as protected path (`.github/`), requires human approval. No code-level findings.

**Step 4 — Fix (PR [#61](https://github.com/rhdh-parasol/rhdh-agentic/pull/61))**

- Posted a human "Request Changes" review with three concrete asks (RHDH-specific env fields, scope dropdown, Slack contact link).
- **Auto-trigger did not fire.** The dispatcher only triggers Fix when the `changes_requested` review comes from the Review Bot — human reviews never auto-trigger Fix, even with the `fullsend-fix` label. The label gate is nested *inside* the bot-check, not parallel to it.
- **Manual trigger via `/fs-fix` worked.** Agent ran for ~25 minutes, produced valid `fix-result.json`, passed validation and security scans.
- **Push blocked by protected-path check.** The post-script correctly refused to push because the agent modified `.github/ISSUE_TEMPLATE/bug_report.yml` — a protected path. This is expected: agents cannot modify files under `.github/` (same guardrail that CODEOWNERS enforces).
- **Conclusion:** The Fix agent works end-to-end, but our test scenario (issue templates under `.github/`) is incompatible with the protected-path enforcement. A real Fix test needs an issue whose files live outside protected paths.

**Step 5 — Retro (PR [#61](https://github.com/rhdh-parasol/rhdh-agentic/pull/61))**

- **Auto-trigger did not fire** on merge. The `closed` event and the `pull_request_review` event (from our approval) hit the same concurrency group simultaneously. The review-run got the lock; the retro-run was dropped.
- **Manual trigger via `/fs-retro` worked.** Agent ran for ~9 minutes, produced valid `retro-result.json`.
- **Post-script partially works.** The retro agent successfully filed improvement proposals as issues on `fullsend-ai/fullsend` ([#1617](https://github.com/fullsend-ai/fullsend/issues/1617), [#1618](https://github.com/fullsend-ai/fullsend/issues/1618), [#1731](https://github.com/fullsend-ai/fullsend/issues/1731)). But posting the summary comment on our PR fails with `Resource not accessible by integration` (403).
- **Root cause: Mint token scoping.** The Mint generates a token scoped to the `fullsend-ai` org's Retro App installation (which has access to `fullsend-ai/fullsend`), but the token does not cover `rhdh-parasol/rhdh-agentic`. The Retro App is installed on `redhat-developer` with `rhdh-agentic` in its repo list, but the Mint does not use that installation. This is a Fullsend platform issue — the Mint needs to generate tokens for the correct org's App installation.
- [x] **Retro content is excellent.** Proposals filed directly as GitHub issues on `fullsend-ai/fullsend`:
  1. [#1617](https://github.com/fullsend-ai/fullsend/issues/1617) — Warn when `/fs-fix` targets protected-path PRs
  2. [#1618](https://github.com/fullsend-ai/fullsend/issues/1618) — Triage should label well-scoped issues `ready-to-code` more readily
  3. [#1731](https://github.com/fullsend-ai/fullsend/issues/1731) — Fix agent should pre-check protected-path feasibility

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

### First custom agent: OpenSpec Spec Reviewer

**Approach chosen:** Skill extension of the existing review agent (not a standalone agent).

**Why not a standalone agent?** In per-repo mode, the upstream `reusable-dispatch.yml` has stages hardcoded (triage, code, review, fix, retro, prioritize). There is no stage-marker scanning like in org-mode. Custom agents cannot register their own stage or slash command. No existing Fullsend issue tracks this limitation for per-repo mode.

**What we did:** Override both the review harness and agent prompt in `.fullsend/customized/`:

- `harness/review.yaml` — adds `openspec-review` skill to the skill list
- `agents/review.md` — adds dimension 8 ("OpenSpec completeness") and skill routing for `openspec-review`
- `skills/openspec-review/SKILL.md` — domain knowledge about artifact sequencing and quality criteria

**Key learning:** Overriding only the harness (adding the skill) is not enough — the agent prompt must also list the skill in its routing section, otherwise the agent never invokes it. Both files must be overridden.

**Test result (PR #58):** The enhanced review now produces `[openspec-sequencing]` and `[openspec-quality]` info findings alongside the standard code review. On PR #58 it correctly identified the stacked-PR dependency (proposal+design on PR #40's branch) and assessed spec quality.

**What we lose:**

- No `/fs-spec-review` slash command — cannot trigger independently
- Harness and agent overrides drift from upstream — must manually sync on Fullsend releases
- Findings mix with code review in one comment

### Housekeeping

- [x] ~~**BLOCKER: Grant `roles/aiplatform.user` to the WIF principal**~~ — fixed 2026-05-27.
- [ ] **Retro post-script 403** — the Mint generates tokens scoped to the `fullsend-ai` org's Retro App installation, not the `redhat-developer` installation. Filing issues on `fullsend-ai/fullsend` works; posting comments on `rhdh-agentic` PRs does not. App is already installed with repo access — the issue is in how the Mint scopes tokens for cross-org repos. Needs upstream fix or investigation.
- [ ] **Sync overrides on Fullsend releases** — `.fullsend/customized/agents/review.md` and `harness/review.yaml` are full-file overrides that drift from upstream. Diff against the scaffold on each release.
- [ ] Verify branch protection on `main` has "Require review from Code Owners" enabled.
- [ ] Consider adding `.github/instructions/` to CODEOWNERS.
