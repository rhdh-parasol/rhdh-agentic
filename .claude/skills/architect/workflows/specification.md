# Workflow: Specification — ADR to Tier-2 FSD

<required_reading>
Read these files before proceeding:

1. `templates/fsd.md` — the FSD template to fill
2. The project's PRD document
</required_reading>

## Step 1: Check Dependencies

1. Identify the feature — provided as conversation input, a PRD reference, or a file path
2. Identify which ADRs this spec depends on (from PRD context or obvious from topic)
3. Verify those ADRs exist in `specifications/adr/` and are approved
4. If a required ADR is missing or unapproved, flag which ADR(s) are needed — STOP

## Step 2: Read ADR Decisions

For each dependency ADR:

1. Read the ADR file in `specifications/adr/`
2. Extract the decisions (D-1, D-2, ...) that constrain this spec
3. Note any known gaps (G-1, G-2, ...) that this spec must work around

## Step 3: Analyze the Codebase

1. Read relevant source files and modules
2. Identify existing data models, APIs, patterns
3. Understand what already exists that this spec extends or modifies

## Step 4: Design the Solution

Define what must be true, not how to implement it:

- **What exists:** Entity inventories, categories, counts, and their purpose
- **What connects:** Relationship requirements — what must be traversable, not the syntax
- **What constrains:** Rules, approved choices, governance boundaries
- **What fails:** Error conditions and invalid states

Use tables and prose to specify requirements. Avoid code blocks, file tree layouts,
and validation scripts — those are implementation decisions for epics. The spec should
leave the developer with meaningful decisions about structure and organization.

## Step 5: Write Acceptance Criteria

Given-When-Then format. Every criterion must be testable.

Focus on:

- Happy path behavior
- Edge cases from the data model (empty collections, duplicate keys, missing references)
- Invariant preservation under concurrent operations
- Error handling for invalid inputs

## Step 6: Write the FSD

1. Read `templates/fsd.md`
2. Fill every section. The FSD should specify what, not how:
   - **What Exists** section — inventories, categories, counts, relationships
   - **Requirements** section — constraints, rules, contracts
   - **Invariants** section — rules that must always hold
   - **Technical Constraints** referencing specific ADR decisions by number
   - Avoid code blocks, file trees, and scripts — those are implementation
3. Determine the domain from the feature context, using kebab-case directory names
4. File at `specifications/fsd/<domain>/<feature-slug>.md`
5. Keep under 300 lines

## Step 7: Commit

```bash
mkdir -p specifications/fsd/<domain>/
git add specifications/fsd/<domain>/<feature-slug>.md
git commit -m "FSD: <feature name>"
```

Do NOT create branches, push, or create PRs unless instructed.

## Step 8: Present for Review

Present to the human:

- Path to the FSD file
- Summary of scope decisions
- Open questions for review

## Step 9: Wait for Human Review

- **Approved**: FSD ready for epic planning or direct implementation.
- **Revision needed**: Re-enter at Step 4.

<success_criteria>

- [ ] Required ADRs exist and are approved before FSD is written
- [ ] FSD file exists at `specifications/fsd/<domain>/<feature-slug>.md`
- [ ] Data model section has concrete type definitions
- [ ] APIs section has function signatures
- [ ] All acceptance criteria use Given-When-Then format
- [ ] Technical Constraints reference ADR decision numbers
- [ ] FSD is under 300 lines
- [ ] FSD committed to the current branch
</success_criteria>
