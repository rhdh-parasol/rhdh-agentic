# Workflow: Decomposition — FSD to Sub-Issues

<required_reading>
Read these files before proceeding:

1. `templates/work-item-issue.md` — sub-issue body template
</required_reading>

## Step 1: Read the FSD

1. Read the issue: `gh issue view <N> --json body,comments,labels`
2. Read the linked FSD file from the issue body or from `specifications/fsd/`
3. Read open issues to avoid duplicates: `gh issue list --state open --json number,title,labels`

## Step 2: Identify Components

From the FSD acceptance criteria, identify discrete units of work:

- **Architectural decisions** — decisions not yet made
- **Implementation work** — code to write
- **Sub-spec work** — complex features needing their own FSD

## Step 3: Define Work Items

Each work item must be:

- **Atomic** — completable in a single session
- **Independent** — minimal dependencies (or dependencies explicit)
- **Verifiable** — has acceptance criteria checkable by tests or review
- **Right-sized** — not a blob of work, not trivially small

## Step 4: Order by Dependency

1. Build dependency graph: which items must complete first?
2. Identify parallelizable items (no mutual dependencies)
3. Architectural decisions before implementation that depends on them

## Step 5: Create Sub-Issues

For each work item:

1. Read `templates/work-item-issue.md` for body format
2. Create the issue:

   ```bash
   gh issue create \
     --title "<concise title>" \
     --body "<filled template>"
   ```

## Step 6: Update Parent Issue

Post summary comment:

```
## Decomposition Complete

Sub-issues created:
- #A: <title> — depends on: none
- #B: <title> — depends on: #A
- #C: <title> — parallelizable with #B

Parallelization: #B and #C can run concurrently after #A completes.
```

## Step 7: Wait for Human Review

- **Approved**: Decomposition complete
- **Revision needed**: Re-enter at Step 2

<success_criteria>

- [ ] All FSD acceptance criteria covered by at least one sub-issue
- [ ] Each sub-issue has required sections (Context, Task, Acceptance Criteria, Dependencies)
- [ ] No circular dependencies
- [ ] No duplicate issues created
- [ ] Parent issue has summary comment listing all sub-issues
</success_criteria>
