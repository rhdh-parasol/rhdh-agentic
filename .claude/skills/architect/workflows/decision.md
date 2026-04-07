# Workflow: Decision — Architectural Question to ADR

<required_reading>
Read these files before proceeding:

1. `templates/adr.md` — the ADR template to fill
2. The project's PRD document
</required_reading>

## Step 1: Claim the Issue

1. Read the issue: `gh issue view <N> --json body,comments,labels`
2. Post comment: "Architect Decision loop started. Researching constraints and alternatives."

## Step 2: Understand the Question

1. Restate the architectural question in concrete terms
2. If the issue is vague or underspecified, ask for clarification — STOP
3. Identify what this decision will constrain (which future specs/implementations depend on it)

## Step 3: Research Constraints

1. Read the project's PRD for product constraints
2. Read existing ADRs in `specifications/adr/` for prior decisions that constrain this one
3. Read the codebase for current implementation state
4. If the decision involves external technologies, check their documentation or existing patterns in the code

## Step 4: Identify Alternatives

Enumerate **at least 2** viable approaches. For each:

- Describe concretely (not "use a database" but specific technologies, patterns, data structures)
- List pros (what it enables, simplifies, or guarantees)
- List cons (what it costs, constrains, or risks)
- Estimate complexity relative to the other alternatives

Do not pre-filter. Include alternatives you expect to reject — the analysis of *why* they were rejected is valuable.

## Step 5: Evaluate and Decide

1. Select the recommended approach
2. If the decision has multiple facets, use numbered sub-decisions (D-1, D-2, ...)
3. For each sub-decision, state what was decided and the primary rationale

## Step 6: Document Consequences

Be honest. Every decision has downsides.

- **Positive:** what this enables
- **Negative:** what this costs or constrains
- **Known Gaps (G-1, G-2, ...):** open issues that this decision doesn't resolve and when they'll need resolution

## Step 7: Write the ADR

1. Read `templates/adr.md`
2. Fill every section
3. File at `specifications/adr/<slug>.md` (slug matches the issue title in kebab-case)

## Step 8: Commit

```bash
mkdir -p specifications/adr/
git add specifications/adr/<slug>.md
git commit -m "ADR: <decision title>"
```

Do NOT create branches, push, or create PRs unless instructed.

## Step 9: Update the Issue

Post comment with:

- Link to the ADR file
- Summary: the decision, key trade-offs, and any known gaps
- Questions for human review

## Step 10: Wait for Human Review

- **Approved**: ADR becomes binding.
- **Revision needed**: Re-enter at Step 3 or Step 4 depending on feedback.

<success_criteria>

- [ ] ADR file exists at `specifications/adr/<slug>.md`
- [ ] ADR follows template with all required sections
- [ ] At least 2 alternatives documented with pros/cons
- [ ] Consequences has both Positive and Negative subsections
- [ ] Known Gaps identified or explicitly stated as none
- [ ] ADR committed to the current branch
- [ ] Issue comment has ADR link and review summary
</success_criteria>
