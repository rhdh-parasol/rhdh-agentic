# Workflow: Review — Technical Design Review

<required_reading>
Read these files before proceeding:

1. `templates/technical-review.md` — review comment template
</required_reading>

## Step 1: Gather Context

1. Read the issue: `gh issue view <N> --json body,comments,labels`
2. Identify the linked PR from issue comments or body
3. Read the PR: `gh pr view <PR> --json body,files,additions,deletions,commits`
4. Read the PR diff: `gh pr diff <PR>`
5. Find the FSD from the issue body: `specifications/fsd/<domain>/<feature>.md`
6. Read the FSD
7. Identify referenced ADRs from the FSD's Technical Constraints section
8. Read each referenced ADR in `specifications/adr/`

## Step 2: Check ADR Compliance

For each relevant ADR decision (D-1, D-2, ...):

1. Does the implementation follow the decision?
2. If the ADR has known gaps (G-1, G-2), are they handled or properly deferred?
3. Mark each decision as **compliant** or **non-compliant** with evidence

## Step 3: Assess Structural Quality

Check:

- **Module boundaries** — are responsibilities in the right files/modules?
- **Data model** — does the implementation match the FSD schema? Correct types, keys, constraints?
- **API surface** — do interfaces match FSD signatures? Correct parameters and return types?
- **Error handling** — does failure behavior match the spec?
- **Platform constraints** — any violations of documented technical constraints?

## Step 4: Check for Architectural Drift

Look for changes that don't violate a specific ADR but introduce structural problems:

- God modules (one file accumulating unrelated responsibilities)
- Circular dependencies between modules
- Abstraction level mismatches (high-level logic mixed with low-level details)
- Patterns inconsistent with the rest of the codebase

Do NOT comment on:

- Variable naming or code style (that's the linter's job)
- Algorithm choice within a function (developer discretion)
- Test organization (unless it violates an FSD validation section)

## Step 5: Produce Review

1. Read `templates/technical-review.md`
2. Fill the template — verdict is binary: APPROVE or REQUEST CHANGES
3. Post as PR review:

   ```bash
   # For APPROVE:
   gh pr review <PR> --approve --body "<review>"

   # For REQUEST CHANGES:
   gh pr review <PR> --request-changes --body "<review>"
   ```

## Step 6: Update the Issue

Post comment on issue referencing the review.

## Step 7: Wait for Human Confirmation

- **Human confirms APPROVE**: Done
- **Human confirms REQUEST CHANGES**: Developer fixes, Architect re-enters at Step 1
- **Human overrides**: Human adjusts verdict directly

<success_criteria>

- [ ] Every referenced ADR decision appears in compliance check
- [ ] Structural assessment covers all 5 areas (module, data, API, error, platform)
- [ ] Verdict is APPROVE or REQUEST CHANGES
- [ ] Non-compliance items reference specific ADR decision numbers
- [ ] No style comments — only structural concerns
- [ ] Review posted as proper PR review (--approve or --request-changes)
</success_criteria>
