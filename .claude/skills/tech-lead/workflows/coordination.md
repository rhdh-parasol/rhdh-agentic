# Workflow: Coordination — Approved Epics to GitHub Issues

<required_reading>
Read these files before proceeding:

1. `templates/epic-issue.md` — GitHub Issue body template
</required_reading>

> **Note:** This workflow is optional. For small teams (1-2 people), epics alone
> may be sufficient without GitHub Issues for coordination. Use this workflow
> when the team benefits from issue-based status tracking.

## Step 1: Read the Planning Summary

1. Read `specifications/epics/<prd-slug>/README.md`
2. Identify which epics have status "Approved" (only create issues for approved epics)
3. Note the dependency order

## Step 2: Read Each Approved Epic

For each approved epic in dependency order:

1. Read the epic file from `specifications/epics/<prd-slug>/<epic-slug>.md`
2. Extract: title, one-sentence summary, acceptance criteria, dependencies

## Step 3: Check for Duplicates

1. List existing open issues: `gh issue list --state open --json number,title,labels`
2. Verify no issue already exists for each epic
3. Skip any epic that already has a coordination issue

## Step 4: Create GitHub Issues

For each approved epic without an existing issue:

1. Read `templates/epic-issue.md` for body format
2. Create the issue:

   ```bash
   gh issue create \
     --title "Epic: <epic title>" \
     --body "<filled template>"
   ```

3. The issue body links to the epic file — do NOT duplicate the full epic content

## Step 5: Post Coordination Summary

If a parent issue exists, post a summary comment:

```
## Coordination Complete

Issues created for approved epics:
- #A: <title> — depends on: none
- #B: <title> — depends on: #A
- #C: <title> — parallelizable with #B

Recommended order: #A first, then #B and #C in parallel.
```

## Step 6: Wait for Human Review

- **Approved**: Issues are ready for developer agents to pick up
- **Revision needed**: Adjust issue content or dependencies

<success_criteria>

- [ ] Every approved epic has a corresponding GitHub Issue
- [ ] Issue bodies link to the epic markdown file (not duplicate content)
- [ ] No duplicate issues created
- [ ] Issue titles prefixed with "Epic:" for easy identification
- [ ] Dependency order documented in coordination summary
</success_criteria>
