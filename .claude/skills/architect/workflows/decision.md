# Workflow: Decision — Architectural Question to ADR

<required_reading>
Read these files before proceeding:

1. `templates/adr.md` — the ADR template to fill
2. The project's PRD document
</required_reading>

## Step 1: Understand the Question

1. Read the architectural question — provided as conversation input, a PRD reference, or a file path
2. Restate the question in concrete terms
3. If the question is vague or underspecified, ask for clarification — STOP
4. Identify what this decision will constrain (which future specs/implementations depend on it)

## Step 2: Research Constraints

1. Read the project's PRD for product constraints
2. Read existing ADRs in `specifications/adr/` for prior decisions that constrain this one
3. Read the codebase for current implementation state
4. If the decision involves external technologies, check their documentation or existing patterns in the code

## Step 3: Identify Alternatives

Enumerate **at least 2** viable approaches. For each:

- Describe concretely (not "use a database" but specific technologies, patterns, data structures)
- List pros (what it enables, simplifies, or guarantees)
- List cons (what it costs, constrains, or risks)
- Estimate complexity relative to the other alternatives

Do not pre-filter. Include alternatives you expect to reject — the analysis of *why* they were rejected is valuable.

## Step 4: Evaluate and Decide

1. Select the recommended approach
2. If the decision has multiple facets, use numbered sub-decisions (D-1, D-2, ...)
3. For each sub-decision, state what was decided and the primary rationale

## Step 5: Document Consequences

Be honest. Every decision has downsides.

- **Positive:** what this enables
- **Negative:** what this costs or constrains
- **Known Gaps (G-1, G-2, ...):** open issues that this decision doesn't resolve and when they'll need resolution

## Step 6: Write the ADR

1. Read `templates/adr.md`
2. Fill every section
3. File at `specifications/adr/<slug>.md` (slug matches the decision title in kebab-case)

## Step 7: Commit

```bash
mkdir -p specifications/adr/
git add specifications/adr/<slug>.md
git commit -m "ADR: <decision title>"
```

Do NOT create branches, push, or create PRs unless instructed.

## Step 8: Present for Review

Present to the human:

- Path to the ADR file
- Summary: the decision, key trade-offs, and any known gaps
- Questions for human review

## Step 9: Wait for Human Review

- **Approved**: ADR becomes binding.
- **Revision needed**: Re-enter at Step 2 or Step 3 depending on feedback.

<success_criteria>

- [ ] ADR file exists at `specifications/adr/<slug>.md`
- [ ] ADR follows template with all required sections
- [ ] At least 2 alternatives documented with pros/cons
- [ ] Consequences has both Positive and Negative subsections
- [ ] Known Gaps identified or explicitly stated as none
- [ ] ADR committed to the current branch
</success_criteria>
