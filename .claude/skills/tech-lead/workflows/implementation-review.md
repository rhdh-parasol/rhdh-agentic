# Workflow: Review — Implementation Review Against Epic

<required_reading>
Read these files before proceeding:

1. `templates/implementation-review.md` — review template
</required_reading>

## Step 1: Gather Context

1. Read the PR: `gh pr view <PR> --json body,files,additions,deletions,commits`
2. Identify the linked issue from the PR body
3. Read the issue: `gh issue view <N> --json body,comments,labels`
4. Follow the issue link to the epic file in `specifications/epics/`
5. Read the epic

## Step 2: Read the Diff

1. Read the PR diff: `gh pr diff <PR>`
2. Understand what was changed and what was added

## Step 3: Check Acceptance Criteria

For each acceptance criterion in the epic:

1. Determine if the criterion is **MET** or **NOT MET**
2. For MET: cite evidence (file, function, test)
3. For NOT MET: explain the specific gap

## Step 4: Check Scope Alignment

1. Does the PR implement what the epic asked for?
2. Is there **scope creep** — work done that the epic did not ask for?
3. Is there **scope gap** — epic deliverables not addressed by the PR?

Do NOT comment on:

- Code style or naming (that's the linter's job)
- Algorithm choice within implementation (developer discretion)
- Architecture compliance (that's the Architect's review)
- Product requirements (that's the PM's acceptance review)

## Step 5: Check Completeness

1. Count epic deliverables addressed vs. total
2. If incomplete, list what remains
3. Determine if partial delivery is acceptable (does it leave the codebase in a working state?)

## Step 6: Produce Review

1. Read `templates/implementation-review.md`
2. Fill the template — verdict is binary: APPROVE or REQUEST CHANGES
3. Post as PR review:

   ```bash
   # For APPROVE:
   gh pr review <PR> --approve --body "<review>"

   # For REQUEST CHANGES:
   gh pr review <PR> --request-changes --body "<review>"
   ```

## Step 7: Wait for Human Confirmation

- **Human confirms APPROVE**: Mark the epic status as Done
- **Human confirms REQUEST CHANGES**: Developer fixes, Tech Lead re-enters at Step 1
- **Human overrides**: Human adjusts verdict directly

<success_criteria>

- [ ] Every epic acceptance criterion appears in the review
- [ ] Each criterion marked as MET (with evidence) or NOT MET (with reason)
- [ ] Scope check present — aligned or drift detected
- [ ] Completeness check present — X of Y deliverables addressed
- [ ] Verdict is APPROVE or REQUEST CHANGES
- [ ] REQUEST CHANGES has actionable items referencing specific epic criteria
- [ ] Review posted as proper PR review (--approve or --request-changes)
- [ ] No style, architecture, or product-level comments — only epic compliance
</success_criteria>
