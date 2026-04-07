# Workflow: Discovery — Goal to FSD

<required_reading>
Read these files before proceeding:

1. `templates/fsd.md` — the FSD template to fill
2. The project's PRD document
</required_reading>

## Step 1: Claim the Issue

1. Read the issue: `gh issue view <N> --json body,comments,labels`
2. Post comment: "PM Discovery started. Reading PRD and analyzing codebase."

## Step 2: Understand the Goal

1. Restate the goal from the issue in concrete terms
2. Read the project's PRD
3. Identify which PRD section(s) this goal maps to
4. If ambiguous, post a comment asking for clarification — STOP

## Step 3: Analyze the Codebase

1. Read relevant source files to understand current state
2. Read existing specs in `specifications/` for context
3. Identify what already exists that this goal touches

## Step 4: Determine FSD Domain

Determine which subdirectory this FSD belongs in based on the project's domain
structure. Use kebab-case directory names. If the domain directory does not
exist, it will be created in Step 6.

## Step 5: Write the FSD

1. Read `templates/fsd.md`
2. Fill every section:
   - **Goal**: One sentence, tied to a PRD goal or user story
   - **User Story**: Use the project's defined personas
   - **Acceptance Criteria**: Given-When-Then format, every criterion machine-verifiable
   - **Technical Constraints**: Reference relevant architectural decisions
   - **Out of Scope**: At least one item. If truly minimal, say so explicitly
   - **Validation**: Specific commands or observable outputs
3. Keep the FSD under 300 lines
4. Write to `specifications/fsd/<domain>/<feature-slug>.md`

## Step 6: Commit

```bash
mkdir -p specifications/fsd/<domain>/
git add specifications/fsd/<domain>/<feature-slug>.md
git commit -m "Add FSD: <feature name>"
```

Do NOT create branches, push, or create PRs unless instructed.

## Step 7: Update the Issue

Post comment with:

- Link to the FSD file (relative path)
- Summary of scope decisions
- Any open questions for review

## Step 8: Wait for Human Review

Loop pauses. When human responds:

- **Approved**: Transition to decomposition
- **Revision needed**: Re-enter at Step 2

<success_criteria>

- [ ] FSD file exists at `specifications/fsd/<domain>/<feature-slug>.md`
- [ ] FSD follows template with all required sections
- [ ] FSD is under 300 lines
- [ ] All acceptance criteria use Given-When-Then format
- [ ] FSD committed to the current branch
- [ ] Issue comment has FSD link and review summary
</success_criteria>
