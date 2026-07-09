# OpenSpec Review Skill

Additional review dimension for PRs that touch OpenSpec change artifacts. This skill is invoked by the review agent alongside `code-review` and `docs-review`.

## When to use this skill

Use this skill when the PR modifies files under `openspec/changes/`. If no OpenSpec files are changed, skip this skill entirely — it does not apply.

## Evaluation procedure

### 1. Identify changed OpenSpec artifacts

From the PR file list (already fetched by `pr-review`), filter for files under `openspec/changes/`. Group by change name (the directory under `openspec/changes/<name>/`).

### 2. Check artifact completeness

Changes progress through a defined sequence. Each artifact builds on the previous one:

| Artifact | Purpose | Required before |
|----------|---------|-----------------|
| `proposal.md` | Problem, solution, alternatives | Everything else |
| `specs/<cap>/spec.md` | What to build (acceptance criteria) | `design.md` |
| `design.md` | How to build it (architecture, trade-offs) | `tasks.md` |
| `tasks.md` | Implementable work units | Implementation PRs |

**Check predecessor artifacts in three locations** (PRs may be stacked):

1. **In the PR diff** — what this PR adds
2. **On the base branch** — what the PR builds on. Fetch via:

   ```bash
   gh api "repos/${REPO_FULL_NAME}/contents/openspec/changes/<name>?ref=<base_branch>" \
     | jq -r '.[].name'
   ```

3. **On `main`** — what is already merged (only if base branch is not `main`)

**Severity based on location:**

- Predecessor in this PR or on `main` → no finding
- Predecessor on the base branch only (stacked PR) → **info**: note the dependency, the base PR must merge first
- Predecessor nowhere → **high**: artifact sequence broken, earlier artifacts must be added first

### 3. Evaluate artifact quality

For each artifact in the PR, check against these criteria:

**Proposals:**

- States the problem clearly (who is affected, what breaks)
- Proposes a solution with enough detail to evaluate
- Lists alternatives considered and why they were rejected
- Is concise — a page, not a document

**Specs:**

- Defines a single capability with clear boundaries
- Has measurable acceptance criteria
- Specifies inputs, outputs, and error cases
- References relevant existing code or architecture decisions
- Does NOT include implementation details (no code blocks, no file trees)

**Designs:**

- Makes explicit architectural decisions (with rationale)
- Identifies trade-offs and why one path was chosen
- References ADRs where relevant
- Is grounded in the codebase (references actual files and patterns)

### 4. Cross-reference

- Check `openspec/changes/` and `openspec/changes/archive/` for naming conflicts
- Check if specs cover capabilities already addressed by another change
- Compare artifact quality with existing examples (e.g., `openspec/changes/backstage-agent-cli/` or archived changes)

### 5. Check consistency with repo conventions

Read `docs/agentic-development.md` for the project's OpenSpec conventions. Flag deviations.

## Output

Report findings using the same format as `code-review`. Include findings in the `openspec-review` category:

- **high** `[openspec-sequence]` — Missing predecessor artifacts
- **medium** `[openspec-quality]` — Spec quality issues (vague acceptance criteria, unbounded scope)
- **low** `[openspec-style]` — Formatting or convention deviations
- **info** `[openspec-dependency]` — Stacked PR notes, cross-references to related changes

## Common findings

- Specs added without a proposal — the "why" is missing
- Design decisions buried in specs instead of `design.md`
- Open-ended scope ("support all X") without boundaries
- Acceptance criteria that can't be objectively verified
- `make` vs `just` or other tooling divergences between design and specs
