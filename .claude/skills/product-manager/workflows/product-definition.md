# Workflow: Product Definition — Initiative to PRD

<required_reading>
Read these files before proceeding:

1. `templates/prd.md` — the PRD template to fill
2. Any existing context (proposals, design docs, meeting notes) provided by the human
</required_reading>

## Step 1: Understand the Initiative

1. Read all provided context materials
2. Restate the initiative's goal in concrete terms
3. Identify who the product serves and what problem it solves
4. If ambiguous, ask clarifying questions — STOP

## Step 2: Draft the PRD

1. Read `templates/prd.md`
2. Fill every section:
   - **Mission**: One sentence — what and for whom
   - **Problem**: Specific pain points, not generic statements
   - **Target Users**: Personas with profiles and key needs
   - **Product Direction**: Core idea, design principles, major capability areas
   - **Domain Context**: Domain knowledge that agents and reviewers need
   - **Business Direction**: Strategic value, investment rationale (adapt for internal platforms)
   - **Boundaries**: What this PRD explicitly does NOT define — at least one item
   - **Success Outcomes**: High-level outcomes, not Given-When-Then acceptance criteria
3. Keep the PRD under 300 lines
4. Write to `specifications/prd/<product-name>.md`

## Step 3: Commit

```bash
mkdir -p specifications/prd/
git add specifications/prd/<product-name>.md
git commit -m "Add PRD: <product name>"
```

Do NOT create branches, push, or create PRs unless instructed.

## Step 4: Wait for Human Review

PRDs require human approval before FSDs can be written.

- **Approved**: Transition to Discovery (write FSDs)
- **Revision needed**: Re-enter at Step 1

<success_criteria>

- [ ] PRD file exists at `specifications/prd/<product-name>.md`
- [ ] PRD follows template with all required sections
- [ ] PRD is under 300 lines
- [ ] PRD defines shape, not volume — no implementation details
- [ ] PRD committed to the current branch

</success_criteria>
