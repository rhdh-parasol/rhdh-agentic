# Workflow: Acceptance — PR to Verdict

<required_reading>
Read these files before proceeding:

1. `templates/review-verdict.md` — verdict comment template
</required_reading>

## Step 1: Gather Context

1. Read the issue: `gh issue view <N> --json body,comments,labels`
2. Identify the linked PR from issue comments or body
3. Read the PR: `gh pr view <PR> --json body,files,additions,deletions,commits`
4. Read the PR diff: `gh pr diff <PR>`
5. Find the FSD from the issue body: `specifications/fsd/<domain>/<feature>.md`
6. Read the FSD — this is the acceptance checklist

## Step 2: Check Each Acceptance Criterion

For each criterion in the FSD's Acceptance Criteria section:

1. Determine if the PR addresses it (evidence from diff)
2. Mark as **MET** or **NOT MET**
3. Note specific evidence (file, function, test)

## Step 3: Check for Scope Drift

1. Compare PR changed files against FSD scope
2. Identify changes NOT covered by the FSD:
   - Unasked-for refactors
   - Changes to files outside scope
   - New features not in the spec
3. Flag scope drift — it is a risk, not necessarily a rejection reason

## Step 4: Check Test Coverage

1. Review test files in the PR diff
2. For each edge case in the FSD, verify a corresponding test exists
3. Check CI: `gh pr checks <PR>`

## Step 5: Produce Verdict

1. Read `templates/review-verdict.md`
2. Fill the template — verdict is binary: ACCEPT or REJECT (no partial)
3. Post as PR review:

   ```bash
   # For ACCEPT:
   gh pr review <PR> --approve --body "<verdict>"

   # For REJECT:
   gh pr review <PR> --request-changes --body "<verdict>"
   ```

## Step 6: Update the Issue

Post comment on issue referencing the review.

## Step 7: Wait for Human Confirmation

- **Human confirms ACCEPT**: Done
- **Human confirms REJECT**: Developer fixes, PM re-enters at Step 1
- **Human overrides**: Human adjusts verdict directly

<success_criteria>

- [ ] Every FSD acceptance criterion appears in verdict
- [ ] Verdict is exactly ACCEPT or REJECT
- [ ] Scope drift section present (even if "none detected")
- [ ] REJECT has actionable feedback; ACCEPT has "None — all criteria met."
- [ ] Review posted as proper PR review (--approve or --request-changes)
</success_criteria>
