# Workflow: Acceptance — PR to Product Verdict

<required_reading>
Read these files before proceeding:

1. `templates/review-verdict.md` — verdict comment template
2. The project's PRD document
</required_reading>

## Step 1: Gather Context

1. Read the PR: `gh pr view <PR> --json body,files,additions,deletions,commits`
2. Read the PR diff: `gh pr diff <PR>`
3. Read the PRD from `specifications/prd/`
4. Identify which PRD goals, user stories, or success outcomes this PR addresses

## Step 2: Check Against PRD Goals

For each relevant PRD goal or user story:

1. Determine if the PR advances it (evidence from diff)
2. Mark as **MET** or **NOT MET**
3. Note specific evidence (file, function, behavior)

## Step 3: Check for Product Scope Drift

1. Compare PR changes against the PRD's product direction
2. Identify changes that don't serve any PRD goal:
   - Features nobody asked for
   - Capabilities outside the product boundaries
3. Flag scope drift — it is a risk, not necessarily a rejection reason

## Step 4: Check User-Facing Quality

1. Does the PR deliver something the target user (from the PRD) can benefit from?
2. Are error messages and user-visible behavior reasonable?
3. Check CI: `gh pr checks <PR>`

## Step 5: Produce Verdict

1. Read `templates/review-verdict.md`
2. Fill the template — verdict is binary: ACCEPT or REJECT (no partial)
3. Present the verdict to the human for confirmation before posting

## Step 6: Post Review (after human confirmation)

Post as PR review:

```bash
# For ACCEPT:
gh pr review <PR> --approve --body "<verdict>"

# For REJECT:
gh pr review <PR> --request-changes --body "<verdict>"
```

## Step 7: Wait for Human Confirmation

- **Human confirms ACCEPT**: Done
- **Human confirms REJECT**: Developer fixes, PM re-enters at Step 1
- **Human overrides**: Human adjusts verdict directly

<success_criteria>

- [ ] Every relevant PRD goal appears in verdict
- [ ] Verdict is exactly ACCEPT or REJECT
- [ ] Scope drift section present (even if "none detected")
- [ ] REJECT has actionable feedback; ACCEPT has "None — all product goals met."
- [ ] Human confirmed verdict before posting to GitHub
- [ ] Review posted as proper PR review (--approve or --request-changes)
</success_criteria>
